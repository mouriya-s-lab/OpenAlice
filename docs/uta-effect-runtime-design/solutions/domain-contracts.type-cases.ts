/**
 * Compile-only consumers for the schema-first composition specimen.
 *
 * This file is intentionally not a runtime test. Each @ts-expect-error marks a
 * consumer-visible type rejection; the executable boundary probes live in
 * composition-example.ts.
 */
import { z } from "zod";
import {
  type AdmissionPort,
  type CapabilityOutcome,
  type CapabilityRequirement,
  type ControlledCapability,
  type PullCapability,
  type PushFrame,
  type SemanticConstraint,
  publicScopeSchema,
  definePull,
  definePush,
  limitPriceSemanticConstraint,
  orderBaseSchema,
  withCandleExtension,
  withLimitOrderKind,
  withLimitPrice,
  withProviderExtension,
  withQuantity,
  withTransaction,
} from "./domain-contracts.js";

const orderExtensionSchema = z.strictObject({
  providerOrderType: z.literal("fixture-limit"),
  postOnly: z.boolean(),
});
const exactOrderSchema = withProviderExtension(
  withLimitPrice(withQuantity(withLimitOrderKind(orderBaseSchema))),
  orderExtensionSchema,
);
type ExactOrderInput = z.input<typeof exactOrderSchema>;
type ExactOrder = z.output<typeof exactOrderSchema>;

const validOrder: ExactOrderInput = {
  scope: { accountId: "account", subAccountId: "main" },
  instrument: { nativeId: "native", symbol: "BTC/USD" },
  kind: "limit",
  side: "buy",
  timeInForce: "gtc",
  quantity: "1.25",
  limitPrice: "100.50",
  providerOrderType: "fixture-limit",
  postOnly: true,
};

// @ts-expect-error A composed limit input cannot omit its required limit price.
const missingComposedLimit: ExactOrderInput = { ...validOrder, limitPrice: undefined };
// @ts-expect-error The provider extension is exact; another provider value is not accepted.
const wrongProviderExtension: ExactOrderInput = { ...validOrder, providerOrderType: "other" };
// @ts-expect-error Account order facts require an explicit scope; no default account exists.
const missingOrderScope: ExactOrderInput = { ...validOrder, scope: undefined };

const richCandleExtensionSchema = z.strictObject({
  vwap: z.number().finite(),
  tradeCount: z.number().int().nonnegative(),
});
const richCandleSchema = withCandleExtension(richCandleExtensionSchema);
const candlePageSchema = z.strictObject({
  items: z.array(richCandleSchema),
  nextCursor: z.string().nullable(),
});
type CandlePage = z.output<typeof candlePageSchema>;

const wrongCandleOutput: CandlePage = {
  items: [
    // @ts-expect-error A Candle extension is part of the inferred output, not an open map.
    {
      instrument: { nativeId: "native", symbol: "BTC/USD" },
      interval: "5m",
      openedAt: 1,
      temporalProjection: { tag: "unknown", reason: "no temporal evidence" },
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: {
        tag: "present",
        amount: "0",
        measure: {
          basis: "traded-quantity",
          unit: "instrument-native",
          evidence: {
            tag: "local-observation",
            operation: "type-case",
            version: "1",
            sourceEvidence: { tag: "known", identity: "type-case" },
          },
        },
      },
      finality: { tag: "unknown", reason: "no closure evidence" },
      revision: { tag: "original" },
      evidence: {
        tag: "local-observation",
        operation: "type-case",
        version: "1",
        sourceEvidence: { tag: "known", identity: "type-case" },
      },
    },
  ],
  nextCursor: null,
};

const candleQuerySchema = z.strictObject({
  scope: publicScopeSchema,
  instrument: z.string().min(1),
});
const candleErrorSchema = z.strictObject({
  tag: z.literal("candle-error"),
  reason: z.string().min(1),
});
const candleRequirements = [
  { resource: "market-data", permission: "read" },
] satisfies readonly CapabilityRequirement[];
const candleConstraint: SemanticConstraint = {
  id: "candle.example",
  version: 1,
  description: "Compile-case semantic constraint.",
};

const candleCapability = definePull({
  capabilityId: "cases.candle.pull",
  path: ["cases", "candle"],
  description: "Compile-case Candle capability.",
  schemaVersion: 1,
  inputSchema: candleQuerySchema,
  outputSchema: candlePageSchema,
  errorSchema: candleErrorSchema,
  effect: "read",
  semanticConstraints: [candleConstraint],
  requirements: candleRequirements,
  source: { language: "typescript", identity: "domain-contracts.type-cases.ts", version: "1" },
  availability: { tag: "available" },
  handler: async () => ({ tag: "output", value: { items: [], nextCursor: null } }),
});

const orderErrorSchema = z.strictObject({
  tag: z.literal("order-error"),
  reason: z.string().min(1),
});
const orderRequirements: readonly [{ readonly resource: "order-admission"; readonly permission: "submit-intent" }] = [
  { resource: "order-admission", permission: "submit-intent" },
];
const orderIntentSchema = z.strictObject({
  intentId: z.string().min(1),
  order: exactOrderSchema,
});
const orderCapability = definePull({
  capabilityId: "cases.order.intent",
  path: ["cases", "order"],
  description: "Compile-case exact order intent capability.",
  schemaVersion: 1,
  inputSchema: exactOrderSchema,
  outputSchema: orderIntentSchema,
  errorSchema: orderErrorSchema,
  effect: "write-intent",
  semanticConstraints: [limitPriceSemanticConstraint],
  requirements: orderRequirements,
  source: { language: "typescript", identity: "domain-contracts.type-cases.ts", version: "1" },
  availability: { tag: "available" },
  handler: async (input) => ({
    tag: "output",
    value: { intentId: input.instrument.symbol, order: input },
  }),
});

// @ts-expect-error A PullCapability keeps its exact input/output/error schemas; it cannot become Candle by assignment.
const schemaMismatch: PullCapability<typeof candleQuerySchema, typeof candlePageSchema, typeof candleErrorSchema> = orderCapability;

const validOrderOutcome: CapabilityOutcome<ExactOrder, z.output<typeof orderErrorSchema>> = {
  tag: "output",
  value: validOrder,
};
const wrongOutputOutcome: CapabilityOutcome<z.output<typeof orderIntentSchema>, z.output<typeof orderErrorSchema>> = {
  tag: "output",
  // @ts-expect-error A handler output must match the declared order intent schema, not a Candle page.
  value: { items: [], nextCursor: null },
};
const wrongErrorOutcome: CapabilityOutcome<z.output<typeof orderIntentSchema>, z.output<typeof orderErrorSchema>> = {
  tag: "error",
  // @ts-expect-error A declared domain error cannot be replaced with another error shape.
  error: { tag: "candle-error", reason: "wrong schema" },
};

const orderInputSchema = exactOrderSchema;

const admission: AdmissionPort<z.output<typeof orderIntentSchema>, z.output<typeof orderErrorSchema>> = {
  async admit(intent) {
    return { tag: "accepted", intent };
  },
};
const controlled = withTransaction(orderCapability, admission);
void validOrderOutcome;

// @ts-expect-error The controlled wrapper's public surface has no raw dispatch method.
controlled.dispatch;

// The wrapper's resource and error parameters remain exact; erasing either is rejected.
const exactControlled: ControlledCapability<
  typeof orderInputSchema,
  typeof orderIntentSchema,
  typeof orderErrorSchema,
  typeof orderRequirements
> = controlled;
// @ts-expect-error A read-only/no-resource wrapper is not the same capability contract.
const erasedRequirements: ControlledCapability<
  typeof orderInputSchema,
  typeof orderIntentSchema,
  typeof orderErrorSchema,
  readonly []
> = exactControlled;
// @ts-expect-error A wrapper with a different error schema is not assignable.
const erasedError: ControlledCapability<
  typeof orderInputSchema,
  typeof orderIntentSchema,
  typeof candleErrorSchema,
  typeof orderRequirements
> = exactControlled;
void erasedRequirements;
void erasedError;

const pushErrorSchema = z.strictObject({ tag: z.literal("stream-error") });
const pushCapability = definePush({
  capabilityId: "cases.candle.push",
  path: ["cases", "stream"],
  description: "Compile-case push capability.",
  schemaVersion: 1,
  inputSchema: candleQuerySchema,
  outputSchema: richCandleSchema,
  errorSchema: pushErrorSchema,
  effect: "read",
  semanticConstraints: [],
  requirements: candleRequirements,
  source: { language: "typescript", identity: "domain-contracts.type-cases.ts", version: "1" },
  availability: { tag: "available" },
  handler: async function* () {
    yield { tag: "control", control: { tag: "started", subscriptionId: "case" } };
  },
});
// @ts-expect-error Push and pull delivery are distinct capability contracts.
const pushAsPull: PullCapability<typeof candleQuerySchema, typeof richCandleSchema, typeof pushErrorSchema> = pushCapability;
const invalidControlFrame: PushFrame<z.output<typeof richCandleSchema>, z.output<typeof pushErrorSchema>> = {
  tag: "control",
  control: {
    tag: "cancelled",
    // @ts-expect-error Push control variants are closed and lifecycle/error fields cannot be erased.
    reason: "anything",
  },
};
void pushAsPull;
void invalidControlFrame;

