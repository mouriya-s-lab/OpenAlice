/**
 * Executable conformance specimen for the schema-first composition contract.
 *
 * Every provider below is local and deterministic. The Python provider is a
 * fixture process, not vendor evidence and never receives credentials or makes
 * network/trading calls.
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  type AdmissionPort,
  type CapabilityCli,
  type CapabilityRequirement,
  type CapabilityOutcome,
  type PushFrame,
  type SemanticConstraint,
  createCapabilityCli,
  createCapabilityTree,
  definePull,
  definePush,
  instrumentSchema,
  jsonValueSchema,
  limitPriceSemanticConstraint,
  newsGroupSchema,
  newsSchema,
  orderBaseSchema,
  publicScopeSchema,
  withCandleExtension,
  withLimitPrice,
  withLimitOrderKind,
  withProviderExtension,
  withTransaction,
  withQuantity,
} from "./domain-contracts.js";

const fixtureSource = {
  language: "typescript",
  identity: "composition-example.ts",
  version: "fixture-1",
};

const fixtureMarketRequirements = [
  { resource: "fixture-market-data", permission: "read" },
] satisfies readonly CapabilityRequirement[];

const fixtureCandleConstraint: SemanticConstraint = {
  id: "candle.facts-and-evidence-explicit",
  version: 1,
  description: "A frame carries measured volume, explicit temporal projection, finality, revision, and evidence; unavailable facts remain variants.",
};

export const richCandleExtensionSchema = z.strictObject({
  vwap: z.number().finite(),
  tradeCount: z.number().int().nonnegative(),
  session: z.discriminatedUnion("tag", [
    z.strictObject({ tag: z.literal("regular") }),
    z.strictObject({ tag: z.literal("extended"), venue: z.string().trim().min(1) }),
  ]),
  correction: z.discriminatedUnion("tag", [
    z.strictObject({ tag: z.literal("none") }),
    z.strictObject({ tag: z.literal("replaces"), sourceSequence: z.number().int().nonnegative() }),
  ]),
});

export const richCandleSchema = withCandleExtension(richCandleExtensionSchema);
export type RichCandle = z.output<typeof richCandleSchema>;

const fixtureInstrument = instrumentSchema.parse({ nativeId: "fixture-btc", symbol: "BTC/USD" });
const fixtureCandleEvidence = {
  tag: "local-observation",
  operation: "composition-fixture.candle",
  version: "1",
  sourceEvidence: { tag: "known", identity: "composition-fixture-candles" },
};
const fixtureVolumeMeasure = {
  basis: "traded-quantity",
  unit: "instrument-native",
  evidence: {
    tag: "local-observation",
    operation: "composition-fixture.volume",
    version: "1",
    sourceEvidence: { tag: "known", identity: "composition-fixture-volume" },
  },
};
const fixtureUnknownTemporal = {
  tag: "unknown",
  reason: "fixture has no provider temporal-boundary evidence",
};

const fixtureCandles = z.array(richCandleSchema).parse([
  {
    instrument: fixtureInstrument,
    interval: "5m",
    openedAt: 1_757_000_000_000,
    temporalProjection: fixtureUnknownTemporal,
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume: { tag: "present", amount: "12.5", measure: fixtureVolumeMeasure },
    finality: { tag: "unknown", reason: "fixture has no provider closure proof" },
    revision: { tag: "original" },
    evidence: fixtureCandleEvidence,
    vwap: 100.25,
    tradeCount: 14,
    session: { tag: "regular" },
    correction: { tag: "none" },
  },
  {
    instrument: fixtureInstrument,
    interval: "5m",
    openedAt: 1_757_000_300_000,
    temporalProjection: fixtureUnknownTemporal,
    open: 100.5,
    high: 102,
    low: 100,
    close: 101.5,
    volume: { tag: "present", amount: "0", measure: fixtureVolumeMeasure },
    finality: { tag: "open" },
    revision: { tag: "original" },
    evidence: fixtureCandleEvidence,
    vwap: 101.1,
    tradeCount: 0,
    session: { tag: "extended", venue: "fixture" },
    correction: { tag: "none" },
  },
  {
    instrument: fixtureInstrument,
    interval: "5m",
    openedAt: 1_757_000_600_000,
    temporalProjection: fixtureUnknownTemporal,
    open: 101.5,
    high: 102,
    low: 100.75,
    close: 101,
    volume: { tag: "present", amount: "8.75", measure: fixtureVolumeMeasure },
    finality: { tag: "unknown", reason: "correction has no provider closure proof" },
    revision: { tag: "correction", supersedes: "fixture-candle-2" },
    evidence: fixtureCandleEvidence,
    vwap: 101.35,
    tradeCount: 9,
    session: { tag: "regular" },
    correction: { tag: "replaces", sourceSequence: 1 },
  },
]);

export const fixtureCandleQuerySchema = z.strictObject({
  scope: publicScopeSchema,
  instrument: z.string().trim().min(1),
  interval: z.string().trim().min(1),
  limit: z.number().int().min(1).max(3),
  cursor: z.string().nullable(),
});
const fixtureCandlePageSchema = z.strictObject({
  items: z.array(richCandleSchema),
  nextCursor: z.string().nullable(),
});
const fixtureCandleErrorSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("no-data"), instrument: z.string().min(1) }),
  z.strictObject({ tag: z.literal("aborted"), reason: z.string().min(1) }),
]);

export const fixtureCandlePull = definePull({
  capabilityId: "fixture.market.candles.pull",
  path: ["fixture", "market", "candles"],
  description: "Finite deterministic Candle page from local fixture data.",
  schemaVersion: 1,
  inputSchema: fixtureCandleQuerySchema,
  outputSchema: fixtureCandlePageSchema,
  errorSchema: fixtureCandleErrorSchema,
  effect: "read",
  semanticConstraints: [fixtureCandleConstraint],
  requirements: fixtureMarketRequirements,
  source: fixtureSource,
  availability: { tag: "available" },
  handler: async (
    input,
    signal,
  ): Promise<CapabilityOutcome<z.output<typeof fixtureCandlePageSchema>, z.output<typeof fixtureCandleErrorSchema>>> => {
    if (signal.aborted) return { tag: "error", error: { tag: "aborted", reason: "query cancelled" } };
    const items = fixtureCandles.filter(
      (candle) => candle.instrument.symbol === input.instrument && candle.interval === input.interval,
    ).slice(0, input.limit);
    if (items.length === 0) return { tag: "error", error: { tag: "no-data", instrument: input.instrument } };
    return { tag: "output", value: { items, nextCursor: null } };
  },
});

const fixtureStreamInputSchema = z.strictObject({
  scope: publicScopeSchema,
  instrument: z.string().trim().min(1),
  interval: z.string().trim().min(1),
  count: z.number().int().min(1).max(8).nullable(),
  delayMs: z.number().int().min(1).max(50),
});
const fixtureStreamErrorSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("no-data"), instrument: z.string().min(1) }),
  z.strictObject({ tag: z.literal("aborted"), reason: z.string().min(1) }),
]);

function waitForDelay(delayMs: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve(true);
    }, delayMs);
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      resolve(false);
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

export const fixtureCandlePush = definePush({
  capabilityId: "fixture.market.candles.push",
  path: ["fixture", "market", "candle-stream"],
  description: "Pushes deterministic Candle data; count selects finite or continuous lifecycle.",
  schemaVersion: 1,
  inputSchema: fixtureStreamInputSchema,
  outputSchema: richCandleSchema,
  errorSchema: fixtureStreamErrorSchema,
  effect: "read",
  semanticConstraints: [fixtureCandleConstraint],
  requirements: fixtureMarketRequirements,
  source: fixtureSource,
  availability: { tag: "available" },
  handler: async function* (
    input,
    signal,
  ): AsyncIterable<PushFrame<z.output<typeof richCandleSchema>, z.output<typeof fixtureStreamErrorSchema>>> {
    const items = fixtureCandles.filter(
      (candle) => candle.instrument.symbol === input.instrument && candle.interval === input.interval,
    );
    yield { tag: "control", control: { tag: "started", subscriptionId: "fixture-candle-stream" } };
    if (items.length === 0) {
      yield { tag: "error", error: { tag: "no-data", instrument: input.instrument } };
      return;
    }
    const count = input.count;
    let sequence = 0;
    while (count === null || sequence < count) {
      if (!(await waitForDelay(input.delayMs, signal))) return;
      const value = items[sequence % items.length];
      if (value === undefined) return;
      yield { tag: "data", sequence, value };
      sequence += 1;
    }
    if (!signal.aborted) {
      yield { tag: "control", control: { tag: "completed", reason: "source-exhausted" } };
    }
  },
});

const fixtureNewsRequirements = [
  { resource: "fixture-news", permission: "read" },
] satisfies readonly CapabilityRequirement[];
const fixtureNewsQuerySchema = z.strictObject({
  scope: publicScopeSchema,
  source: z.string().trim().min(1),
});
const fixtureNewsOutputSchema = newsGroupSchema(newsSchema);
const fixtureNewsErrorSchema = z.strictObject({
  tag: z.literal("no-headlines"),
  source: z.string().trim().min(1),
});
const fixtureNews = newsSchema.parse({
  id: "fixture-news-1",
  source: "local-fixture",
  publishedAt: 1_757_000_000_000,
  fetchedAt: 1_757_000_001_000,
  headline: "Deterministic local headline",
  body: "This article is fixture data, not vendor evidence.",
  status: "active",
  correction: { tag: "none" },
});

export const fixtureNewsPull = definePull({
  capabilityId: "fixture.news.headlines.pull",
  path: ["fixture", "news", "headlines"],
  description: "Finite local NewsGroup; source identity and correction status are retained.",
  schemaVersion: 1,
  inputSchema: fixtureNewsQuerySchema,
  outputSchema: fixtureNewsOutputSchema,
  errorSchema: fixtureNewsErrorSchema,
  effect: "read",
  semanticConstraints: [],
  requirements: fixtureNewsRequirements,
  source: fixtureSource,
  availability: { tag: "available" },
  handler: async (
    input,
  ): Promise<CapabilityOutcome<z.output<typeof fixtureNewsOutputSchema>, z.output<typeof fixtureNewsErrorSchema>>> => {
    if (input.source !== fixtureNews.source) return { tag: "error", error: { tag: "no-headlines", source: input.source } };
    return {
      tag: "output",
      value: {
        groupId: "fixture-news-group",
        label: "Local fixture headlines",
        selection: { tag: "all" },
        members: [fixtureNews],
      },
    };
  },
});

/* A deliberately broken local provider proves output validation at the outer boundary. */
const invalidOutputSchema = z.strictObject({ ok: z.literal(true) });
const invalidOutputErrorSchema = z.strictObject({ tag: z.literal("never") });
export const invalidOutputCapability = definePull({
  capabilityId: "fixture.diagnostic.invalid-output",
  path: ["fixture", "diagnostic", "invalid-output"],
  description: "Intentional conformance probe: provider mutates a value after schema construction.",
  schemaVersion: 1,
  inputSchema: z.strictObject({}),
  outputSchema: invalidOutputSchema,
  errorSchema: invalidOutputErrorSchema,
  effect: "pure",
  semanticConstraints: [],
  requirements: [],
  source: fixtureSource,
  availability: { tag: "available" },
  handler: async () => {
    const value = invalidOutputSchema.parse({ ok: true });
    Reflect.set(value, "ok", false);
    return { tag: "output", value };
  },
});

/* -------------------------------------------------------------------------- */
/* Controlled order intent                                                     */
/* -------------------------------------------------------------------------- */

const limitOrderBaseSchema = withLimitOrderKind(orderBaseSchema);
export const exactOrderSchema = withProviderExtension(
  withLimitPrice(withQuantity(limitOrderBaseSchema)),
  z.strictObject({
    providerOrderType: z.literal("fixture-limit"),
    postOnly: z.boolean(),
  }),
);
export type ExactOrderInput = z.input<typeof exactOrderSchema>;
export type ExactOrder = z.output<typeof exactOrderSchema>;

const orderIntentSchema = z.strictObject({
  intentId: z.string().trim().min(1),
  order: exactOrderSchema,
  status: z.literal("admission-pending"),
});
const orderErrorSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("aborted"), reason: z.string().min(1) }),
  z.strictObject({ tag: z.literal("admission-rejected"), reason: z.string().min(1) }),
]);
const orderRequirements = [
  { resource: "order-admission", permission: "submit-intent" },
] satisfies readonly CapabilityRequirement[];

export const orderPlanningCapability = definePull({
  capabilityId: "fixture.order.limit-intent",
  path: ["fixture", "order", "limit-intent"],
  description: "Builds an exact limit Order intent; it never dispatches a broker write.",
  schemaVersion: 1,
  inputSchema: exactOrderSchema,
  outputSchema: orderIntentSchema,
  errorSchema: orderErrorSchema,
  effect: "write-intent",
  semanticConstraints: [limitPriceSemanticConstraint],
  requirements: orderRequirements,
  source: fixtureSource,
  availability: { tag: "available" },
  handler: async (
    input,
    signal,
  ): Promise<CapabilityOutcome<z.output<typeof orderIntentSchema>, z.output<typeof orderErrorSchema>>> => {
    if (signal.aborted) return { tag: "error", error: { tag: "aborted", reason: "order intent cancelled" } };
    const intentId = `${input.instrument.symbol}-${input.quantity}-${input.limitPrice}`;
    return {
      tag: "output",
      value: { intentId, order: input, status: "admission-pending" },
    };
  },
});

type OrderIntent = z.output<typeof orderIntentSchema>;
type OrderError = z.output<typeof orderErrorSchema>;

/** This injected port is a conformance seam, not a journal and not a broker writer. */
export const demonstrationAdmissionPort: AdmissionPort<OrderIntent, OrderError> = {
  async admit(intent, signal) {
    if (signal.aborted) return { tag: "rejected", error: { tag: "aborted", reason: "admission cancelled" } };
    return { tag: "accepted", intent };
  },
};

export const controlledOrderCapability = withTransaction(orderPlanningCapability, demonstrationAdmissionPort);

export const sampleOrderInput: ExactOrderInput = {
  scope: { accountId: "fixture-account", subAccountId: "main" },
  instrument: { nativeId: "fixture-btc", symbol: "BTC/USD" },
  kind: "limit",
  side: "buy",
  timeInForce: "gtc",
  quantity: "2.5",
  limitPrice: "100.25",
  providerOrderType: "fixture-limit",
  postOnly: true,
};

/* -------------------------------------------------------------------------- */
/* Foreign Python process bridge                                               */
/* -------------------------------------------------------------------------- */

const foreignSource = {
  language: "python",
  identity: "composition-fixture-worker.py",
  version: "fixture-1",
};
const foreignRequirements = [
  { resource: "foreign-fixture-process", permission: "read" },
] satisfies readonly CapabilityRequirement[];
const foreignFeedInputSchema = z.strictObject({
  scope: publicScopeSchema,
  instrument: z.string().trim().min(1),
  count: z.number().int().min(1).max(8).nullable(),
  mode: z.enum(["valid", "invalid-output"]),
});
const foreignFeedErrorSchema = z.discriminatedUnion("tag", [
  z.strictObject({ tag: z.literal("worker-failed"), message: z.string().min(1) }),
  z.strictObject({ tag: z.literal("worker-protocol-invalid"), issues: z.array(z.string().min(1)).min(1) }),
  z.strictObject({ tag: z.literal("remote-output-invalid"), issues: z.array(z.string().min(1)).min(1) }),
]);
const remoteFrameSchema = z.strictObject({
  sequence: z.number().int().nonnegative(),
  value: z.unknown(),
});
const foreignWorkerPath = fileURLToPath(new URL("./composition-fixture-worker.py", import.meta.url));

type WorkerExit = { readonly code: number | null; readonly signal: string | null };

function issueMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.map((item) => String(item)).join(".");
    return `${path}: ${issue.message}`;
  });
}

async function* foreignWorkerFrames(
  input: z.output<typeof foreignFeedInputSchema>,
  signal: AbortSignal,
): AsyncIterable<PushFrame<RichCandle, z.output<typeof foreignFeedErrorSchema>>> {
  const worker = spawn("python3", [foreignWorkerPath], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = createInterface({ input: worker.stdout });
  let processClosed = false;
  const closed = new Promise<WorkerExit>((resolve) => {
    worker.once("close", (code, closeSignal) => {
      processClosed = true;
      resolve({ code, signal: closeSignal });
    });
  });
  const abort = () => {
    if (!processClosed) worker.kill("SIGTERM");
  };
  signal.addEventListener("abort", abort, { once: true });

  try {
    worker.stdin.end(`${JSON.stringify(input)}\n`);
    yield { tag: "control", control: { tag: "started", subscriptionId: "foreign-worker-fixture" } };
    for await (const line of lines) {
      if (signal.aborted) return;
      let raw: unknown;
      try {
        raw = JSON.parse(line);
      } catch {
        yield {
          tag: "error",
          error: { tag: "worker-protocol-invalid", issues: ["worker emitted non-JSON output"] },
        };
        return;
      }
      const wire = remoteFrameSchema.safeParse(raw);
      if (!wire.success) {
        yield { tag: "error", error: { tag: "worker-protocol-invalid", issues: issueMessages(wire.error) } };
        return;
      }
      const candle = richCandleSchema.safeParse(wire.data.value);
      if (!candle.success) {
        yield { tag: "error", error: { tag: "remote-output-invalid", issues: issueMessages(candle.error) } };
        return;
      }
      yield { tag: "data", sequence: wire.data.sequence, value: candle.data };
    }
    const exit = await closed;
    if (signal.aborted) return;
    if (exit.code !== 0) {
      yield {
        tag: "error",
        error: {
          tag: "worker-failed",
          message: `worker exited with code ${String(exit.code)}${exit.signal === null ? "" : ` signal ${exit.signal}`}`,
        },
      };
    }
  } finally {
    lines.close();
    if (!processClosed) worker.kill("SIGTERM");
    signal.removeEventListener("abort", abort);
    await closed;
  }
}

const foreignFeedConstraint: SemanticConstraint = {
  id: "foreign-feed.remote-json-validated",
  version: 1,
  description: "Every foreign frame is validated as a local rich Candle before crossing the UTA boundary.",
};

export const foreignFeedPush = definePush({
  capabilityId: "foreign.market.candle-feed",
  path: ["foreign", "market", "candle-feed"],
  description: "Python fixture feed forwarded through a validated NDJSON process boundary.",
  schemaVersion: 1,
  inputSchema: foreignFeedInputSchema,
  outputSchema: richCandleSchema,
  errorSchema: foreignFeedErrorSchema,
  effect: "read",
  semanticConstraints: [foreignFeedConstraint],
  requirements: foreignRequirements,
  source: foreignSource,
  availability: { tag: "available" },
  handler: foreignWorkerFrames,
});

/* -------------------------------------------------------------------------- */
/* Two trees and CLI                                                           */
/* -------------------------------------------------------------------------- */

export const fixtureTree = createCapabilityTree([
  fixtureCandlePull,
  fixtureCandlePush,
  fixtureNewsPull,
  invalidOutputCapability,
  controlledOrderCapability,
]);
export const foreignTree = createCapabilityTree([foreignFeedPush]);
export const fixtureCli = createCapabilityCli(fixtureTree);
export const foreignCli = createCapabilityCli(foreignTree);

function cliFor(provider: string): CapabilityCli {
  if (provider === "fixture") return fixtureCli;
  if (provider === "foreign") return foreignCli;
  throw new Error(`unknown provider tree: ${provider}`);
}

function jsonArgument(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`JSON argument is invalid: ${message}`);
  }
}

function requiredArgument(args: readonly string[], index: number, name: string): string {
  const value = args[index];
  if (value === undefined) throw new Error(`missing ${name}`);
  return value;
}

function emit(value: unknown): void {
  const checked = jsonValueSchema.safeParse(value);
  if (!checked.success) throw new Error("CLI attempted to emit a non-JSON value");
  process.stdout.write(`${JSON.stringify(checked.data)}\n`);
}

async function emitPull(cli: CapabilityCli, path: string, raw: unknown): Promise<void> {
  const result = await cli.pull(path, raw);
  emit(result);
}

async function emitPush(cli: CapabilityCli, path: string, raw: unknown, signal?: AbortSignal): Promise<void> {
  for await (const frame of cli.push(path, raw, signal)) emit(frame);
}
async function emitPushWithSignal(
  cli: CapabilityCli,
  path: string,
  raw: unknown,
  cancelAfterMs?: number,
): Promise<void> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const onStdoutError = (error: unknown): void => {
    if (error instanceof Error && "code" in error && error.code === "EPIPE") abort();
  };
  const onStdoutClose = (): void => abort();
  process.once("SIGINT", abort);
  process.stdout.once("error", onStdoutError);
  process.stdout.once("close", onStdoutClose);
  const timer = cancelAfterMs === undefined ? undefined : setTimeout(abort, cancelAfterMs);
  try {
    await emitPush(cli, path, raw, controller.signal);
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGINT", abort);
    process.stdout.removeListener("error", onStdoutError);
    process.stdout.removeListener("close", onStdoutClose);
  }
}


export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const command = argv[0] ?? "help";
  if (command === "help") {
    const provider = argv[1];
    if (provider === undefined) {
      process.stdout.write(`${fixtureCli.help()}\n\n${foreignCli.help()}\n`);
    } else {
      process.stdout.write(`${cliFor(provider).help()}\n`);
    }
    return 0;
  }
  if (command === "describe") {
    const provider = argv[1];
    if (provider === undefined) emit({ fixture: fixtureCli.describe(), foreign: foreignCli.describe() });
    else emit(cliFor(provider).describe());
    return 0;
  }
  if (command === "pull") {
    const provider = requiredArgument(argv, 1, "provider");
    const path = requiredArgument(argv, 2, "capability path");
    const raw = jsonArgument(requiredArgument(argv, 3, "JSON input"));
    await emitPull(cliFor(provider), path, raw);
    return 0;
  }
  if (command === "push") {
    const provider = requiredArgument(argv, 1, "provider");
    const path = requiredArgument(argv, 2, "capability path");
    const raw = jsonArgument(requiredArgument(argv, 3, "JSON input"));
    await emitPushWithSignal(cliFor(provider), path, raw);
    return 0;
  }
  if (command === "cancel") {
    const provider = requiredArgument(argv, 1, "provider");
    const path = requiredArgument(argv, 2, "capability path");
    const raw = jsonArgument(requiredArgument(argv, 3, "JSON input"));
    const delay = Number(requiredArgument(argv, 4, "cancel delay in milliseconds"));
    if (!Number.isInteger(delay) || delay < 0) throw new Error("cancel delay must be a non-negative integer");
    await emitPushWithSignal(cliFor(provider), path, raw, delay);
    return 0;
  }
  if (command === "invalid-output") {
    await emitPull(fixtureCli, "fixture/diagnostic/invalid-output", {});
    return 0;
  }
  if (command === "foreign-invalid-output") {
    await emitPushWithSignal(foreignCli, "foreign/market/candle-feed", {
      scope: { tag: "public" },
      instrument: "BTC/USD",
      count: 1,
      mode: "invalid-output",
    });
    return 0;
  }
  throw new Error(`unknown command: ${command}`);
}

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown CLI failure";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
