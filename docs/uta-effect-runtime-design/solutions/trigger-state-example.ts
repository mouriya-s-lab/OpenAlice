/**
 * Trigger/ReturnToAgent pure-transition design specimen.
 *
 * This file is intentionally not a runtime, durable writer, AI loop, broker
 * adapter, or dispatcher. The schemas describe the boundary values and the
 * exported functions only calculate a next state plus a described work intent.
 * The CLI at the bottom feeds fixed, decoded values through those functions.
 */

import { pathToFileURL } from "node:url";
import Decimal from "decimal.js";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Schema-first boundary values                                                */
/* -------------------------------------------------------------------------- */

const identifierSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const timeSchema = nonNegativeIntegerSchema;
const decimalTextSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);

export const accountScopeSchema = z.strictObject({
  accountId: identifierSchema,
  subAccountId: identifierSchema,
});

export const intentSchema = z.strictObject({
  intentId: identifierSchema,
  revision: positiveIntegerSchema,
  accountScope: accountScopeSchema,
  instrument: identifierSchema,
  side: z.enum(["buy", "sell"]),
  quantity: decimalTextSchema,
  /** A fixed digest makes the intent's parameters visible without modeling an order union. */
  parameterDigest: identifierSchema,
});
export type Intent = z.output<typeof intentSchema>;

const sourceSchema = z.strictObject({
  capabilityId: identifierSchema,
  instance: identifierSchema,
});
const sourceBoundarySchema = z.strictObject({
  source: sourceSchema,
  afterEventId: identifierSchema,
  sequenceExclusive: nonNegativeIntegerSchema,
});
type SourceBoundary = z.output<typeof sourceBoundarySchema>;

type Source = z.output<typeof sourceSchema>;

export const approvalSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({
    kind: z.literal("bound"),
    approvalId: identifierSchema,
    intentRevision: positiveIntegerSchema,
    expiresAt: timeSchema,
  }),
]);
export type Approval = z.output<typeof approvalSchema>;

const predicateSchema = z.strictObject({
  kind: z.literal("close-above"),
  instrument: identifierSchema,
  interval: z.literal("5m"),
  threshold: decimalTextSchema,
});
const retentionPolicySchema = z.strictObject({
  kind: z.literal("explicit"),
  maxUntil: timeSchema,
});

type Predicate = z.output<typeof predicateSchema>;

export const bindingSchema = z.strictObject({
  bindingId: identifierSchema,
  epoch: positiveIntegerSchema,
  intentId: identifierSchema,
  intentRevision: positiveIntegerSchema,
  source: sourceSchema,
  predicate: predicateSchema,
  /** Source identity and sequence are a replay boundary, not just an epoch. */
  sourceStartAfterEventId: identifierSchema,
  sourceStartExclusive: nonNegativeIntegerSchema,
  validFrom: timeSchema,
  /** validUntil is an exclusive subscription/trigger validity boundary. */
  validUntil: timeSchema,
  reviewDeadline: timeSchema,
  retentionPolicy: retentionPolicySchema,
  executionPolicy: z.enum(["return-to-agent", "submit-under-policy"]),
  recipientResumeId: identifierSchema,
  noReplyPolicy: z.enum(["keep-suspended", "discard"]),
});

export type Binding = z.output<typeof bindingSchema>;

export const candleSchema = z.strictObject({
  eventId: identifierSchema,
  eventRevision: positiveIntegerSchema,
  sourceSequence: nonNegativeIntegerSchema,
  source: sourceSchema,
  instrument: identifierSchema,
  interval: z.literal("5m"),
  openedAt: timeSchema,
  closedAt: timeSchema,
  close: decimalTextSchema,
  finality: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("in-progress") }),
    z.strictObject({
      kind: z.literal("closed"),
      proof: z.strictObject({
        kind: z.literal("provider-event"),
        version: identifierSchema,
      }),
    }),
  ]),
});
export type Candle = z.output<typeof candleSchema>;


export const gapSchema = z.strictObject({
  gapId: identifierSchema,
  source: sourceSchema,
  fromSequence: nonNegativeIntegerSchema,
  throughSequence: nonNegativeIntegerSchema,
  reason: z.enum(["disconnect", "overflow", "source-gap"]),
  replay: z.enum(["available", "unavailable"]),
});
export type Gap = z.output<typeof gapSchema>;

export const activationInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("candle"),
    bindingId: identifierSchema,
    expectedEpoch: positiveIntegerSchema,
    expectedIntentRevision: positiveIntegerSchema,
    candle: candleSchema,
  }),
  z.strictObject({
    kind: z.literal("gap"),
    bindingId: identifierSchema,
    expectedEpoch: positiveIntegerSchema,
    expectedIntentRevision: positiveIntegerSchema,
    gap: gapSchema,
  }),
]);
export type ActivationInput = z.output<typeof activationInputSchema>;

const reviewCommandBodySchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("discard"),
    reason: z.string().trim().min(1).optional(),
  }),
  z.strictObject({
    kind: z.literal("keep-suspended"),
    until: timeSchema,
    reason: z.string().trim().min(1),
  }),
  z.strictObject({
    kind: z.literal("rearm"),
    futureSourceBoundary: sourceBoundarySchema,
    validUntil: timeSchema,
    reviewDeadline: timeSchema,
  }),
  z.strictObject({
    kind: z.literal("revise"),
    replacement: intentSchema,
    futureSourceBoundary: sourceBoundarySchema,
    validUntil: timeSchema,
    reviewDeadline: timeSchema,
  }),
  z.strictObject({
    kind: z.literal("request-submission"),
    rationale: z.string().trim().min(1).optional(),
  }),
]);

export const reviewCommandSchema = z.strictObject({
  commandId: identifierSchema,
  reviewId: identifierSchema,
  controlId: identifierSchema.optional(),
  expectedControlRevision: positiveIntegerSchema.optional(),
  expectedBindingEpoch: positiveIntegerSchema,
  expectedIntentRevision: positiveIntegerSchema,
  body: reviewCommandBodySchema,
});
export type ReviewCommand = z.output<typeof reviewCommandSchema>;



export const authenticatedPrincipalSchema = z.strictObject({
  kind: z.literal("alice-session"),
  resumeId: identifierSchema,
});
export type AuthenticatedPrincipal = z.output<typeof authenticatedPrincipalSchema>;

/* -------------------------------------------------------------------------- */
/* Work descriptions and state models                                          */
/* -------------------------------------------------------------------------- */

const reviewSchema = z.strictObject({
  reviewId: identifierSchema,
  bindingId: identifierSchema,
  bindingEpoch: positiveIntegerSchema,
  intentId: identifierSchema,
  intentRevision: positiveIntegerSchema,
  eventId: identifierSchema,
  recipientResumeId: identifierSchema,
  deadline: timeSchema,
  reason: z.literal("trigger-match"),
  selectedEvidence: z.strictObject({
    eventRevision: positiveIntegerSchema,
    sourceSequence: nonNegativeIntegerSchema,
    close: decimalTextSchema,
    finalityProofVersion: identifierSchema,
  }),
});
type Review = z.output<typeof reviewSchema>;

const heldIntentControlSchema = z.strictObject({
  controlId: identifierSchema,
  controlRevision: positiveIntegerSchema,
  reviewId: identifierSchema,
  bindingId: identifierSchema,
  bindingEpoch: positiveIntegerSchema,
  intentId: identifierSchema,
  intentRevision: positiveIntegerSchema,
  selectedEventId: identifierSchema,
  selectedSourceSequence: nonNegativeIntegerSchema,
  retentionUntil: timeSchema,
});
export type HeldIntentControl = z.output<typeof heldIntentControlSchema>;

const reviewRequestWorkSchema = z.strictObject({
  kind: z.literal("review-request"),
  /** "none" means no native dispatch intent exists in this work item. */
  effect: z.literal("none"),
  review: reviewSchema,
  allowedCommands: z.array(
    z.enum(["discard", "keep-suspended", "rearm", "revise", "request-submission"]),
  ),
});
type ReviewRequestWork = z.output<typeof reviewRequestWorkSchema>;

const eligibilityWorkSchema = z.strictObject({
  kind: z.literal("eligibility-check"),
  effect: z.literal("none"),
  workId: identifierSchema,
  intentId: identifierSchema,
  intentRevision: positiveIntegerSchema,
  bindingId: identifierSchema,
  bindingEpoch: positiveIntegerSchema,
  eventId: identifierSchema,
  /** These are pending authoritative checks, not claims that they passed. */
  requirements: z.strictObject({
    authorization: z.literal("pending-authoritative-check"),
    preconditions: z.literal("pending-authoritative-check"),
  }),
});
type EligibilityWork = z.output<typeof eligibilityWorkSchema>;

const gapRecoveryWorkSchema = z.strictObject({
  kind: z.literal("gap-recovery"),
  effect: z.literal("none"),
  workId: identifierSchema,
  bindingId: identifierSchema,
  bindingEpoch: positiveIntegerSchema,
  gapId: identifierSchema,
  replay: z.enum(["available", "unavailable"]),
});
type GapRecoveryWork = z.output<typeof gapRecoveryWorkSchema>;

const localRetirementWorkSchema = z.strictObject({
  kind: z.literal("local-retirement"),
  effect: z.literal("none"),
  workId: identifierSchema,
  intentId: identifierSchema,
  reason: z.string().trim().min(1),
  providerOperation: z.literal("none-required-for-unsent-intent"),
});
type LocalRetirementWork = z.output<typeof localRetirementWorkSchema>;

const reviewControlWorkSchema = z.strictObject({
  kind: z.literal("review-control"),
  effect: z.literal("none"),
  workId: identifierSchema,
  bindingId: identifierSchema,
  bindingEpoch: positiveIntegerSchema,
  action: z.enum(["keep-suspended", "rearm", "revise", "request-submission", "no-reply-expired"]),
});
type ReviewControlWork = z.output<typeof reviewControlWorkSchema>;

const workIntentSchema = z.discriminatedUnion("kind", [
  reviewRequestWorkSchema,
  eligibilityWorkSchema,
  gapRecoveryWorkSchema,
  localRetirementWorkSchema,
  reviewControlWorkSchema,
]);
export type WorkIntent = z.output<typeof workIntentSchema>;

const activationOutcomeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("review-requested"),
    dispatch: z.literal("none"),
    work: reviewRequestWorkSchema,
  }),
  z.strictObject({
    kind: z.literal("eligibility-requested"),
    dispatch: z.literal("none"),
    work: eligibilityWorkSchema,
  }),
]);
export type ActivationOutcome = z.output<typeof activationOutcomeSchema>;

const consumptionSchema = z.strictObject({
  bindingId: identifierSchema,
  bindingEpoch: positiveIntegerSchema,
  source: sourceSchema,
  eventId: identifierSchema,
  eventRevision: positiveIntegerSchema,
  outcome: activationOutcomeSchema,
});
type Consumption = z.output<typeof consumptionSchema>;


const suspensionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("review-pending"), review: reviewSchema }),
  z.strictObject({
    kind: z.literal("held-intent-control"),
    control: heldIntentControlSchema,
    reason: z.string().trim().min(1),
  }),
  z.strictObject({
    kind: z.literal("gap-paused"),
    gap: gapSchema,
    resumeAfterSequenceExclusive: nonNegativeIntegerSchema,
  }),
  z.strictObject({
    kind: z.literal("review-expired"),
    reviewId: identifierSchema,
    deadline: timeSchema,
    policy: z.enum(["keep-suspended", "discard"]),
  }),
]);
type Suspension = z.output<typeof suspensionSchema>;


const replyDecisionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("discarded"),
    effect: z.literal("none"),
    work: localRetirementWorkSchema,
  }),
  z.strictObject({
    kind: z.literal("kept-suspended"),
    effect: z.literal("none"),
    control: heldIntentControlSchema,
    work: reviewControlWorkSchema,
  }),
  z.strictObject({
    kind: z.literal("rearmed"),
    effect: z.literal("none"),
    newEpoch: positiveIntegerSchema,
    futureSourceBoundary: sourceBoundarySchema,
    work: reviewControlWorkSchema,
  }),
  z.strictObject({
    kind: z.literal("revised"),
    effect: z.literal("none"),
    newEpoch: positiveIntegerSchema,
    newIntentRevision: positiveIntegerSchema,
    futureSourceBoundary: sourceBoundarySchema,
    work: reviewControlWorkSchema,
  }),
  z.strictObject({
    kind: z.literal("submission-requested"),
    effect: z.literal("none"),
    work: eligibilityWorkSchema,
  }),
]);
export type ReplyDecision = z.output<typeof replyDecisionSchema>;

const commandReceiptSchema = z.strictObject({
  commandId: identifierSchema,
  principalResumeId: identifierSchema,
  payloadKey: z.string().min(1),
  outcome: replyDecisionSchema,
});
type CommandReceipt = z.output<typeof commandReceiptSchema>;

const stateCommonShape = {
  binding: bindingSchema,
  intent: intentSchema,
  approval: approvalSchema,
  consumed: z.array(consumptionSchema),
  commandReceipts: z.array(commandReceiptSchema),
};

const waitingStateSchema = z.strictObject({
  ...stateCommonShape,
  kind: z.literal("waiting"),
});
const suspendedStateSchema = z.strictObject({
  ...stateCommonShape,
  kind: z.literal("suspended"),
  suspension: suspensionSchema,
});
const eligibilityPendingStateSchema = z.strictObject({
  ...stateCommonShape,
  kind: z.literal("eligibility-pending"),
  work: eligibilityWorkSchema,
});
const dispatchStartedStateSchema = z.strictObject({
  ...stateCommonShape,
  kind: z.literal("dispatch-started"),
  dispatchId: identifierSchema,
});
const outcomeUnknownStateSchema = z.strictObject({
  ...stateCommonShape,
  kind: z.literal("outcome-unknown"),
  dispatchId: identifierSchema,
});
const discardedStateSchema = z.strictObject({
  ...stateCommonShape,
  kind: z.literal("discarded"),
  discardedAt: timeSchema,
});

export const runtimeStateSchema = z.discriminatedUnion("kind", [
  waitingStateSchema,
  suspendedStateSchema,
  eligibilityPendingStateSchema,
  dispatchStartedStateSchema,
  outcomeUnknownStateSchema,
  discardedStateSchema,
]);
export type RuntimeState = z.output<typeof runtimeStateSchema>;

/* -------------------------------------------------------------------------- */
/* Boundary decoders                                                           */
/* -------------------------------------------------------------------------- */

export function decodeIntent(input: unknown): Intent {
  return intentSchema.parse(input);
}

export function decodeBinding(input: unknown): Binding {
  return bindingSchema.parse(input);
}

export function decodeActivationInput(input: unknown): ActivationInput {
  return activationInputSchema.parse(input);
}

export function decodeReviewCommand(input: unknown): ReviewCommand {
  return reviewCommandSchema.parse(input);
}

export function decodeAuthenticatedPrincipal(input: unknown): AuthenticatedPrincipal {
  return authenticatedPrincipalSchema.parse(input);
}

export function decodeRuntimeState(input: unknown): RuntimeState {
  return runtimeStateSchema.parse(input);
}

export function createWaitingState(
  binding: Binding,
  intent: Intent,
  approval: Approval,
): RuntimeState {
  return runtimeStateSchema.parse({
    kind: "waiting",
    binding,
    intent,
    approval,
    consumed: [],
    commandReceipts: [],
  });
}

/* -------------------------------------------------------------------------- */
/* Pure activation transition                                                  */
/* -------------------------------------------------------------------------- */

export type ActivationResult =
  | { kind: "accepted"; state: RuntimeState; outcome: ActivationOutcome }
  | { kind: "duplicate"; state: RuntimeState; original: ActivationOutcome }
  | { kind: "ignored"; state: RuntimeState; reason: "in-progress" | "not-match" }
  | {
      kind: "rejected";
      state: RuntimeState;
      reason:
        | "binding-not-active"
        | "expired-binding"
        | "stale-binding-epoch"
        | "stale-intent-revision"
        | "source-mismatch"
        | "stale-source-boundary"
        | "not-waiting";
    }
  | { kind: "paused-gap"; state: RuntimeState; work: GapRecoveryWork };

function sameSource(left: Source, right: Source): boolean {
  return left.capabilityId === right.capabilityId && left.instance === right.instance;
}

function findConsumed(state: RuntimeState, input: ActivationInput): Consumption | undefined {
  if (input.kind !== "candle") {
    return undefined;
  }
  return state.consumed.find(
    (consumption) =>
      consumption.bindingId === input.bindingId &&
      consumption.bindingEpoch === input.expectedEpoch &&
      sameSource(consumption.source, input.candle.source) &&
      consumption.eventId === input.candle.eventId &&
      consumption.eventRevision === input.candle.eventRevision,
  );
}

function reviewId(binding: Binding, event: Candle): string {
  return `review-${binding.bindingId}-${binding.epoch}-${event.eventId}-r${event.eventRevision}`;
}


function eligibilityWork(
  binding: Binding,
  intent: Intent,
  eventId: string,
): EligibilityWork {
  return {
    kind: "eligibility-check",
    effect: "none",
    workId: `eligibility-${binding.bindingId}-${binding.epoch}-${eventId}`,
    intentId: intent.intentId,
    intentRevision: intent.revision,
    bindingId: binding.bindingId,
    bindingEpoch: binding.epoch,
    eventId,
    requirements: {
      authorization: "pending-authoritative-check",
      preconditions: "pending-authoritative-check",
    },
  };
}

function reviewRequest(
  binding: Binding,
  intent: Intent,
  candle: Candle,
): ReviewRequestWork {
  if (candle.finality.kind !== "closed") {
    throw new Error("reviewRequest requires a closed candle");
  }
  const review: Review = {
    reviewId: reviewId(binding, candle),
    bindingId: binding.bindingId,
    bindingEpoch: binding.epoch,
    intentId: intent.intentId,
    intentRevision: intent.revision,
    eventId: candle.eventId,
    recipientResumeId: binding.recipientResumeId,
    deadline: binding.reviewDeadline,
    reason: "trigger-match",
    selectedEvidence: {
      eventRevision: candle.eventRevision,
      sourceSequence: candle.sourceSequence,
      close: candle.close,
      finalityProofVersion: candle.finality.proof.version,
    },
  };
  return {
    kind: "review-request",
    effect: "none",
    review,
    allowedCommands: ["discard", "keep-suspended", "rearm", "revise", "request-submission"],
  };

}
function commonStateFields(state: RuntimeState) {
  return {
    binding: state.binding,
    intent: state.intent,
    approval: state.approval,
    consumed: state.consumed,
    commandReceipts: state.commandReceipts,
  };
}


export function activate(
  state: RuntimeState,
  input: ActivationInput,
  at: number,
): ActivationResult {
  const providedSource = input.kind === "candle" ? input.candle.source : input.gap.source;
  if (!sameSource(providedSource, state.binding.source)) {
    return { kind: "rejected", state, reason: "source-mismatch" };
  }

  const previous = findConsumed(state, input);
  if (previous !== undefined) {
    return { kind: "duplicate", state, original: previous.outcome };
  }

  if (state.kind !== "waiting") {
    return { kind: "rejected", state, reason: "not-waiting" };
  }
  if (input.bindingId !== state.binding.bindingId) {
    return { kind: "rejected", state, reason: "source-mismatch" };
  }
  if (input.expectedEpoch !== state.binding.epoch) {
    return { kind: "rejected", state, reason: "stale-binding-epoch" };
  }
  if (input.expectedIntentRevision !== state.intent.revision) {
    return { kind: "rejected", state, reason: "stale-intent-revision" };
  }
  if (at < state.binding.validFrom) {
    return { kind: "rejected", state, reason: "binding-not-active" };
  }
  if (at >= state.binding.validUntil) {
    return { kind: "rejected", state, reason: "expired-binding" };
  }

  if (input.kind === "gap") {
    const work: GapRecoveryWork = {
      kind: "gap-recovery",
      effect: "none",
      workId: `gap-${state.binding.bindingId}-${state.binding.epoch}-${input.gap.gapId}`,
      bindingId: state.binding.bindingId,
      bindingEpoch: state.binding.epoch,
      gapId: input.gap.gapId,
      replay: input.gap.replay,
    };
    const nextState = decodeRuntimeState({
      ...commonStateFields(state),
      kind: "suspended",
      suspension: {
        kind: "gap-paused",
        gap: input.gap,
        resumeAfterSequenceExclusive: input.gap.throughSequence,
      },
    });
    return { kind: "paused-gap", state: nextState, work };
  }

  const candle = input.candle;
  if (candle.sourceSequence <= state.binding.sourceStartExclusive) {
    return { kind: "rejected", state, reason: "stale-source-boundary" };
  }
  if (candle.finality.kind === "in-progress") {
    return { kind: "ignored", state, reason: "in-progress" };
  }

  if (
    candle.instrument !== state.binding.predicate.instrument ||
    candle.interval !== state.binding.predicate.interval ||
    !new Decimal(candle.close).greaterThan(new Decimal(state.binding.predicate.threshold))
  ) {
    return { kind: "ignored", state, reason: "not-match" };
  }


  if (state.binding.executionPolicy === "return-to-agent") {
    const work = reviewRequest(state.binding, state.intent, candle);
    const outcome: ActivationOutcome = {
      kind: "review-requested",
      dispatch: "none",
      work,
    };
    const consumption: Consumption = {
      bindingId: state.binding.bindingId,
      bindingEpoch: state.binding.epoch,
      source: candle.source,
      eventId: candle.eventId,
      eventRevision: candle.eventRevision,
      outcome,
    };

    const nextState = decodeRuntimeState({
      ...commonStateFields(state),
      kind: "suspended",
      suspension: { kind: "review-pending", review: work.review },
      consumed: [...state.consumed, consumption],
    });
    return { kind: "accepted", state: nextState, outcome };
  }

  const work = eligibilityWork(state.binding, state.intent, candle.eventId);
  const outcome: ActivationOutcome = {
    kind: "eligibility-requested",
    dispatch: "none",
    work,
  };
  const consumption: Consumption = {
    bindingId: state.binding.bindingId,
    bindingEpoch: state.binding.epoch,
    source: candle.source,
    eventId: candle.eventId,
    eventRevision: candle.eventRevision,
    outcome,
  };
  const nextState = decodeRuntimeState({
    ...commonStateFields(state),
    kind: "eligibility-pending",
    work,
    consumed: [...state.consumed, consumption],
  });
  return { kind: "accepted", state: nextState, outcome };
}

/* -------------------------------------------------------------------------- */
/* Pure review-command transition                                              */
/* -------------------------------------------------------------------------- */

export type ReplyResult =
  | { kind: "accepted"; state: RuntimeState; decision: ReplyDecision }
  | { kind: "duplicate"; state: RuntimeState; original: ReplyDecision }
  | {
      kind: "rejected";
      state: RuntimeState;
      reason:
        | "already-sent"
        | "outcome-unknown"
        | "stale-review"
        | "stale-control"
        | "unauthorized"
        | "review-expired"
        | "idempotency-conflict"
        | "invalid-command";
    };

function reviewControl(
  bindingId: string,
  epoch: number,
  action: "keep-suspended" | "rearm" | "revise" | "request-submission" | "no-reply-expired",
  suffix: string,
): ReviewControlWork {
  return {
    kind: "review-control",
    effect: "none",
    workId: `review-control-${bindingId}-${epoch}-${suffix}`,
    bindingId,
    bindingEpoch: epoch,
    action,
  };
}

function localRetirement(intent: Intent, suffix: string, reason: string): LocalRetirementWork {
  return {
    kind: "local-retirement",
    effect: "none",
    workId: `retire-${intent.intentId}-${suffix}`,
    intentId: intent.intentId,
    reason,
    providerOperation: "none-required-for-unsent-intent",
  };
}

type CommandContext =
  | { kind: "review"; review: Review }
  | { kind: "control"; control: HeldIntentControl };

function commandContext(state: RuntimeState, command: ReviewCommand): CommandContext | undefined {
  if (state.kind !== "suspended") {
    return undefined;
  }
  if (state.suspension.kind === "review-pending") {
    const review = state.suspension.review;
    if (
      command.controlId !== undefined ||
      command.expectedControlRevision !== undefined ||
      command.reviewId !== review.reviewId ||
      command.expectedBindingEpoch !== state.binding.epoch ||
      command.expectedIntentRevision !== state.intent.revision
    ) {
      return undefined;
    }
    return { kind: "review", review };
  }
  if (state.suspension.kind === "held-intent-control") {
    const control = state.suspension.control;
    if (
      command.controlId !== control.controlId ||
      command.expectedControlRevision !== control.controlRevision ||
      command.expectedBindingEpoch !== state.binding.epoch ||
      command.expectedIntentRevision !== state.intent.revision
    ) {
      return undefined;
    }
    return { kind: "control", control };
  }
  return undefined;
}

function normalizedCommandPayload(command: ReviewCommand): string {
  const body = command.body;
  const envelope = [
    command.reviewId,
    command.controlId ?? null,
    command.expectedControlRevision ?? null,
    command.expectedBindingEpoch,
    command.expectedIntentRevision,
  ];
  switch (body.kind) {
    case "discard":
      return JSON.stringify([envelope, "discard", body.reason ?? null]) ?? "";
    case "keep-suspended":
      return JSON.stringify([envelope, "keep-suspended", body.until, body.reason]) ?? "";
    case "rearm":
      return (
        JSON.stringify([
          envelope,
          "rearm",
          [
            body.futureSourceBoundary.source.capabilityId,
            body.futureSourceBoundary.source.instance,
          ],
          body.futureSourceBoundary.afterEventId,
          body.futureSourceBoundary.sequenceExclusive,
          body.validUntil,
          body.reviewDeadline,
        ]) ?? ""
      );
    case "revise":
      return (
        JSON.stringify([
          envelope,
          "revise",
          [
            body.replacement.intentId,
            body.replacement.revision,
            body.replacement.accountScope.accountId,
            body.replacement.accountScope.subAccountId,
            body.replacement.instrument,
            body.replacement.side,
            body.replacement.quantity,
            body.replacement.parameterDigest,
          ],
          [
            body.futureSourceBoundary.source.capabilityId,
            body.futureSourceBoundary.source.instance,
          ],
          body.futureSourceBoundary.afterEventId,
          body.futureSourceBoundary.sequenceExclusive,
          body.validUntil,
          body.reviewDeadline,
        ]) ?? ""
      );
    case "request-submission":
      return JSON.stringify([envelope, "request-submission", body.rationale ?? null]) ?? "";
  }
}

function appendReceipt(
  state: RuntimeState,
  command: ReviewCommand,
  principal: AuthenticatedPrincipal,
  outcome: ReplyDecision,
): CommandReceipt[] {
  return [
    ...state.commandReceipts,
    {
      commandId: command.commandId,
      principalResumeId: principal.resumeId,
      payloadKey: normalizedCommandPayload(command),
      outcome,
    },
  ];
}

export type HeldIntentControlReadResult =
  | { kind: "available"; control: HeldIntentControl }
  | { kind: "unavailable"; reason: "unauthorized" | "not-controlled" | "expired" };

export function readHeldIntentControl(
  state: RuntimeState,
  principal: AuthenticatedPrincipal,
  at: number,
): HeldIntentControlReadResult {
  if (principal.resumeId !== state.binding.recipientResumeId) {
    return { kind: "unavailable", reason: "unauthorized" };
  }
  if (state.kind === "suspended" && state.suspension.kind === "held-intent-control") {
    if (at >= state.suspension.control.retentionUntil) {
      return { kind: "unavailable", reason: "expired" };
    }
    return { kind: "available", control: state.suspension.control };
  }
  return { kind: "unavailable", reason: "not-controlled" };
}

function selectedEvent(context: CommandContext): { eventId: string; sourceSequence: number } {
  if (context.kind === "review") {
    return {
      eventId: context.review.eventId,
      sourceSequence: context.review.selectedEvidence.sourceSequence,
    };
  }
  return {
    eventId: context.control.selectedEventId,
    sourceSequence: context.control.selectedSourceSequence,
  };
}

function validFutureBoundary(
  state: RuntimeState,
  context: CommandContext,
  boundary: SourceBoundary,
  validUntil: number,
  reviewDeadline: number,
  at: number,
): boolean {
  const selected = selectedEvent(context);
  return (
    sameSource(boundary.source, state.binding.source) &&
    boundary.afterEventId === selected.eventId &&
    boundary.sequenceExclusive >= selected.sourceSequence &&
    validUntil > at &&
    reviewDeadline > at &&
    reviewDeadline <= validUntil
  );
}

export function applyReviewCommand(
  state: RuntimeState,
  command: ReviewCommand,
  principal: AuthenticatedPrincipal,
  at: number,
): ReplyResult {
  if (principal.resumeId !== state.binding.recipientResumeId) {
    return { kind: "rejected", state, reason: "unauthorized" };
  }

  const payloadKey = normalizedCommandPayload(command);
  const previous = state.commandReceipts.find((receipt) => receipt.commandId === command.commandId);
  if (previous !== undefined) {
    if (
      previous.principalResumeId === principal.resumeId &&
      previous.payloadKey === payloadKey
    ) {
      return { kind: "duplicate", state, original: previous.outcome };
    }
    return { kind: "rejected", state, reason: "idempotency-conflict" };
  }

  if (state.kind === "dispatch-started") {
    return { kind: "rejected", state, reason: "already-sent" };
  }
  if (state.kind === "outcome-unknown") {
    return { kind: "rejected", state, reason: "outcome-unknown" };
  }

  const context = commandContext(state, command);
  if (context === undefined) {
    if (state.kind === "suspended" && state.suspension.kind === "held-intent-control") {
      return { kind: "rejected", state, reason: "stale-control" };
    }
    return { kind: "rejected", state, reason: "stale-review" };
  }
  const selected = selectedEvent(context);

  if (context.kind === "review" && at >= context.review.deadline) {
    return { kind: "rejected", state, reason: "review-expired" };
  }
  if (context.kind === "control" && at >= context.control.retentionUntil) {
    return { kind: "rejected", state, reason: "stale-control" };
  }

  if (command.body.kind === "discard") {
    const work = localRetirement(
      state.intent,
      command.commandId,
      command.body.reason ?? "explicit-discard",
    );
    const decision: ReplyDecision = { kind: "discarded", effect: "none", work };
    const nextState = decodeRuntimeState({
      ...commonStateFields(state),
      kind: "discarded",
      discardedAt: at,
      commandReceipts: appendReceipt(state, command, principal, decision),
    });
    return { kind: "accepted", state: nextState, decision };
  }

  if (command.body.kind === "keep-suspended") {
    if (
      context.kind !== "review" ||
      command.body.until <= at ||
      command.body.until > state.binding.retentionPolicy.maxUntil
    ) {
      return { kind: "rejected", state, reason: "invalid-command" };
    }
    const control: HeldIntentControl = {
      controlId: `control-${context.review.reviewId}`,
      controlRevision: 1,
      reviewId: context.review.reviewId,
      bindingId: state.binding.bindingId,
      bindingEpoch: state.binding.epoch,
      intentId: state.intent.intentId,
      intentRevision: state.intent.revision,
      selectedEventId: context.review.eventId,
      selectedSourceSequence: context.review.selectedEvidence.sourceSequence,
      retentionUntil: command.body.until,
    };
    const work = reviewControl(
      state.binding.bindingId,
      state.binding.epoch,
      "keep-suspended",
      command.commandId,
    );
    const decision: ReplyDecision = {
      kind: "kept-suspended",
      effect: "none",
      control,
      work,
    };
    const nextState = decodeRuntimeState({
      ...commonStateFields(state),
      kind: "suspended",
      suspension: {
        kind: "held-intent-control",
        control,
        reason: command.body.reason,
      },
      commandReceipts: appendReceipt(state, command, principal, decision),
    });
    return { kind: "accepted", state: nextState, decision };
  }

  if (command.body.kind === "rearm") {
    if (
      !validFutureBoundary(
        state,
        context,
        command.body.futureSourceBoundary,
        command.body.validUntil,
        command.body.reviewDeadline,
        at,
      )
    ) {
      return { kind: "rejected", state, reason: "invalid-command" };
    }
    const binding: Binding = {
      ...state.binding,
      epoch: state.binding.epoch + 1,
      sourceStartAfterEventId: command.body.futureSourceBoundary.afterEventId,
      sourceStartExclusive: command.body.futureSourceBoundary.sequenceExclusive,
      validUntil: command.body.validUntil,
      reviewDeadline: command.body.reviewDeadline,
    };
    const work = reviewControl(binding.bindingId, binding.epoch, "rearm", command.commandId);
    const decision: ReplyDecision = {
      kind: "rearmed",
      effect: "none",
      newEpoch: binding.epoch,
      futureSourceBoundary: command.body.futureSourceBoundary,
      work,
    };
    const nextState = decodeRuntimeState({
      kind: "waiting",
      binding,
      intent: state.intent,
      approval: { kind: "none" },
      consumed: state.consumed,
      commandReceipts: appendReceipt(state, command, principal, decision),
    });
    return { kind: "accepted", state: nextState, decision };
  }

  if (command.body.kind === "revise") {
    if (
      command.body.replacement.intentId !== state.intent.intentId ||
      command.body.replacement.revision <= state.intent.revision ||
      !validFutureBoundary(
        state,
        context,
        command.body.futureSourceBoundary,
        command.body.validUntil,
        command.body.reviewDeadline,
        at,
      )
    ) {
      return { kind: "rejected", state, reason: "invalid-command" };
    }
    const binding: Binding = {
      ...state.binding,
      epoch: state.binding.epoch + 1,
      intentRevision: command.body.replacement.revision,
      sourceStartAfterEventId: command.body.futureSourceBoundary.afterEventId,
      sourceStartExclusive: command.body.futureSourceBoundary.sequenceExclusive,
      validUntil: command.body.validUntil,
      reviewDeadline: command.body.reviewDeadline,
    };
    const work = reviewControl(binding.bindingId, binding.epoch, "revise", command.commandId);
    const decision: ReplyDecision = {
      kind: "revised",
      effect: "none",
      newEpoch: binding.epoch,
      newIntentRevision: command.body.replacement.revision,
      futureSourceBoundary: command.body.futureSourceBoundary,
      work,
    };
    const nextState = decodeRuntimeState({
      kind: "waiting",
      binding,
      intent: command.body.replacement,
      approval: { kind: "none" },
      consumed: state.consumed,
      commandReceipts: appendReceipt(state, command, principal, decision),
    });
    return { kind: "accepted", state: nextState, decision };
  }

  const work = eligibilityWork(state.binding, state.intent, selected.eventId);
  const decision: ReplyDecision = {
    kind: "submission-requested",
    effect: "none",
    work,
  };
  const nextState = decodeRuntimeState({
    ...commonStateFields(state),
    kind: "eligibility-pending",
    work,
    commandReceipts: appendReceipt(state, command, principal, decision),
  });
  return { kind: "accepted", state: nextState, decision };
}

/* -------------------------------------------------------------------------- */
/* Pure no-reply deadline transition                                           */
/* -------------------------------------------------------------------------- */

export type ReviewDeadlineResult =
  | { kind: "not-applicable"; state: RuntimeState }
  | { kind: "not-due"; state: RuntimeState }
  | {
      kind: "expired";
      state: RuntimeState;
      policy: "keep-suspended" | "discard";
      work: WorkIntent;
    };

export function expireReview(state: RuntimeState, at: number): ReviewDeadlineResult {
  if (state.kind !== "suspended" || state.suspension.kind !== "review-pending") {
    return { kind: "not-applicable", state };
  }
  const review = state.suspension.review;
  if (at < review.deadline) {
    return { kind: "not-due", state };
  }

  if (state.binding.noReplyPolicy === "keep-suspended") {
    const work = reviewControl(
      state.binding.bindingId,
      state.binding.epoch,
      "no-reply-expired",
      review.reviewId,
    );
    const nextState = decodeRuntimeState({
      ...state,
      suspension: {
        kind: "review-expired",
        reviewId: review.reviewId,
        deadline: review.deadline,
        policy: "keep-suspended",
      },
    });
    return { kind: "expired", state: nextState, policy: "keep-suspended", work };
  }

  const work = localRetirement(state.intent, review.reviewId, "no-reply-deadline");
  const nextState = decodeRuntimeState({
    ...commonStateFields(state),
    kind: "discarded",
    discardedAt: at,
  });
  return { kind: "expired", state: nextState, policy: "discard", work };
}

/* -------------------------------------------------------------------------- */
/* Fixed executable scenario driver                                            */
/* -------------------------------------------------------------------------- */

type Printable = ActivationResult | ReplyResult | ReviewDeadlineResult | HeldIntentControlReadResult;

type CandleFinality = Candle["finality"]["kind"];

function report(label: string, value: Printable): void {
  console.log(`${label}\n${JSON.stringify(value, null, 2)}`);
}

function expectAcceptedActivation(
  result: ActivationResult,
  label: string,
): Extract<ActivationResult, { kind: "accepted" }> {
  if (result.kind !== "accepted") {
    throw new Error(`${label}: expected accepted activation, got ${result.kind}`);
  }
  return result;
}

function expectAcceptedReply(
  result: ReplyResult,
  label: string,
): Extract<ReplyResult, { kind: "accepted" }> {
  if (result.kind !== "accepted") {
    throw new Error(`${label}: expected accepted reply, got ${result.kind}`);
  }
  return result;
}

function expectControl(
  result: HeldIntentControlReadResult,
  label: string,
): HeldIntentControl {
  if (result.kind !== "available") {
    throw new Error(`${label}: expected current HeldIntentControl, got ${result.reason}`);
  }
  return result.control;
}

function fixedIntent(): Intent {
  return decodeIntent({
    intentId: "intent-demo",
    revision: 1,
    accountScope: { accountId: "account-demo", subAccountId: "sub-demo" },
    instrument: "btc-usd",
    side: "buy",
    quantity: "0.25",
    parameterDigest: "params-v1",
  });
}

function fixedBinding(executionPolicy: Binding["executionPolicy"]): Binding {
  return decodeBinding({
    bindingId: executionPolicy === "return-to-agent" ? "binding-review" : "binding-auto",
    epoch: 1,
    intentId: "intent-demo",
    intentRevision: 1,
    source: { capabilityId: "candle-push", instance: "fixed-source" },
    predicate: {
      kind: "close-above",
      instrument: "btc-usd",
      interval: "5m",
      threshold: "100",
    },
    sourceStartAfterEventId: "genesis",
    sourceStartExclusive: 0,
    validFrom: 0,
    validUntil: 1000,
    reviewDeadline: 300,
    retentionPolicy: { kind: "explicit", maxUntil: 2000 },
    executionPolicy,
    recipientResumeId: "resume-owner",
    noReplyPolicy: "keep-suspended",
  });
}

function fixedCandle(
  eventId: string,
  sourceSequence: number,
  finality: CandleFinality,
  close: string,
  bindingId = "binding-review",
  expectedEpoch = 1,
  expectedIntentRevision = 1,
  eventRevision = 1,
  sourceInstance = "fixed-source",
): ActivationInput {
  return decodeActivationInput({
    kind: "candle",
    bindingId,
    expectedEpoch,
    expectedIntentRevision,
    candle: {
      eventId,
      eventRevision,
      sourceSequence,
      source: { capabilityId: "candle-push", instance: sourceInstance },
      instrument: "btc-usd",
      interval: "5m",
      openedAt: 0,
      closedAt: 99,
      close,
      finality:
        finality === "closed"
          ? { kind: "closed", proof: { kind: "provider-event", version: "fixed-finality-v1" } }
          : { kind: "in-progress" },
    },
  });
}

function fixedReviewCommand(
  commandId: string,
  reviewId: string,
  body: ReviewCommand["body"],
  expectedBindingEpoch = 1,
  expectedIntentRevision = 1,
  control?: HeldIntentControl,
): ReviewCommand {
  const envelope = {
    commandId,
    reviewId,
    expectedBindingEpoch,
    expectedIntentRevision,
    body,
  };
  if (control === undefined) {
    return decodeReviewCommand(envelope);
  }
  return decodeReviewCommand({
    ...envelope,
    controlId: control.controlId,
    expectedControlRevision: control.controlRevision,
  });
}

function runScenario(): void {
  const intent = fixedIntent();
  const reviewBinding = fixedBinding("return-to-agent");
  const approval = approvalSchema.parse({
    kind: "bound",
    approvalId: "approval-v1",
    intentRevision: 1,
    expiresAt: 200,
  });
  const initial = createWaitingState(reviewBinding, intent, approval);
  const reviewId = "review-binding-review-1-event-1-r1";

  const inProgress = activate(
    initial,
    fixedCandle("event-1", 1, "in-progress", "110"),
    100,
  );
  report("in-progress candle is ignored", inProgress);

  const closed = expectAcceptedActivation(
    activate(initial, fixedCandle("event-1", 1, "closed", "110"), 101),
    "closed candle",
  );
  report("closed candle ReturnToAgent creates review work", closed);

  const duplicate = activate(
    closed.state,
    fixedCandle("event-1", 1, "closed", "110"),
    102,
  );
  report("duplicate event id returns original outcome", duplicate);
  const wrongSource = activate(
    closed.state,
    fixedCandle(
      "event-1",
      1,
      "closed",
      "110",
      "binding-review",
      1,
      1,
      1,
      "different-source",
    ),
    102,
  );
  if (
    wrongSource.kind !== "rejected" ||
    wrongSource.reason !== "source-mismatch" ||
    Object.prototype.hasOwnProperty.call(wrongSource, "original")
  ) {
    throw new Error("wrong source must reject without exposing the original outcome");
  }
  report("wrong source is rejected without duplicate outcome", wrongSource);

  const staleRevision = activate(
    initial,
    fixedCandle("event-2", 2, "closed", "120", "binding-review", 1, 2),
    110,
  );
  report("stale intent revision is rejected", staleRevision);

  const expiredBinding = decodeBinding({
    ...reviewBinding,
    validUntil: 150,
    reviewDeadline: 140,
  });
  const expired = activate(
    createWaitingState(expiredBinding, intent, approval),
    fixedCandle("event-2", 2, "closed", "120"),
    150,
  );
  report("expired binding is rejected", expired);

  const principal = decodeAuthenticatedPrincipal({
    kind: "alice-session",
    resumeId: "resume-owner",
  });
  const keep = expectAcceptedReply(
    applyReviewCommand(
      closed.state,
      fixedReviewCommand("command-keep", reviewId, {
        kind: "keep-suspended",
        until: 1500,
        reason: "wait-for-human-window",
      }),
      principal,
      120,
    ),
    "KeepSuspended",
  );
  report("KeepSuspended returns ongoing HeldIntentControl", keep);

  const controlRead = readHeldIntentControl(keep.state, principal, 121);
  report("ReadHeldIntentControl returns current control", controlRead);
  const control = expectControl(controlRead, "ReadHeldIntentControl");

  const staleOriginalReview = applyReviewCommand(
    keep.state,
    fixedReviewCommand("command-old-review", reviewId, {
      kind: "discard",
      reason: "old-review-token",
    }),
    principal,
    130,
  );
  report("old review token after KeepSuspended is rejected", staleOriginalReview);

  const rearmBehindBoundary = applyReviewCommand(
    keep.state,
    fixedReviewCommand(
      "command-rearm-behind",
      reviewId,
      {
        kind: "rearm",
        futureSourceBoundary: {
          source: { capabilityId: "candle-push", instance: "fixed-source" },
          afterEventId: "event-1",
          sequenceExclusive: 0,
        },
        validUntil: 2000,
        reviewDeadline: 1500,
      },
      1,
      1,
      control,
    ),
    principal,
    130,
  );
  report("Rearm behind the selected source boundary is rejected", rearmBehindBoundary);

  const rearm = expectAcceptedReply(
    applyReviewCommand(
      keep.state,
      fixedReviewCommand(
        "command-rearm",
        reviewId,
        {
          kind: "rearm",
          futureSourceBoundary: {
            source: { capabilityId: "candle-push", instance: "fixed-source" },
            afterEventId: "event-1",
            sequenceExclusive: 1,
          },
          validUntil: 2000,
          reviewDeadline: 1500,
        },
        1,
        1,
        control,
      ),
      principal,
      130,
    ),
    "Rearm from current control",
  );
  report("Rearm creates a new epoch and explicit future source boundary", rearm);

  const oldReply = applyReviewCommand(
    rearm.state,
    fixedReviewCommand("command-old-reply", reviewId, {
      kind: "discard",
      reason: "late-old-reply",
    }),
    principal,
    140,
  );
  report("old AI reply after Rearm is rejected", oldReply);

  const replayedConsumedEvent = activate(
    rearm.state,
    fixedCandle("event-1", 1, "closed", "110", "binding-review", 2),
    140,
  );
  report("Rearm boundary excludes the already consumed event", replayedConsumedEvent);

  const nextSourceEvent = expectAcceptedActivation(
    activate(
      rearm.state,
      fixedCandle("event-2", 2, "closed", "120", "binding-review", 2),
      150,
    ),
    "next source event after rearm boundary",
  );
  report("next source event after boundary is accepted", nextSourceEvent);

  const discardFromControl = expectAcceptedReply(
    applyReviewCommand(
      keep.state,
      fixedReviewCommand(
        "command-discard-control",
        reviewId,
        { kind: "discard", reason: "not-needed" },
        1,
        1,
        control,
      ),
      principal,
      130,
    ),
    "Discard from current control",
  );
  report("Discard retires unsent local work without provider cancel", discardFromControl);

  const revisedIntent = decodeIntent({
    ...intent,
    revision: 2,
    quantity: "0.30",
    parameterDigest: "params-v2",
  });
  const reviseFromControl = expectAcceptedReply(
    applyReviewCommand(
      keep.state,
      fixedReviewCommand(
        "command-revise-control",
        reviewId,
        {
          kind: "revise",
          replacement: revisedIntent,
          futureSourceBoundary: {
            source: { capabilityId: "candle-push", instance: "fixed-source" },
            afterEventId: "event-1",
            sequenceExclusive: 1,
          },
          validUntil: 2000,
          reviewDeadline: 1500,
        },
        1,
        1,
        control,
      ),
      principal,
      130,
    ),
    "Revise from current control",
  );
  report("Revise uses explicit replacement intent", reviseFromControl);

  const requestSubmission = applyReviewCommand(
    closed.state,
    fixedReviewCommand("command-request-submission", reviewId, {
      kind: "request-submission",
      rationale: "request-current-eligibility",
    }),
    principal,
    120,
  );
  report("RequestSubmission creates eligibility work only", requestSubmission);

  const duplicateKeep = applyReviewCommand(
    keep.state,
    fixedReviewCommand("command-keep", reviewId, {
      kind: "keep-suspended",
      until: 1500,
      reason: "wait-for-human-window",
    }),
    principal,
    121,
  );
  report("duplicate command id returns original reply decision", duplicateKeep);

  const idempotencyConflict = applyReviewCommand(
    keep.state,
    fixedReviewCommand("command-keep", reviewId, {
      kind: "discard",
      reason: "same-id-different-body",
    }),
    principal,
    121,
  );
  report("same command id with different payload is rejected", idempotencyConflict);

  const autoBinding = fixedBinding("submit-under-policy");
  const autoState = createWaitingState(autoBinding, intent, approval);
  const autoSubmit = activate(
    autoState,
    fixedCandle("auto-event-1", 1, "closed", "110", "binding-auto"),
    101,
  );
  report("submit-under-policy creates eligibility work only", autoSubmit);

  const gap = activate(
    initial,
    decodeActivationInput({
      kind: "gap",
      bindingId: "binding-review",
      expectedEpoch: 1,
      expectedIntentRevision: 1,
      gap: {
        gapId: "gap-1",
        source: { capabilityId: "candle-push", instance: "fixed-source" },
        fromSequence: 2,
        throughSequence: 3,
        reason: "disconnect",
        replay: "unavailable",
      },
    }),
    150,
  );
  report("unreplayable gap pauses the binding", gap);

  const noReply = expireReview(closed.state, 300);
  report("no-reply deadline follows frozen keep-suspended policy", noReply);

  const sent = decodeRuntimeState({
    ...commonStateFields(closed.state),
    kind: "dispatch-started",
    dispatchId: "dispatch-demo",
  });
  const unknown = decodeRuntimeState({
    ...commonStateFields(closed.state),
    kind: "outcome-unknown",
    dispatchId: "dispatch-demo",
  });
  const discardAfterSend = applyReviewCommand(
    sent,
    fixedReviewCommand("command-discard-sent", reviewId, {
      kind: "discard",
      reason: "too-late",
    }),
    principal,
    160,
  );
  report("sent state rejects draft discard", discardAfterSend);
  const rearmAfterUnknown = applyReviewCommand(
    unknown,
    fixedReviewCommand("command-rearm-unknown", reviewId, {
      kind: "rearm",
      futureSourceBoundary: {
        source: { capabilityId: "candle-push", instance: "fixed-source" },
        afterEventId: "event-1",
        sequenceExclusive: 1,
      },
      validUntil: 2000,
      reviewDeadline: 1500,
    }),
    principal,
    160,
  );
  report("outcome-unknown state rejects draft rearm", rearmAfterUnknown);
}

const invokedScript = process.argv[1];
if (invokedScript !== undefined && import.meta.url === pathToFileURL(invokedScript).href) {
  runScenario();
}
