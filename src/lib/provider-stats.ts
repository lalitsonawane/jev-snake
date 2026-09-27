import type { ProviderId } from "@/lib/systemone";

export type ProviderSessionStats = {
  apiCalls: number;
  errors: number;
  heldMoves: number;
  latencySum: number;
  latencyCount: number;
  lastLatencyMs: number | null;
  evalTimeSum: number;
  evalTimeCount: number;
  lastEvalTimeMs: number | null;
  inputTokens: number;
  outputTokens: number;
  confidenceSum: number;
  confidenceCount: number;
  lastConfidence: number | null;
  lastChoice: string | null;
  /** Compare mode: ticks where this provider's choice matched the other. */
  agreements: number;
  /** Compare mode: ticks where both returned a choice (for agreement rate). */
  comparedChoices: number;
};

export function emptyProviderStats(): ProviderSessionStats {
  return {
    apiCalls: 0,
    errors: 0,
    heldMoves: 0,
    latencySum: 0,
    latencyCount: 0,
    lastLatencyMs: null,
    evalTimeSum: 0,
    evalTimeCount: 0,
    lastEvalTimeMs: null,
    inputTokens: 0,
    outputTokens: 0,
    confidenceSum: 0,
    confidenceCount: 0,
    lastConfidence: null,
    lastChoice: null,
    agreements: 0,
    comparedChoices: 0,
  };
}

export type SessionStats = Record<ProviderId, ProviderSessionStats>;

export function emptySessionStats(): SessionStats {
  return {
    jev: emptyProviderStats(),
    drex: emptyProviderStats(),
  };
}

export function parseUsageTokens(usage: unknown): {
  input: number;
  output: number;
} {
  if (!usage || typeof usage !== "object") return { input: 0, output: 0 };
  const u = usage as Record<string, unknown>;
  const input =
    typeof u.input_tokens === "number"
      ? u.input_tokens
      : typeof u.prompt_tokens === "number"
        ? u.prompt_tokens
        : 0;
  const output =
    typeof u.output_tokens === "number"
      ? u.output_tokens
      : typeof u.completion_tokens === "number"
        ? u.completion_tokens
        : 0;
  return {
    input: Number.isFinite(input) ? input : 0,
    output: Number.isFinite(output) ? output : 0,
  };
}

export type ApiTickSample = {
  ok: boolean;
  latencyMs: number;
  choice?: string | null;
  confidence?: number | null;
  evaluationTimeMs?: number | null;
  usage?: unknown;
};

/** Record one API round-trip for a provider (success or error). */
export function recordApiTick(
  prev: ProviderSessionStats,
  sample: ApiTickSample,
): ProviderSessionStats {
  const next = { ...prev };
  if (!sample.ok) {
    next.errors += 1;
    if (sample.latencyMs > 0) {
      next.lastLatencyMs = sample.latencyMs;
      next.latencySum += sample.latencyMs;
      next.latencyCount += 1;
    }
    return next;
  }

  next.apiCalls += 1;
  next.lastLatencyMs = sample.latencyMs;
  next.latencySum += sample.latencyMs;
  next.latencyCount += 1;
  next.lastChoice =
    typeof sample.choice === "string" && sample.choice ? sample.choice : null;

  if (typeof sample.confidence === "number" && Number.isFinite(sample.confidence)) {
    next.lastConfidence = sample.confidence;
    next.confidenceSum += sample.confidence;
    next.confidenceCount += 1;
  }

  if (
    typeof sample.evaluationTimeMs === "number" &&
    Number.isFinite(sample.evaluationTimeMs)
  ) {
    next.lastEvalTimeMs = sample.evaluationTimeMs;
    next.evalTimeSum += sample.evaluationTimeMs;
    next.evalTimeCount += 1;
  }

  const tokens = parseUsageTokens(sample.usage);
  next.inputTokens += tokens.input;
  next.outputTokens += tokens.output;
  return next;
}

export function recordHeldMove(prev: ProviderSessionStats): ProviderSessionStats {
  return { ...prev, heldMoves: prev.heldMoves + 1 };
}

/** When both providers answered, bump agreement counters. */
export function recordCompareAgreement(
  stats: SessionStats,
  jevChoice: string | null | undefined,
  drexChoice: string | null | undefined,
): SessionStats {
  if (!jevChoice || !drexChoice) return stats;
  const agree = jevChoice === drexChoice;
  return {
    jev: {
      ...stats.jev,
      comparedChoices: stats.jev.comparedChoices + 1,
      agreements: stats.jev.agreements + (agree ? 1 : 0),
    },
    drex: {
      ...stats.drex,
      comparedChoices: stats.drex.comparedChoices + 1,
      agreements: stats.drex.agreements + (agree ? 1 : 0),
    },
  };
}

export function avgMs(sum: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.round(sum / count);
}

export function avgRatio(sum: number, count: number): number | null {
  if (count <= 0) return null;
  return sum / count;
}

export function agreementRate(stats: ProviderSessionStats): number | null {
  if (stats.comparedChoices <= 0) return null;
  return stats.agreements / stats.comparedChoices;
}
