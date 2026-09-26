/** Shared TypeSafe System One wire helpers for Jev and Drex. */

export type ProviderId = "jev" | "drex";

export type MoveTickBody = {
  state: Record<string, unknown>;
  legal_moves: string[];
  batch?: boolean;
};

export type ProviderConfig = {
  id: ProviderId;
  label: string;
  model: string;
  /**
   * Host root without trailing slash (SDK-style). Path `/v1/systemone` is appended.
   * Empty string means the env base URL is required (no working public default).
   */
  defaultBaseUrl: string;
  apiKeyEnvs: readonly string[];
  baseUrlEnvs: readonly string[];
  missingKeyError: string;
  missingBaseUrlError?: string;
};

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  jev: {
    id: "jev",
    label: "Jev",
    model: "jev-latest",
    defaultBaseUrl: "https://api.typesafe.ai",
    apiKeyEnvs: ["TYPESAFE_API_KEY", "TYPE_SAFE_API_KEY"],
    baseUrlEnvs: ["TYPESAFE_BASE_URL", "TYPE_SAFE_BASE_URL"],
    missingKeyError: "TYPESAFE_API_KEY not configured on server",
  },
  drex: {
    id: "drex",
    label: "Drex",
    model: "drex-latest",
    // api.drex.ai does not resolve (ENOTFOUND). Operators must set DREX_BASE_URL
    // to their tenant's System One root (same shape as TypeSafe; no /v1/systemone suffix).
    defaultBaseUrl: "",
    apiKeyEnvs: ["DREX_API_KEY"],
    baseUrlEnvs: ["DREX_BASE_URL"],
    missingKeyError: "DREX_API_KEY not configured on server",
    missingBaseUrlError:
      "DREX_BASE_URL not configured on server (set to your Drex System One root, e.g. https://<host> — do not include /v1/systemone)",
  },
};

export function isProviderId(value: unknown): value is ProviderId {
  return value === "jev" || value === "drex";
}

function firstEnv(names: readonly string[]): string {
  for (const name of names) {
    const v = process.env[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Normalize a System One base URL: trim, strip trailing slash and accidental /v1/systemone. */
export function normalizeBaseUrl(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  base = base.replace(/\/v1\/systemone\/?$/i, "");
  return base.replace(/\/+$/, "");
}

export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveProvider(id: ProviderId): {
  config: ProviderConfig;
  apiKey: string;
  endpoint: string;
  baseUrlError?: string;
} {
  const config = PROVIDERS[id];
  const apiKey = firstEnv(config.apiKeyEnvs);
  const fromEnv = firstEnv(config.baseUrlEnvs);
  const base = normalizeBaseUrl(fromEnv || config.defaultBaseUrl);

  if (!base) {
    return {
      config,
      apiKey,
      endpoint: "",
      baseUrlError: config.missingBaseUrlError || `${config.label} base URL not configured`,
    };
  }

  if (!isAbsoluteHttpUrl(base)) {
    return {
      config,
      apiKey,
      endpoint: "",
      baseUrlError: `${config.label} base URL must be an absolute http(s) URL (got "${base}"). Set ${config.baseUrlEnvs[0]}.`,
    };
  }

  return { config, apiKey, endpoint: `${base}/v1/systemone` };
}

/** Human-readable upstream network failure (never leaks secrets). */
export function describeUpstreamFetchError(
  err: unknown,
  endpoint: string,
  label: string,
): string {
  const cause =
    err && typeof err === "object" && "cause" in err
      ? (err as { cause?: unknown }).cause
      : undefined;
  const causeObj =
    cause && typeof cause === "object" ? (cause as Record<string, unknown>) : null;
  const code = typeof causeObj?.code === "string" ? causeObj.code : "";
  const hostname =
    typeof causeObj?.hostname === "string" ? causeObj.hostname : "";

  let hostHint = "";
  try {
    hostHint = new URL(endpoint).host;
  } catch {
    hostHint = endpoint;
  }

  if (code === "ENOTFOUND") {
    return `${label} unreachable: DNS lookup failed for ${hostname || hostHint}. Set DREX_BASE_URL (or the provider base URL) to a resolvable System One host.`;
  }
  if (code === "ECONNREFUSED") {
    return `${label} unreachable: connection refused at ${hostHint}.`;
  }
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return `${label} unreachable: connection timed out to ${hostHint}.`;
  }

  const msg = err instanceof Error ? err.message : String(err);
  return `${label} upstream request failed (${msg}) for ${hostHint}.`;
}

/** Build the Choice (+ optional Score/foresight) questions used for Snake moves. */
export function buildMoveQuestions(
  state: Record<string, unknown>,
  legal: string[],
  batch: boolean,
): Record<string, unknown> {
  const prefer: string[] = Array.isArray(state?.food_prefer)
    ? (state.food_prefer as string[])
    : [];
  const dist = state?.food_dist;

  const moveCriteria = Object.fromEntries(
    legal.map((m: string) => {
      const hunts = prefer.includes(m);
      return [
        m,
        [
          `move ${m}`,
          "must stay alive (no wall/self)",
          hunts
            ? `REDUCES distance to food (prefer; food_dist=${dist})`
            : dist != null
              ? `does not close on food (food_dist=${dist})`
              : "no food target",
          "avoid trapping into dead-ends",
          "progress toward filling the board",
        ].join("; "),
      ];
    }),
  );

  const questions: Record<string, unknown> = {
    move: {
      type: "choice",
      instructions:
        "Choose next Snake direction among legal_moves ONLY. Priority: (1) SURVIVE — never hit wall/body; (2) EAT — reduce Manhattan distance to food when safe (food_prefer/food_dx/food_dy/food_dist); (3) FILL board. Never reverse. Prefer open space over greedy food if food move looks trapping.",
      criteria: moveCriteria,
    },
  };

  if (batch) {
    for (const m of legal) {
      const hunts = prefer.includes(m);
      questions[`score_${m}`] = {
        type: "score",
        instructions: `Score how good it is to move ${m} this tick for Snake. 0=suicide/bad, 1=excellent. Weight: survival first, then closing on food, then board-fill progress. Avoid dead-ends.`,
        criteria: {
          survival: "Does not hit wall or body immediately; leaves escape options",
          food: hunts
            ? `Closes on food (food_dist=${dist})`
            : "Does not help reach food this tick",
          fill: "Leaves snake able to keep filling the board",
        },
      };
    }
    questions.foresight = {
      type: "choice",
      instructions:
        "Given current state, pick the most probable *next* direction AFTER the immediate move (2-step foresight). Prefer survive → eat → fill. Answer must be one of legal_moves (best guess for tick+1).",
      criteria: moveCriteria,
    };
  }

  return questions;
}

export function shapeMoveResult(
  data: Record<string, unknown>,
  legal: string[],
  batch: boolean,
  payload: { model: string; state: unknown; questions: unknown },
  latencyMs: number,
  provider: ProviderId,
) {
  const answers = (data.answers || {}) as Record<
    string,
    Record<string, unknown>
  >;
  const moveAns = answers.move || {};

  const scores: Record<string, unknown> = {};
  for (const m of legal) {
    const a = answers[`score_${m}`];
    if (a) scores[m] = { score: a.score ?? a.value, confidence: a.confidence };
  }
  const foresight = answers.foresight
    ? {
        choice: answers.foresight.choice,
        confidence: answers.foresight.confidence,
        probabilities: answers.foresight.probabilities,
      }
    : null;

  return {
    provider,
    request: payload,
    response: {
      model: data.model,
      choice: moveAns.choice,
      confidence: moveAns.confidence,
      probabilities: moveAns.probabilities,
      scores: batch ? scores : undefined,
      foresight: batch ? foresight : undefined,
      usage: data.usage,
      evaluation_time_ms: data.evaluation_time_ms,
      request_id: data.request_id,
      batch,
    },
    latencyMs,
  };
}
