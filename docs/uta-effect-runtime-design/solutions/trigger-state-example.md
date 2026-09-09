# Trigger state transition specimen

## Boundary

`trigger-state-example.ts` is an executable **design experiment**, not a
production trigger runtime. It contains schema-first Zod 4.3.6 boundary models,
Decimal comparison for the candle predicate, and pure functions that return a
new state plus a described work intent. It does not contain a durable writer,
real AI call, Alice delivery bridge, provider adapter, native broker call,
secret/auth implementation, or dispatcher.

The experiment assumes that an authenticated principal and the authoritative
current state have already been supplied by the caller. `decode*` functions
parse untrusted command/event/state bodies before the pure transitions receive
them. The pure functions do not infer a principal from a command body and do
not treat a source event as authorization.

## Run

From the repository root:

```sh
node --import tsx docs/uta-effect-runtime-design/solutions/trigger-state-example.ts
```

The driver uses fixed data and prints each returned decision, resulting state,
and work description as JSON. The output describes work that a future writer or
bridge would need to handle; it does not report delivery, a broker order count,
or a native effect.

## Exported pure transitions

- `activate(state, input, at)` handles a decoded candle or source-gap input.
- `readHeldIntentControl(state, principal, at)` returns the current control
  only for the authenticated recipient while its explicit retention deadline
  remains live.
- `applyReviewCommand(state, command, principal, at)` handles a decoded
  expected-revision/expected-epoch command and, after Keep, the explicit
  `controlId`/`expectedControlRevision`.
- `expireReview(state, at)` handles the no-reply deadline without treating
  silence as approval.


`runtimeStateSchema`, `bindingSchema`, `intentSchema`,
`activationInputSchema`, `reviewCommandSchema`, and the work schemas are the
single model declarations. Their TypeScript types are `z.output<...>` results;
there is no second handwritten order or command map.

## Scenario coverage

The labels printed by the driver cover these transitions:

| Driver label | Observable design result |
| --- | --- |
| `in-progress candle is ignored` | An open/in-progress candle leaves the waiting state unchanged. |
| `closed candle ReturnToAgent creates review work` | A matching closed candle with explicit finality proof is consumed once, changes the state to suspended, and creates review work with `effect: "none"`; no dispatch work variant exists. |
| `duplicate event id returns original outcome` | The same `(bindingId, epoch, source identity, eventId, eventRevision)` returns the stored original review outcome without another activation. |
| `wrong source is rejected without duplicate outcome` | Reusing the event identity from a different source instance returns `source-mismatch`; it does not expose the stored duplicate `original` outcome. |
| `stale intent revision is rejected` | A candidate carrying an old expected revision is rejected before predicate handling. |
| `expired binding is rejected` | `validUntil` is exclusive; an event at the boundary is rejected. |
| `KeepSuspended returns ongoing HeldIntentControl` | Keep closes the initial review, preserves binding epoch/approval, and returns a current control with an explicit retention deadline beyond the old trigger lease. |
| `ReadHeldIntentControl returns current control` | The authenticated recipient can read the current control; the old review token cannot replace it. |
| `old review token after KeepSuspended is rejected` | Subsequent commands without the current control tuple return stale-control. |
| `Rearm behind the selected source boundary is rejected` | A trusted boundary behind the selected source sequence is rejected. |
| `Rearm creates a new epoch and explicit future source boundary` | Rearm uses the current control, increments epoch, clears old approval, and persists source identity/event plus an exclusive sequence boundary. |
| `old AI reply after Rearm is rejected` | A command for the old review tuple cannot operate on the new waiting state. |
| `Rearm boundary excludes the already consumed event` | The consumed event is rejected under the new epoch because its source sequence is not greater than the explicit boundary. |
| `next source event after boundary is accepted` | A trusted source event strictly after an equal boundary can activate the new epoch. |
| `Discard retires unsent local work without provider cancel` | Current-control discard emits local-retirement work and no provider cancellation request. |
| `Revise uses explicit replacement intent` | Current-control revise carries a new intent revision explicitly; no candle field changes intent parameters. |
| `RequestSubmission creates eligibility work only` | An explicit request still enters eligibility work with pending authorization and preconditions. |
| `duplicate command id returns original reply decision` | A repeated command identity with the same authenticated principal and normalized payload returns its stored decision. |
| `same command id with different payload is rejected` | Reusing a command identity for a different payload returns idempotency conflict. |
| `submit-under-policy creates eligibility work only` | A matching event creates `eligibility-check` work whose authorization and preconditions remain pending. It never creates a native dispatch intent. |
| `unreplayable gap pauses the binding` | A source gap produces named gap-recovery work and a suspended gap state; it does not invent a candle or submit the intent. |
| `no-reply deadline follows frozen keep-suspended policy` | Deadline expiry records the frozen no-reply policy and remains suspended; it does not approve or dispatch. |
| `sent state rejects draft discard` | A dispatch-started state rejects a draft discard command. |
| `outcome-unknown state rejects draft rearm` | An outcome-unknown state rejects rearm; it must be observed/reconciled rather than reopened as a draft. |

The driver throws if the expected closed activation, KeepSuspended control,
current-control Rearm/Discard/Revise, or next-source activation is not accepted;
there is no early-success return that can hide a broken sequence.

## Important boundary rules shown by the specimen

1. **A source event is evidence, not authority.** The event only selects the
   frozen binding predicate. The `submit-under-policy` branch emits an
   eligibility work intent with pending authoritative authorization and current
   precondition checks.
2. **The event does not mutate intent parameters.** `activate` carries the
   original intent through unchanged. Parameter changes require the explicit
   `Revise` command with a replacement intent and a new revision; no candle
   field is implicitly mapped into order parameters.
3. **Epoch and source replay boundaries are separate.** `Rearm` creates a new
   epoch and persists a trusted source boundary containing source identity, the
   consumed event identity, and an exclusive sequence. The boundary may equal
   the consumed sequence; the next source sequence must be greater. Incrementing
   an epoch by itself would not prove that a replayed source event is new.
4. **Discarding unsent local work needs no provider cancel.** `Discard` and the
   discard no-reply policy produce `local-retirement` work with
   `providerOperation: "none-required-for-unsent-intent"`. This is a local
   retirement description, not a claimed remote cancellation.
5. **Retention, approval, and delivery are distinct.** `KeepSuspended` closes
   the initial review and returns a current `HeldIntentControl`. Its explicit
   retention deadline is checked against the binding's retention policy, not
   the old trigger `validUntil`; the binding epoch and old approval expiry are
   unchanged. Rearm/Revise/Discard then require the current control tuple.
6. **Finality is evidence, not a string shortcut.** A closed candle includes a
   provider-event finality proof and event revision. An in-progress candle has
   no proof and is ignored.
7. **Gap/finality failures stop the automatic branch.** An unreplayable gap
   pauses the binding and does not supply missing source evidence.

## Limitations

The specimen is a reduced local state model, not the canonical
[trigger wire contract](../trigger-contract.md). It uses lower-kebab command
kinds and a simplified numeric revision/source boundary. Explicit Keep creates a
queryable control here; no-reply expiry and gap suspension do not implement the
target contract's subsequent HeldIntentControl creation. Those paths require
the target writer/control implementation, not just a successful specimen run.

This specimen does not prove:

- persistence, single-writer atomicity, crash recovery, CAS storage, or durable
  outbox delivery;
- that a provider supplies stable event identity, valid closed-bar finality,
  replay, or gap recovery; the specimen only validates the declared proof shape;
- correction/retraction evidence-maintenance revocation of pending review or
  eligibility work; event revisions are retained in selected evidence but a
  real writer must own correction ordering;
- authentication, authorization, account facts, limits, market preconditions,
  or any native venue guarantee;
- real AI prompting/replies, Alice `WorkspaceConversationControl`, or delivery
  status;
- native dispatch, acknowledgement, fills, cancellation, reconciliation, or
  an independent broker ledger.

The `dispatch-started` and `outcome-unknown` scenario states are decoded fixed
state assumptions solely to show the command rejection boundary. They do not
simulate or claim a send. Product implementation must supply the real writer,
bridge, and venue evidence before any production runtime or safety guarantee
is claimed.
