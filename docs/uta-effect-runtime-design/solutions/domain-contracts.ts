/**
 * UTA schema-first composition/conformance specimen.
 *
 * This is design code, not a production broker runtime. A capability owns one
 * Zod declaration and one hidden implementation. Static types, wire metadata,
 * discovery, and the outer CLI are projections of that declaration. There is
 * deliberately no global broker/action registry here.
 */

import { createHash } from "node:crypto";
import { z } from "zod";

const schemaVersionSchema = z.number().int().positive();

/* -------------------------------------------------------------------------- */
/* JSON and small semantic units                                               */
/* -------------------------------------------------------------------------- */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

/** Decimal is kept as a string at the order boundary; no floating-point coercion. */
export const positiveDecimalSchema = z
  .string()
  .regex(/^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/, {
    message: "expected a strictly positive decimal string",
  });

export const nonNegativeDecimalSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*(?:\.\d+)?|0\.\d+)$/, {
    message: "expected a non-negative decimal string",
  });

export const instrumentSchema = z.strictObject({
  nativeId: z.string().trim().min(1),
  symbol: z.string().trim().min(1),
});

/** Resolved facts are a separate provider-declared product, not an identity default. */
export const instrumentFactsSchema = z.discriminatedUnion("tag", [
  z.strictObject({
    tag: z.literal("resolved"),
    quoteCurrency: z.string().trim().min(1),
    contractMultiplier: positiveDecimalSchema,
  }),
  z.strictObject({
    tag: z.literal("unavailable"),
    reason: z.string().trim().min(1),
  }),
]);

export const candleObservationSourceSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("known"), identity: z.string().trim().min(1) }),
  z.strictObject({ tag: z.literal("unknown") }),
]);
export type CandleObservationSource = z.output<typeof candleObservationSourceSchema>;

export const candleEvidenceSchema = z.discriminatedUnion("tag", [
  z.strictObject({
    tag: z.literal("provider"),
    providerId: z.string().trim().min(1),
    providerInstance: z.string().trim().min(1),
    observedAt: z.number().int().nonnegative(),
    sourceSequence: z.string().trim().min(1).nullable(),
  }),
  z.strictObject({
    tag: z.literal("local-observation"),
    operation: z.string().trim().min(1),
    version: z.string().trim().min(1),
    sourceEvidence: candleObservationSourceSchema,
  }),
  z.strictObject({ tag: z.literal("unavailable"), reason: z.string().trim().min(1) }),
]);
export type CandleEvidence = z.output<typeof candleEvidenceSchema>;

export const candleVolumeSchema = z.discriminatedUnion("tag", [
  z.strictObject({
    tag: z.literal("present"),
    amount: nonNegativeDecimalSchema,
    measure: z.strictObject({
      basis: z.string().trim().min(1),
      unit: z.string().trim().min(1),
      evidence: candleEvidenceSchema,
    }),
  }),
  z.strictObject({ tag: z.literal("unavailable"), reason: z.string().trim().min(1) }),
  z.strictObject({ tag: z.literal("unknown"), reason: z.string().trim().min(1) }),
]);
export type CandleVolume = z.output<typeof candleVolumeSchema>;

export const candleTemporalProjectionSchema = z.discriminatedUnion("tag", [
  z.strictObject({
    tag: z.literal("exact"),
    startAt: z.number().int().nonnegative(),
    endAt: z.number().int().nonnegative(),
    alignment: z.string().trim().min(1),
  }),
  z.strictObject({ tag: z.literal("unknown"), reason: z.string().trim().min(1) }),
  z.strictObject({
    tag: z.literal("unsupported"),
    nativeSpec: z.string().trim().min(1),
    reason: z.string().trim().min(1),
  }),
]);
export type CandleTemporalProjection = z.output<typeof candleTemporalProjectionSchema>;

export const candleFinalitySchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("open") }),
  z.strictObject({
    tag: z.literal("closed"),
    closedAt: z.number().int().nonnegative(),
    proof: z.strictObject({
      identity: z.string().trim().min(1),
      observedAt: z.number().int().nonnegative(),
    }),
  }),
  z.strictObject({ tag: z.literal("unknown"), reason: z.string().trim().min(1) }),
]);
export type CandleFinality = z.output<typeof candleFinalitySchema>;

export const candleRevisionSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("original") }),
  z.strictObject({ tag: z.literal("correction"), supersedes: z.string().trim().min(1) }),
  z.strictObject({ tag: z.literal("retraction"), supersedes: z.string().trim().min(1) }),
]);
export type CandleRevision = z.output<typeof candleRevisionSchema>;

export const candleBaseSchema = z.strictObject({
  instrument: instrumentSchema,
  interval: z.string().trim().min(1),
  openedAt: z.number().int().nonnegative(),
  temporalProjection: candleTemporalProjectionSchema,
  open: z.number().finite(),
  high: z.number().finite(),
  low: z.number().finite(),
  close: z.number().finite(),
  volume: candleVolumeSchema,
  finality: candleFinalitySchema,
  revision: candleRevisionSchema,
  evidence: candleEvidenceSchema,
});

/** Candle is base facts plus one exact provider extension, never a string map. */
export function withCandleExtension<Extension extends z.ZodRawShape>(
  extension: z.ZodObject<Extension>,
) {
  return addFields(candleBaseSchema, extension);
}

export const newsSchema = z.strictObject({
  id: z.string().trim().min(1),
  source: z.string().trim().min(1),
  publishedAt: z.number().int().nonnegative(),
  fetchedAt: z.number().int().nonnegative(),
  headline: z.string().trim().min(1),
  body: z.string(),
  status: z.enum(["active", "corrected", "withdrawn"]),
  correction: z.discriminatedUnion("tag", [
    z.strictObject({ tag: z.literal("none") }),
    z.strictObject({ tag: z.literal("points-to"), articleId: z.string().trim().min(1) }),
  ]),
});

export function newsGroupSchema<Article extends z.ZodType>(article: Article) {
  return z.strictObject({
    groupId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    selection: z.discriminatedUnion("tag", [
      z.strictObject({ tag: z.literal("all") }),
      z.strictObject({ tag: z.literal("top"), limit: z.number().int().positive() }),
    ]),
    members: z.array(article),
  });
}

export const standardNewsGroupSchema = newsGroupSchema(newsSchema);

/* -------------------------------------------------------------------------- */
/* Order HOFs                                                                  */
/* -------------------------------------------------------------------------- */

/** Account facts/orders require account scope; public queries use publicScopeSchema. */
export const accountScopeSchema = z.strictObject({
  accountId: z.string().trim().min(1),
  subAccountId: z.string().trim().min(1),
});

export const publicScopeSchema = z.strictObject({ tag: z.literal("public") });
export const capabilityScopeSchema = z.discriminatedUnion("tag", [
  publicScopeSchema,
  z.strictObject({ tag: z.literal("account"), scope: accountScopeSchema }),
]);

export const orderBaseSchema = z.strictObject({
  scope: accountScopeSchema,
  instrument: instrumentSchema,
  side: z.enum(["buy", "sell"]),
  timeInForce: z.enum(["day", "gtc"]),
});

const marketOrderKindSchema = z.strictObject({ kind: z.literal("market") });
const limitOrderKindSchema = z.strictObject({ kind: z.literal("limit") });

const quantityFragmentSchema = z.strictObject({ quantity: positiveDecimalSchema });
const limitPriceFragmentSchema = z.strictObject({ limitPrice: positiveDecimalSchema });

/**
 * Object composition refuses collisions at declaration time. This is also the
 * boundary for dynamically discovered declarations, where static overlap
 * checks are unavailable; no field is overwritten.
 */
export function addFields<
  Base extends z.ZodRawShape,
  Extension extends z.ZodRawShape,
>(
  base: z.ZodObject<Base>,
  extension: z.ZodObject<Extension>,
) {
  const baseKeys = new Set(Object.keys(base.shape));
  const collisions = Object.keys(extension.shape).filter((key) => baseKeys.has(key));
  if (collisions.length > 0) {
    throw new Error(`schema field collision: ${collisions.join(", ")}`);
  }
  return base.extend(extension.shape);
}

/** These named variants keep the literal kind in the inferred schema. */
export function withLimitOrderKind<Base extends z.ZodRawShape>(base: z.ZodObject<Base>) {
  return addFields(base, limitOrderKindSchema);
}

export function withMarketOrderKind<Base extends z.ZodRawShape>(base: z.ZodObject<Base>) {
  return addFields(base, marketOrderKindSchema);
}

export function withOrderKind<Base extends z.ZodRawShape>(
  base: z.ZodObject<Base>,
  kind: "market" | "limit",
) {
  return kind === "limit" ? withLimitOrderKind(base) : withMarketOrderKind(base);
}

export function withQuantity<Base extends z.ZodRawShape>(base: z.ZodObject<Base>) {
  return addFields(base, quantityFragmentSchema);
}

/**
 * A limit price is only meaningful for an order whose `kind` is `limit`.
 * A generic base can still be supplied for dynamic declarations; its boundary
 * rejects `kind: "market"` rather than silently accepting an illegal pair.
 */
export function withLimitPrice<Base extends z.ZodRawShape>(base: z.ZodObject<Base>) {
  const composed = addFields(base, limitPriceFragmentSchema);
  const kindProjection = z.object({ kind: z.unknown() });
  return composed.superRefine((value, context) => {
    const projected = kindProjection.safeParse(value);
    if (!projected.success || projected.data.kind !== "limit") {
      context.addIssue({
        code: "custom",
        path: ["kind"],
        message: "limitPrice requires kind: limit",
      });
    }
  });
}

export const semanticConstraintSchema = z.strictObject({
  id: z.string().trim().min(1),
  version: z.number().int().positive(),
  description: z.string().trim().min(1),
});
export type SemanticConstraint = z.output<typeof semanticConstraintSchema>;
export const limitPriceSemanticConstraint = {
  id: "order.limit-price-requires-limit-kind",
  version: 1,
  description: "A composed limitPrice is valid only when kind is limit.",
} satisfies SemanticConstraint;
export function withProviderExtension<
  Base extends z.ZodRawShape,
  Extension extends z.ZodRawShape,
>(base: z.ZodObject<Base>, extension: z.ZodObject<Extension>) {
  return addFields(base, extension);
}

export const instrumentWithFactsSchema = withProviderExtension(
  instrumentSchema,
  z.strictObject({ facts: instrumentFactsSchema }),
);

/* -------------------------------------------------------------------------- */
/* Fixed outer capability descriptor                                            */
/* -------------------------------------------------------------------------- */

export const capabilityRequirementSchema = z.strictObject({
  resource: z.string().trim().min(1),
  permission: z.string().trim().min(1),
});
export type CapabilityRequirement = z.output<typeof capabilityRequirementSchema>;
export type CapabilityRequirementList = readonly CapabilityRequirement[];

export const capabilitySourceSchema = z.strictObject({
  language: z.string().trim().min(1),
  identity: z.string().trim().min(1),
  version: z.string().trim().min(1),
});
export type CapabilitySource = z.output<typeof capabilitySourceSchema>;

export const capabilityAvailabilitySchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("available") }),
  z.strictObject({ tag: z.literal("unavailable"), reason: z.string().trim().min(1) }),
]);
export type CapabilityAvailability = z.output<typeof capabilityAvailabilitySchema>;

export const capabilityEffectSchema = z.enum(["pure", "read", "write-intent"]);
export type CapabilityEffect = z.output<typeof capabilityEffectSchema>;

export const deliverySchema = z.enum(["pull", "push"]);
export type Delivery = z.output<typeof deliverySchema>;

export const noControlSchema = z.strictObject({ tag: z.literal("none") });

export const pushControlSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("started"), subscriptionId: z.string().trim().min(1) }),
  z.strictObject({
    tag: z.literal("cancelled"),
    reason: z.enum(["abort-signal", "consumer-closed", "provider-stopped"]),
  }),
  z.strictObject({
    tag: z.literal("completed"),
    reason: z.enum(["source-exhausted", "provider-closed"]),
  }),
]);
export type PushControl = z.output<typeof pushControlSchema>;

const pathSchema = z.array(z.string().trim().min(1)).min(1);
const jsonSchemaValue = jsonValueSchema;

export const capabilityDescriptorSchema = z.strictObject({
  protocolVersion: z.literal(1),
  capabilityId: z.string().trim().min(1),
  path: pathSchema,
  description: z.string().trim().min(1),
  schemaVersion: schemaVersionSchema,
  schemaFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  inputSchema: jsonSchemaValue,
  outputSchema: jsonSchemaValue,
  errorSchema: jsonSchemaValue,
  controlSchema: jsonSchemaValue,
  delivery: deliverySchema,
  effect: capabilityEffectSchema,
  semanticConstraints: z.array(semanticConstraintSchema),
  requirements: z.array(capabilityRequirementSchema),
  source: capabilitySourceSchema,
  availability: capabilityAvailabilitySchema,
});

type DescriptorRecord = z.output<typeof capabilityDescriptorSchema>;
type ReadonlyDescriptorRecord = Readonly<DescriptorRecord>;
export type CapabilityDescriptor<
  Requirements extends CapabilityRequirementList = CapabilityRequirementList,
> = Omit<ReadonlyDescriptorRecord, "requirements"> & {
  readonly requirements: Requirements;
};

export type SchemaLike = z.ZodType;

function issueMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.map((item) => String(item)).join(".");
    return `${path}: ${issue.message}`;
  });
}

function schemaAsJson(schema: SchemaLike, io: "input" | "output"): JsonValue {
  let generated: unknown;
  try {
    generated = z.toJSONSchema(schema, {
      io,
      target: "draft-2020-12",
      unrepresentable: "throw",
    });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown schema export failure";
    throw new Error(`schema is not wire-exportable: ${detail}`);
  }
  const encoded = JSON.stringify(generated);
  if (encoded === undefined) throw new Error("schema JSON export produced no value");
  return jsonValueSchema.parse(JSON.parse(encoded));
}

function canonicalJson(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

function fingerprint(value: JsonValue): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
interface DefinitionBase<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> {
  readonly capabilityId: string;
  readonly path: readonly [string, ...string[]];
  readonly description: string;
  readonly schemaVersion: number;
  readonly inputSchema: Input;
  readonly outputSchema: Output;
  readonly errorSchema: ErrorSchema;
  readonly effect: CapabilityEffect;
  readonly semanticConstraints: readonly SemanticConstraint[];
  readonly requirements: Requirements;
  readonly source: CapabilitySource;
  readonly availability: CapabilityAvailability;
}

export type CapabilityOutcome<Output, Error> =
  | { readonly tag: "output"; readonly value: Output }
  | { readonly tag: "error"; readonly error: Error };

export type PullHandler<Input, Output, Error> = (
  input: Input,
  signal: AbortSignal,
) => Promise<CapabilityOutcome<Output, Error>>;

export type PushFrame<Output, Error> =
  | { readonly tag: "data"; readonly sequence: number; readonly value: Output }
  | { readonly tag: "error"; readonly error: Error }
  | { readonly tag: "control"; readonly control: PushControl };

export type PushHandler<Input, Output, Error> = (
  input: Input,
  signal: AbortSignal,
) => AsyncIterable<PushFrame<Output, Error>>;

export type PullDefinition<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> = DefinitionBase<Input, Output, ErrorSchema, Requirements> & {
  readonly handler: PullHandler<z.output<Input>, z.output<Output>, z.output<ErrorSchema>>;
};

export type PushDefinition<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> = DefinitionBase<Input, Output, ErrorSchema, Requirements> & {
  readonly handler: PushHandler<z.output<Input>, z.output<Output>, z.output<ErrorSchema>>;
};

export interface PullCapability<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList = CapabilityRequirementList,
> {
  readonly kind: "capability";
  readonly delivery: "pull";
  readonly inputSchema: Input;
  readonly outputSchema: Output;
  readonly errorSchema: ErrorSchema;
  readonly controlSchema: typeof noControlSchema;
  readonly descriptor: CapabilityDescriptor<Requirements>;
}

export interface PushCapability<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList = CapabilityRequirementList,
> {
  readonly kind: "capability";
  readonly delivery: "push";
  readonly inputSchema: Input;
  readonly outputSchema: Output;
  readonly errorSchema: ErrorSchema;
  readonly controlSchema: typeof pushControlSchema;
  readonly descriptor: CapabilityDescriptor<Requirements>;
}

export type CapabilityDeclaration<
  Input extends SchemaLike = SchemaLike,
  Output extends SchemaLike = SchemaLike,
  ErrorSchema extends SchemaLike = SchemaLike,
  Requirements extends CapabilityRequirementList = CapabilityRequirementList,
> =
  | PullCapability<Input, Output, ErrorSchema, Requirements>
  | PushCapability<Input, Output, ErrorSchema, Requirements>;

export type InvocationResponse<Output, Error> =
  | { readonly tag: "output"; readonly value: Output }
  | { readonly tag: "domain-error"; readonly error: Error }
  | { readonly tag: "boundary-error"; readonly error: BoundaryError };

export const boundaryErrorSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("invalid-input"), issues: z.array(z.string().min(1)).min(1) }),
  z.strictObject({ tag: z.literal("invalid-output"), issues: z.array(z.string().min(1)).min(1) }),
  z.strictObject({ tag: z.literal("invalid-error"), issues: z.array(z.string().min(1)).min(1) }),
  z.strictObject({ tag: z.literal("protocol-violation"), message: z.string().min(1) }),
  z.strictObject({ tag: z.literal("handler-failure"), message: z.string().min(1) }),
  z.strictObject({ tag: z.literal("unavailable"), reason: z.string().min(1) }),
  z.strictObject({ tag: z.literal("aborted"), reason: z.string().min(1) }),
  z.strictObject({ tag: z.literal("wrong-delivery"), expected: deliverySchema }),
  z.strictObject({ tag: z.literal("unknown-capability"), path: z.array(z.string().min(1)).min(1) }),
]);
export type BoundaryError = z.output<typeof boundaryErrorSchema>;

function makeDescriptor<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
>(
  definition: DefinitionBase<Input, Output, ErrorSchema, Requirements>,
  delivery: Delivery,
  controlSchema: SchemaLike,
): CapabilityDescriptor<Requirements> {
  const inputSchema = schemaAsJson(definition.inputSchema, "input");
  const outputSchema = schemaAsJson(definition.outputSchema, "output");
  const errorSchema = schemaAsJson(definition.errorSchema, "output");
  const control = schemaAsJson(controlSchema, "output");
  const contract = {
    protocolVersion: 1,
    capabilityId: definition.capabilityId,
    path: [...definition.path],
    schemaVersion: definition.schemaVersion,
    inputSchema,
    outputSchema,
    errorSchema,
    controlSchema: control,
    delivery,
    effect: definition.effect,
    semanticConstraints: [...definition.semanticConstraints],
    requirements: [...definition.requirements],
    source: definition.source,
  } satisfies JsonValue;
  const descriptorValue = capabilityDescriptorSchema.parse({
    ...contract,
    description: definition.description,
    schemaFingerprint: fingerprint(contract),
    availability: definition.availability,
  });
  return {
    ...descriptorValue,
    requirements: definition.requirements,
  };
}

function freshSignal(): AbortSignal {
  return new AbortController().signal;
}

function availabilityBoundary(availability: CapabilityAvailability): BoundaryError | undefined {
  return availability.tag === "available"
    ? undefined
    : { tag: "unavailable", reason: availability.reason };
}

function abortedBoundary(): BoundaryError {
  return { tag: "aborted", reason: "AbortSignal was already aborted" };
}

abstract class PullCapabilityRuntime<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> implements PullCapability<Input, Output, ErrorSchema, Requirements>
{
  readonly kind = "capability";
  readonly delivery = "pull";
  readonly controlSchema = noControlSchema;

  constructor(
    readonly inputSchema: Input,
    readonly outputSchema: Output,
    readonly errorSchema: ErrorSchema,
    readonly descriptor: CapabilityDescriptor<Requirements>,
  ) {}

  abstract execute(
    raw: unknown,
    signal: AbortSignal,
  ): Promise<InvocationResponse<z.output<Output>, z.output<ErrorSchema>>>;
}

abstract class PushCapabilityRuntime<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> implements PushCapability<Input, Output, ErrorSchema, Requirements>
{
  readonly kind = "capability";
  readonly delivery = "push";
  readonly controlSchema = pushControlSchema;

  constructor(
    readonly inputSchema: Input,
    readonly outputSchema: Output,
    readonly errorSchema: ErrorSchema,
    readonly descriptor: CapabilityDescriptor<Requirements>,
  ) {}

  abstract execute(
    raw: unknown,
    signal: AbortSignal,
  ): AsyncIterable<ValidatedPushFrame<z.output<Output>, z.output<ErrorSchema>>>;
}

class DefinedPullCapability<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> extends PullCapabilityRuntime<Input, Output, ErrorSchema, Requirements> {
  readonly #handler: PullHandler<z.output<Input>, z.output<Output>, z.output<ErrorSchema>>;

  constructor(definition: PullDefinition<Input, Output, ErrorSchema, Requirements>) {
    super(
      definition.inputSchema,
      definition.outputSchema,
      definition.errorSchema,
      makeDescriptor(definition, "pull", noControlSchema),
    );
    this.#handler = definition.handler;
  }

  async execute(
    raw: unknown,
    signal: AbortSignal,
  ): Promise<InvocationResponse<z.output<Output>, z.output<ErrorSchema>>> {
    const available = availabilityBoundary(this.descriptor.availability);
    if (available !== undefined) return { tag: "boundary-error", error: available };
    if (signal.aborted) return { tag: "boundary-error", error: abortedBoundary() };

    const parsedInput = this.inputSchema.safeParse(raw);
    if (!parsedInput.success) {
      return { tag: "boundary-error", error: { tag: "invalid-input", issues: issueMessages(parsedInput.error) } };
    }

    let outcome: CapabilityOutcome<z.output<Output>, z.output<ErrorSchema>>;
    try {
      outcome = await this.#handler(parsedInput.data, signal);
    } catch (error: unknown) {
      if (signal.aborted) return { tag: "boundary-error", error: abortedBoundary() };
      const message = error instanceof Error ? error.message : "handler threw a non-Error value";
      return { tag: "boundary-error", error: { tag: "handler-failure", message } };
    }

    if (outcome.tag === "output") {
      const checked = this.outputSchema.safeParse(outcome.value);
      if (!checked.success) {
        return { tag: "boundary-error", error: { tag: "invalid-output", issues: issueMessages(checked.error) } };
      }
      return { tag: "output", value: checked.data };
    }
    if (outcome.tag === "error") {
      const checked = this.errorSchema.safeParse(outcome.error);
      if (!checked.success) {
        return { tag: "boundary-error", error: { tag: "invalid-error", issues: issueMessages(checked.error) } };
      }
      return { tag: "domain-error", error: checked.data };
    }
    return { tag: "boundary-error", error: { tag: "protocol-violation", message: "handler returned an unknown outcome tag" } };
  }
}

export type ValidatedPushFrame<Output, Error> =
  | PushFrame<Output, Error>
  | { readonly tag: "boundary-error"; readonly error: BoundaryError };

class DefinedPushCapability<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> extends PushCapabilityRuntime<Input, Output, ErrorSchema, Requirements> {
  readonly #handler: PushHandler<z.output<Input>, z.output<Output>, z.output<ErrorSchema>>;

  constructor(definition: PushDefinition<Input, Output, ErrorSchema, Requirements>) {
    super(
      definition.inputSchema,
      definition.outputSchema,
      definition.errorSchema,
      makeDescriptor(definition, "push", pushControlSchema),
    );
    this.#handler = definition.handler;
  }

  async *execute(
    raw: unknown,
    signal: AbortSignal,
  ): AsyncIterable<ValidatedPushFrame<z.output<Output>, z.output<ErrorSchema>>> {
    const available = availabilityBoundary(this.descriptor.availability);
    if (available !== undefined) {
      yield { tag: "boundary-error", error: available };
      return;
    }
    if (signal.aborted) {
      yield { tag: "boundary-error", error: abortedBoundary() };
      return;
    }

    const parsedInput = this.inputSchema.safeParse(raw);
    if (!parsedInput.success) {
      yield { tag: "boundary-error", error: { tag: "invalid-input", issues: issueMessages(parsedInput.error) } };
      return;
    }

    let terminal = false;
    try {
      for await (const frame of this.#handler(parsedInput.data, signal)) {
        if (signal.aborted) {
          yield { tag: "control", control: { tag: "cancelled", reason: "abort-signal" } };
          terminal = true;
          return;
        }
        if (frame.tag === "data") {
          const sequence = z.number().int().nonnegative().safeParse(frame.sequence);
          if (!sequence.success) {
            yield { tag: "boundary-error", error: { tag: "protocol-violation", message: "data frame sequence is not a non-negative integer" } };
            terminal = true;
            return;
          }
          const value = this.outputSchema.safeParse(frame.value);
          if (!value.success) {
            yield { tag: "boundary-error", error: { tag: "invalid-output", issues: issueMessages(value.error) } };
            terminal = true;
            return;
          }
          yield { tag: "data", sequence: sequence.data, value: value.data };
          continue;
        }
        if (frame.tag === "error") {
          const error = this.errorSchema.safeParse(frame.error);
          if (!error.success) {
            yield { tag: "boundary-error", error: { tag: "invalid-error", issues: issueMessages(error.error) } };
            terminal = true;
            return;
          }
          yield { tag: "error", error: error.data };
          continue;
        }
        if (frame.tag === "control") {
          const control = pushControlSchema.safeParse(frame.control);
          if (!control.success) {
            yield { tag: "boundary-error", error: { tag: "protocol-violation", message: "invalid push control frame" } };
            terminal = true;
            return;
          }
          yield { tag: "control", control: control.data };
          if (control.data.tag === "completed" || control.data.tag === "cancelled") {
            terminal = true;
            return;
          }
          continue;
        }
        yield { tag: "boundary-error", error: { tag: "protocol-violation", message: "handler yielded an unknown frame tag" } };
        terminal = true;
        return;
      }
    } catch (error: unknown) {
      if (signal.aborted) {
        yield { tag: "control", control: { tag: "cancelled", reason: "abort-signal" } };
        terminal = true;
        return;
      }
      const message = error instanceof Error ? error.message : "push handler threw a non-Error value";
      yield { tag: "boundary-error", error: { tag: "handler-failure", message } };
      terminal = true;
      return;
    }

    if (!terminal) {
      yield {
        tag: "control",
        control: signal.aborted
          ? { tag: "cancelled", reason: "abort-signal" }
          : { tag: "completed", reason: "source-exhausted" },
      };
    }
  }
}

export function definePull<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  const Requirements extends CapabilityRequirementList,
>(definition: PullDefinition<Input, Output, ErrorSchema, Requirements>): PullCapability<Input, Output, ErrorSchema, Requirements> {
  return new DefinedPullCapability(definition);
}

export function definePush<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  const Requirements extends CapabilityRequirementList,
>(definition: PushDefinition<Input, Output, ErrorSchema, Requirements>): PushCapability<Input, Output, ErrorSchema, Requirements> {
  return new DefinedPushCapability(definition);
}

function executePullAtBoundary<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
>(
  capability: PullCapability<Input, Output, ErrorSchema, Requirements>,
  raw: unknown,
  signal: AbortSignal,
): Promise<InvocationResponse<z.output<Output>, z.output<ErrorSchema>>> {
  if (capability instanceof PullCapabilityRuntime) return capability.execute(raw, signal);
  return Promise.resolve({
    tag: "boundary-error",
    error: { tag: "protocol-violation", message: "capability was not created by definePull" },
  });
}

function streamPushAtBoundary<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
>(
  capability: PushCapability<Input, Output, ErrorSchema, Requirements>,
  raw: unknown,
  signal: AbortSignal,
): AsyncIterable<ValidatedPushFrame<z.output<Output>, z.output<ErrorSchema>>> {
  if (capability instanceof PushCapabilityRuntime) return capability.execute(raw, signal);
  return (async function* (): AsyncIterable<ValidatedPushFrame<z.output<Output>, z.output<ErrorSchema>>> {
    yield { tag: "boundary-error", error: { tag: "protocol-violation", message: "capability was not created by definePush" } };
  })();
}

export function invokePull<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
>(
  capability: PullCapability<Input, Output, ErrorSchema, Requirements>,
  raw: z.input<Input>,
  signal: AbortSignal = freshSignal(),
): Promise<InvocationResponse<z.output<Output>, z.output<ErrorSchema>>> {
  return executePullAtBoundary(capability, raw, signal);
}

export function streamPush<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
>(
  capability: PushCapability<Input, Output, ErrorSchema, Requirements>,
  raw: z.input<Input>,
  signal: AbortSignal = freshSignal(),
): AsyncIterable<ValidatedPushFrame<z.output<Output>, z.output<ErrorSchema>>> {
  return streamPushAtBoundary(capability, raw, signal);
}

/* -------------------------------------------------------------------------- */
/* Controlled transaction wrapper                                              */
/* -------------------------------------------------------------------------- */

export type AdmissionResult<Intent, Error> =
  | { readonly tag: "accepted"; readonly intent: Intent }
  | { readonly tag: "rejected"; readonly error: Error };

export interface AdmissionPort<Intent, Error> {
  admit(intent: Intent, signal: AbortSignal): Promise<AdmissionResult<Intent, Error>>;
}

export interface ControlledCapability<
  Input extends SchemaLike,
  Intent extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList = CapabilityRequirementList,
> extends PullCapability<Input, Intent, ErrorSchema, Requirements> {
  submit(
    raw: z.input<Input>,
    signal?: AbortSignal,
  ): Promise<InvocationResponse<z.output<Intent>, z.output<ErrorSchema>>>;
}

class ControlledPullCapability<
  Input extends SchemaLike,
  Intent extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> extends PullCapabilityRuntime<Input, Intent, ErrorSchema, Requirements> {
  readonly #base: PullCapability<Input, Intent, ErrorSchema, Requirements>;
  readonly #admission: AdmissionPort<z.output<Intent>, z.output<ErrorSchema>>;

  constructor(
    base: PullCapability<Input, Intent, ErrorSchema, Requirements>,
    admission: AdmissionPort<z.output<Intent>, z.output<ErrorSchema>>,
  ) {
    super(base.inputSchema, base.outputSchema, base.errorSchema, base.descriptor);
    this.#base = base;
    this.#admission = admission;
  }

  async #admit(
    intent: z.output<Intent>,
    signal: AbortSignal,
  ): Promise<InvocationResponse<z.output<Intent>, z.output<ErrorSchema>>> {
    let admission: AdmissionResult<z.output<Intent>, z.output<ErrorSchema>>;
    try {
      admission = await this.#admission.admit(intent, signal);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "admission port threw a non-Error value";
      return { tag: "boundary-error", error: { tag: "handler-failure", message } };
    }
    if (admission.tag === "accepted") {
      const checked = this.outputSchema.safeParse(admission.intent);
      if (!checked.success) {
        return { tag: "boundary-error", error: { tag: "invalid-output", issues: issueMessages(checked.error) } };
      }
      return { tag: "output", value: checked.data };
    }
    if (admission.tag === "rejected") {
      const checked = this.errorSchema.safeParse(admission.error);
      if (!checked.success) {
        return { tag: "boundary-error", error: { tag: "invalid-error", issues: issueMessages(checked.error) } };
      }
      return { tag: "domain-error", error: checked.data };
    }
    return { tag: "boundary-error", error: { tag: "protocol-violation", message: "admission returned an unknown decision tag" } };
  }

  async execute(
    raw: unknown,
    signal: AbortSignal,
  ): Promise<InvocationResponse<z.output<Intent>, z.output<ErrorSchema>>> {
    const planned = await executePullAtBoundary(this.#base, raw, signal);
    if (planned.tag === "boundary-error" || planned.tag === "domain-error") return planned;
    if (signal.aborted) return { tag: "boundary-error", error: abortedBoundary() };
    return this.#admit(planned.value, signal);
  }

  submit(
    raw: z.input<Input>,
    signal: AbortSignal = freshSignal(),
  ): Promise<InvocationResponse<z.output<Intent>, z.output<ErrorSchema>>> {
    return this.execute(raw, signal);
  }
}

export function withTransaction<
  Input extends SchemaLike,
  Intent extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
>(
  capability: PullCapability<Input, Intent, ErrorSchema, Requirements>,
  admission: AdmissionPort<z.output<Intent>, z.output<ErrorSchema>>,
): ControlledCapability<Input, Intent, ErrorSchema, Requirements> {
  return new ControlledPullCapability(capability, admission);
}

/* -------------------------------------------------------------------------- */
/* Tree, discovery, and outer CLI projection                                   */
/* -------------------------------------------------------------------------- */

export interface CapabilityLeafNode {
  readonly kind: "leaf";
  readonly name: string;
  readonly descriptor: CapabilityDescriptor;
}

export interface CapabilityNamespaceNode {
  readonly kind: "namespace";
  readonly name: string;
  readonly children: readonly CapabilityTreeNode[];
}

export type CapabilityTreeNode = CapabilityLeafNode | CapabilityNamespaceNode;
export type CapabilityTree = CapabilityNamespaceNode;

export const capabilityDiscoverySchema = z.strictObject({
  protocolVersion: z.literal(1),
  revision: z.number().int().positive(),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  capabilities: z.array(capabilityDescriptorSchema),
});
export type CapabilityDiscovery = z.output<typeof capabilityDiscoverySchema>;

export type CliInvocationResponse =
  | { readonly tag: "output"; readonly value: JsonValue }
  | { readonly tag: "domain-error"; readonly error: JsonValue }
  | { readonly tag: "boundary-error"; readonly error: BoundaryError };

export type CliPushFrame =
  | { readonly tag: "data"; readonly sequence: number; readonly value: JsonValue }
  | { readonly tag: "error"; readonly error: JsonValue }
  | { readonly tag: "control"; readonly control: PushControl }
  | { readonly tag: "boundary-error"; readonly error: BoundaryError };

abstract class CapabilityLeafRuntime implements CapabilityLeafNode {
  readonly kind = "leaf";
  readonly name: string;
  readonly descriptor: CapabilityDescriptor;

  constructor(descriptor: CapabilityDescriptor) {
    const last = descriptor.path[descriptor.path.length - 1];
    if (last === undefined) throw new Error("capability path must be non-empty");
    this.name = last;
    this.descriptor = descriptor;
  }

  abstract execute(raw: unknown, signal: AbortSignal): Promise<CliInvocationResponse>;
  abstract stream(raw: unknown, signal: AbortSignal): AsyncIterable<CliPushFrame>;
}

type JsonConversion =
  | { readonly kind: "json"; readonly value: JsonValue }
  | { readonly kind: "boundary"; readonly error: BoundaryError };

function toJsonConversion(value: unknown, tag: "output" | "error"): JsonConversion {
  const checked = jsonValueSchema.safeParse(value);
  if (checked.success) return { kind: "json", value: checked.data };
  return {
    kind: "boundary",
    error: {
      tag: tag === "output" ? "invalid-output" : "invalid-error",
      issues: issueMessages(checked.error),
    },
  };
}

class PullLeafRuntime<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> extends CapabilityLeafRuntime {
  readonly #capability: PullCapability<Input, Output, ErrorSchema, Requirements>;

  constructor(capability: PullCapability<Input, Output, ErrorSchema, Requirements>) {
    super(capability.descriptor);
    this.#capability = capability;
  }

  async execute(raw: unknown, signal: AbortSignal): Promise<CliInvocationResponse> {
    const response = await executePullAtBoundary(this.#capability, raw, signal);
    if (response.tag === "boundary-error") return response;
    const converted = toJsonConversion(
      response.tag === "output" ? response.value : response.error,
      response.tag === "output" ? "output" : "error",
    );
    if (converted.kind === "boundary") return { tag: "boundary-error", error: converted.error };
    return response.tag === "output"
      ? { tag: "output", value: converted.value }
      : { tag: "domain-error", error: converted.value };
  }

  async *stream(_raw: unknown, _signal: AbortSignal): AsyncIterable<CliPushFrame> {
    yield { tag: "boundary-error", error: { tag: "wrong-delivery", expected: "pull" } };
  }
}

class PushLeafRuntime<
  Input extends SchemaLike,
  Output extends SchemaLike,
  ErrorSchema extends SchemaLike,
  Requirements extends CapabilityRequirementList,
> extends CapabilityLeafRuntime {
  readonly #capability: PushCapability<Input, Output, ErrorSchema, Requirements>;

  constructor(capability: PushCapability<Input, Output, ErrorSchema, Requirements>) {
    super(capability.descriptor);
    this.#capability = capability;
  }

  async execute(_raw: unknown, _signal: AbortSignal): Promise<CliInvocationResponse> {
    return { tag: "boundary-error", error: { tag: "wrong-delivery", expected: "push" } };
  }

  async *stream(raw: unknown, signal: AbortSignal): AsyncIterable<CliPushFrame> {
    for await (const frame of streamPushAtBoundary(this.#capability, raw, signal)) {
      if (frame.tag === "boundary-error") {
        yield frame;
      } else if (frame.tag === "data") {
        const value = toJsonConversion(frame.value, "output");
        if (value.kind === "boundary") {
          yield { tag: "boundary-error", error: value.error };
          return;
        }
        yield { tag: "data", sequence: frame.sequence, value: value.value };
      } else if (frame.tag === "error") {
        const error = toJsonConversion(frame.error, "error");
        if (error.kind === "boundary") {
          yield { tag: "boundary-error", error: error.error };
          return;
        }
        yield { tag: "error", error: error.value };
      } else {
        yield frame;
      }
    }
  }
}

function makeRuntimeLeaf(capability: CapabilityDeclaration): CapabilityLeafRuntime {
  return capability.delivery === "pull"
    ? new PullLeafRuntime(capability)
    : new PushLeafRuntime(capability);
}

function buildNamespace(
  prefix: readonly string[],
  leaves: readonly CapabilityLeafRuntime[],
): CapabilityNamespaceNode {
  const names = Array.from(
    new Set(
      leaves
        .map((leaf) => leaf.descriptor.path[prefix.length])
        .filter((name): name is string => name !== undefined),
    ),
  ).sort();
  const children: CapabilityTreeNode[] = [];
  for (const name of names) {
    const nextPrefix = [...prefix, name];
    const members = leaves.filter((leaf) => leaf.descriptor.path[prefix.length] === name);
    const exact = members.filter((leaf) => leaf.descriptor.path.length === nextPrefix.length);
    const deeper = members.filter((leaf) => leaf.descriptor.path.length > nextPrefix.length);
    if (exact.length > 1) throw new Error(`capability path collision: ${nextPrefix.join("/")}`);
    if (exact.length === 1 && deeper.length > 0) {
      throw new Error(`capability leaf/namespace collision: ${nextPrefix.join("/")}`);
    }
    if (exact.length === 1) {
      const [exactLeaf] = exact;
      if (exactLeaf === undefined) throw new Error(`capability tree leaf missing: ${nextPrefix.join("/")}`);
      children.push(exactLeaf);
    } else if (deeper.length > 0) {
      children.push(buildNamespace(nextPrefix, deeper));
    }
  }
  return {
    kind: "namespace",
    name: prefix.length === 0 ? "uta" : prefix[prefix.length - 1] ?? "uta",
    children,
  };
}

export function createCapabilityTree(
  declarations: readonly CapabilityDeclaration[],
): CapabilityTree {
  return buildNamespace([], declarations.map(makeRuntimeLeaf));
}

function collectLeaves(node: CapabilityTreeNode): readonly CapabilityLeafNode[] {
  return node.kind === "leaf" ? [node] : node.children.flatMap(collectLeaves);
}

export function discover(tree: CapabilityTree): CapabilityDiscovery {
  const capabilities = collectLeaves(tree)
    .map((leaf) => leaf.descriptor)
    .sort((left, right) => left.path.join("/").localeCompare(right.path.join("/")));
  const payload = jsonValueSchema.parse(capabilities);
  const discoveryFingerprint = fingerprint(payload);
  const prefix = Number.parseInt(discoveryFingerprint.slice(0, 8), 16);
  const revision = (prefix % 2_000_000_000) + 1;
  return capabilityDiscoverySchema.parse({
    protocolVersion: 1,
    revision,
    fingerprint: discoveryFingerprint,
    capabilities,
  });
}

function pathParts(path: string | readonly string[]): readonly string[] {
  const parts = typeof path === "string" ? path.split("/").filter((part) => part.length > 0) : [...path];
  return parts.length === 0 ? ["<empty>"] : parts;
}

function findLeaf(tree: CapabilityTree, path: readonly string[]): CapabilityLeafRuntime | undefined {
  function visit(node: CapabilityTreeNode, index: number): CapabilityLeafRuntime | undefined {
    if (node.kind === "leaf") {
      if (!(node instanceof CapabilityLeafRuntime)) return undefined;
      return index === path.length && node.descriptor.path.join("/") === path.join("/")
        ? node
        : undefined;
    }
    for (const child of node.children) {
      if (child.name === path[index]) {
        const found = visit(child, index + 1);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }
  return visit(tree, 0);
}

export interface CapabilityCli {
  help(): string;
  describe(): CapabilityDiscovery;
  pull(
    path: string | readonly string[],
    raw: unknown,
    signal?: AbortSignal,
  ): Promise<CliInvocationResponse>;
  push(
    path: string | readonly string[],
    raw: unknown,
    signal?: AbortSignal,
  ): AsyncIterable<CliPushFrame>;
}

function unknownCapability(path: readonly string[]): BoundaryError {
  return { tag: "unknown-capability", path: [...path] };
}

export function createCapabilityCli(tree: CapabilityTree): CapabilityCli {
  const discovery = discover(tree);
  return {
    help(): string {
      const rows = discovery.capabilities.map((descriptor) => {
        const availability = descriptor.availability.tag === "available" ? "available" : `unavailable: ${descriptor.availability.reason}`;
        return `uta ${descriptor.path.join(" ")} [${descriptor.delivery}] (${availability}, schema v${descriptor.schemaVersion}, ${descriptor.schemaFingerprint.slice(0, 12)}) — ${descriptor.description}`;
      });
      return [
        "UTA capability CLI (projection of declarations; no second command map)",
        "commands: help | describe | pull <path> <json> | push <path> <json>",
        ...rows,
      ].join("\n");
    },
    describe(): CapabilityDiscovery {
      return discovery;
    },
    pull(path, raw, signal = freshSignal()): Promise<CliInvocationResponse> {
      const parts = pathParts(path);
      const leaf = findLeaf(tree, parts);
      if (leaf === undefined) return Promise.resolve({ tag: "boundary-error", error: unknownCapability(parts) });
      return leaf.execute(raw, signal);
    },
    push(path, raw, signal = freshSignal()): AsyncIterable<CliPushFrame> {
      const parts = pathParts(path);
      const leaf = findLeaf(tree, parts);
      if (leaf === undefined) {
        return (async function* (): AsyncIterable<CliPushFrame> {
          yield { tag: "boundary-error", error: unknownCapability(parts) };
        })();
      }
      return leaf.stream(raw, signal);
    },
  };
}
