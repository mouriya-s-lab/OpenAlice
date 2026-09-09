# Schema-first UTA composition specimen

## Status and boundary

`domain-contracts.ts` and `composition-example.ts` are executable design/conformance
specimens. They are not a production UTA migration, broker SDK, journal, trigger
runtime, or trading-safety claim. The example performs no network request, uses no
credential, and never writes to a broker. `domain-contracts.type-cases.ts` is a
compile-only consumer: its declarations and intentional type errors are not runtime
evidence.

The specimen uses the repository's installed Zod `4.3.6` package. Zod schemas are
the declaration source. `z.input<typeof schema>` and `z.output<typeof schema>` are
the static types; the same schema is parsed at every untrusted boundary and is
exported to JSON Schema for metadata. The design deliberately does not introduce
Effect, SQL, a closed broker interface, or a second command registry.

## Semantic units and HOF composition

The exported units are small and composable:

- `instrumentSchema` contains only provider-native identity (`nativeId` and
  `symbol`). It has no global asset-class enum and no invented account.
  `instrumentFactsSchema` is a separate optional fact product with an explicit
  `resolved`/`unavailable` result; an unknown multiplier or currency is never
  replaced with a default.
- `candleBaseSchema` carries instrument identity, provider-declared interval,
  finite OHLC observations, an explicit temporal projection, a revision, and
  evidence. `volume` is a discriminated product:
  `present { amount, measure { basis, unit, evidence } }`, `unavailable`, or
  `unknown`; a numeric zero is used only when the fixture has measured zero,
  never as an unavailable fallback. `finality` and temporal projection also
  have explicit unknown forms, so a missing closure or boundary proof is not
  fabricated. `withCandleExtension(extension)` adds the exact provider
  extension object, so a `Candle<Extension>` is not `Record<string, unknown>`.
- `newsSchema` retains source, publication/fetch times, correction/retraction
  status, and correction identity. `newsGroupSchema(articleSchema)` derives a
  typed member array plus an explicit selection rule; membership is not claimed to
  be a complete or synchronized snapshot.
- `orderBaseSchema` requires an explicit account scope (`accountId` plus
  `subAccountId`), because order facts are account-scoped. Public market
  queries use the explicit `publicScopeSchema` value
  `{tag: "public"}` instead of inventing an account. `withLimitOrderKind`,
  `withQuantity`, `withLimitPrice`, and `withProviderExtension` compose one
  exact order without a market/limit/venue Cartesian type family. The example's
  actual input therefore has `kind: "limit"`, positive decimal-string
  `quantity`, positive decimal-string `limitPrice`, and the fixture's
  `providerOrderType`/`postOnly` fields.

`addFields(base, extension)` checks all extension keys against the base at
runtime and throws a named collision error before a dynamically loaded declaration
can overwrite an existing field. The inferred Zod object output remains the merge
of the two shapes. The `withLimitPrice` schema also rejects a parsed object whose
`kind` is not `limit`; this check is a semantic refinement and is not silently
pretended to be present in JSON Schema. The exported
`limitPriceSemanticConstraint` (`order.limit-price-requires-limit-kind`, version
1) records that rule in capability metadata and fingerprints.

There is no global rule that every provider must support one order style or that a
non-market order must use a particular sizing mode. A provider declares the exact
schema and semantic constraints it supports. Provider-specific native fields stay
in its extension object.

## Fixed descriptor and schema-bound capability builders

`definePull` and `definePush` accept one declaration containing:

```ts
{
  capabilityId, path, description, schemaVersion,
  inputSchema, outputSchema, errorSchema,
  effect, semanticConstraints, requirements,
  source, availability, handler
}
```

The returned public value contains the exact input/output/error schemas, delivery
kind, control schema, descriptor, and no public handler or raw dispatch function.
The implementation is held behind a private class field. A `PullHandler<I, O, E>`
receives the parsed `z.output<I>` and `AbortSignal`, then returns
`{tag: "output", value: O}` or `{tag: "error", error: E}`. A `PushHandler` returns
`AsyncIterable<PushFrame<O, E>>`.

The fixed descriptor is `capabilityDescriptorSchema` and has protocol version,
stable identity/path, schema version, SHA-256 schema fingerprint, JSON Schemas for
input/output/error/control, delivery, effect, semantic constraints, resource
requirements, source language/identity/version, and availability. The public
`CapabilityDescriptor<R>` type is derived from that Zod schema; only the
requirements tuple is narrowed by the capability generic. Consequently a
resource-bearing capability cannot be assigned to a wrapper with `readonly []`,
and a wrapper with one error schema cannot be assigned to another error schema.

JSON Schema generation uses `z.toJSONSchema` with `target: "draft-2020-12"`,
`io: "input"` for inputs, `io: "output"` for outputs, and
`unrepresentable: "throw"`. Zod's non-enumerable `~standard` runtime marker is
removed by JSON serialization and the result is immediately parsed as `JsonValue`.
Transforms or other schemas that Zod cannot export fail declaration construction;
semantic refinements must be named in `semanticConstraints` rather than hidden in
help text. The fingerprint covers all four wire schemas, schema version, delivery,
effect, semantic constraints, requirements, source, identity, and path—not merely
the description.

At invocation, input is parsed before the hidden handler runs. Output and declared
errors are parsed after the handler. Boundary failures are a separate typed
`BoundaryError` (`invalid-input`, `invalid-output`, `invalid-error`,
`protocol-violation`, `handler-failure`, `unavailable`, `aborted`,
`wrong-delivery`, or `unknown-capability`). A parsed provider error remains a
`domain-error`; it is not turned into a successful empty result.

## Pull, push, and cancellation

A pull capability returns one finite `InvocationResponse`: output, declared domain
error, or boundary error. Its output schema can be a page with a cursor or any
other finite result; no transaction protocol is attached.

A push capability yields typed data, declared error, and lifecycle/control frames.
The wrapper validates each data frame against `outputSchema`, each error against
`errorSchema`, and each control against `pushControlSchema`. It adds
`completed/source-exhausted` when the source ends and emits
`cancelled/abort-signal` when the supplied `AbortSignal` is aborted. Returning from
the consumer's `for await` closes the source iterator; providers must honor the
signal and release resources. The stream is not stdout internally; NDJSON is only
the outer CLI projection.

Control frames distinguish `started`, `cancelled` (abort, consumer close, or
provider stop), and `completed` (source exhaustion or provider close). A domain
error frame is distinct from a lifecycle frame. Receiving a frame never implies
that a Candle is closed; `finality` and `temporalProjection` remain explicit
data variants.

## Discovery, trees, and CLI projection

`createCapabilityTree(declarations)` builds a tree solely from declaration paths.
It rejects duplicate leaf paths and leaf/namespace collisions. Namespace nodes
are created only when they have children, so empty parents are recursively pruned.
`discover(tree)` returns a deterministic revision, discovery fingerprint, and the
sorted fixed descriptors. An unavailable declaration retains its identity and
contract in discovery but invocation returns `BoundaryError/unavailable`; it is
not shown as executable.

`createCapabilityCli(tree)` is the outer interpreter. Its `help`, `describe`,
`pull`, and `push` methods traverse that tree; there is no hand-written provider
or action command map. Help displays delivery, availability, schema version,
fingerprint prefix, description, and the generated `uta <provider> ...` path.
`describe` is machine-readable discovery. Pull emits one JSON result. Push emits
one NDJSON frame per line; diagnostics stay on stderr. `cancel` in the example is
an outer observer cancellation, not an order-cancel capability.

The example's foreign tree has no `options` or `order/cancel` leaf. A provider
lacking those features does not receive an Unsupported stub or an empty
namespace. Adding the fixture News leaf changes `describe`/`help` and its
descriptor fingerprint without editing a core switch or command table.

## Controlled order wrapper

`withTransaction(capability, admissionPort)` is a deliberately small effect
wrapper for a pull capability whose output is an intent. `ControlledCapability`
extends the ordinary pull contract, so the composed capability can be
registered in the same tree and projected by the same generated CLI. Its
`submit` convenience delegates the same validated planner-plus-admission path.
The raw planner remains a non-executing capability and is not registered in the
fixture tree. The public surface has no `handler`, `dispatch`, or broker writer
property. The injected `AdmissionPort` returns either the same validated intent
as `accepted` or a declared error as `rejected`.

The example's admission port is an explicit in-memory conformance seam. It does
not journal, reserve funds, send an order, or represent production acceptance.
The generated order pull command demonstrates an admitted **intent** only. A
real deployment would inject a durable writer/admission implementation and
separately prove prepare/approval, idempotency, unknown-outcome reconciliation,
and native safety. Those guarantees are intentionally not claimed here.

## Foreign process boundary

`composition-fixture-worker.py` is a tiny Python standard-library worker. It reads
one local JSON request from stdin and emits deterministic NDJSON Candle envelopes;
it has no credentials, network, or vendor SDK. The TypeScript bridge:

1. spawns the worker with piped stdin/stdout;
2. parses each line as `unknown`;
3. validates the envelope and then validates the `RichCandle` value with the same
   local Zod schema;
4. maps malformed remote values to the declared
   `foreignFeedErrorSchema/remote-output-invalid` error;
5. terminates and awaits the worker when the `AbortSignal` is cancelled or the
   iterator is closed.

The worker's `invalid-output` mode is intentionally malformed and proves that a
foreign process cannot smuggle unchecked JSON across the boundary. Valid worker
output is fixture evidence only, not evidence of any vendor protocol.
This bridge is a local conformance seam, not a provider-contract v1 wire
implementation or a live vendor adapter.

## Compile cases and reproducible commands

The compile-only negative consumer covers:

- omitted composed limit price or account scope;
- wrong provider extension literal;
- missing Candle extension fields;
- wrong capability input/output/error schema assignment;
- wrong output/error values;
- push assigned as pull and invalid control lifecycle value;
- resource and error generic erasure through the controlled wrapper;
- public raw dispatch.

Run the executable specimen with the repository's installed Node/tsx toolchain:

```bash
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts help fixture
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts describe fixture
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts pull fixture fixture/market/candles '{"scope":{"tag":"public"},"instrument":"BTC/USD","interval":"5m","limit":2,"cursor":null}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts push fixture fixture/market/candle-stream '{"scope":{"tag":"public"},"instrument":"BTC/USD","interval":"5m","count":2,"delayMs":1}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts push fixture fixture/market/candle-stream '{"scope":{"tag":"public"},"instrument":"BTC/USD","interval":"5m","count":null,"delayMs":20}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts cancel fixture fixture/market/candle-stream '{"scope":{"tag":"public"},"instrument":"BTC/USD","interval":"5m","count":8,"delayMs":20}' 25
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts pull fixture fixture/order/limit-intent '{"scope":{"accountId":"fixture-account","subAccountId":"main"},"instrument":{"nativeId":"fixture-btc","symbol":"BTC/USD"},"kind":"limit","side":"buy","timeInForce":"gtc","quantity":"2.5","limitPrice":"100.25","providerOrderType":"fixture-limit","postOnly":true}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts pull fixture fixture/order/limit-intent '{"scope":{"accountId":"fixture-account","subAccountId":"main"},"instrument":{"nativeId":"fixture-btc","symbol":"BTC/USD"},"kind":"limit","side":"buy","timeInForce":"gtc","quantity":"2.5","providerOrderType":"fixture-limit","postOnly":true}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts invalid-output
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts foreign-invalid-output
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts push foreign foreign/market/candle-feed '{"scope":{"tag":"public"},"instrument":"BTC/USD","count":2,"mode":"valid"}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts push foreign foreign/market/candle-feed '{"scope":{"tag":"public"},"instrument":"BTC/USD","count":null,"mode":"valid"}'
```

The pull command emits one `output` object, while push emits `started`, data
frames, and `completed`; `cancel` emits `cancelled/abort-signal`.
For either push capability, a positive `count` is a bounded finite stream and
`count: null` is the explicit continuous-stream variant that runs until its
`AbortSignal` is cancelled. The CLI attaches SIGINT and stdout close/EPIPE to
that signal and removes those listeners after completion; the foreign bridge
also awaits worker termination.
The invalid-input probes (`limit: 0`, empty instrument, or the generated order
pull omitting `limitPrice`) return `boundary-error/invalid-input` before a
handler. `invalid-output` returns `boundary-error/invalid-output`.
`foreign-invalid-output` returns a declared `remote-output-invalid` error. None
of these commands prove persistence, broker behavior, trigger durability, or
production trading safety.
