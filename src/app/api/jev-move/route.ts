import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

function apiKey() {
  return process.env.TYPESAFE_API_KEY || process.env.TYPE_SAFE_API_KEY || "";
}

export async function POST(req: NextRequest) {
  const key = apiKey();
  if (!key) {
    return NextResponse.json(
      { error: "TYPESAFE_API_KEY not configured on server" },
      { status: 503 },
    );
  }

  const body = await req.json();
  const state = body?.state;
  const legal: string[] = body?.legal_moves || state?.legal || [];
  const batch = Boolean(body?.batch);
  if (!state || !Array.isArray(legal) || legal.length === 0) {
    return NextResponse.json({ error: "state and legal_moves required" }, { status: 400 });
  }

  const prefer: string[] = Array.isArray(state?.food_prefer) ? state.food_prefer : [];
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

  // Base: single Choice (normal tick)
  const questions: Record<string, unknown> = {
    move: {
      type: "choice",
      instructions:
        "Choose next Snake direction among legal_moves ONLY. Priority: (1) SURVIVE — never hit wall/body; (2) EAT — reduce Manhattan distance to food when safe (food_prefer/food_dx/food_dy/food_dist); (3) FILL board. Never reverse. Prefer open space over greedy food if food move looks trapping.",
      criteria: moveCriteria,
    },
  };

  // Batch foresight: Score each legal dir + short 2-step plan Choice — one round-trip
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

  const payload = { model: MODEL, state, questions };

  // Client abort (pause/reset/idle stop) must cancel the upstream TypeSafe call
  // so lifecycle restarts cannot stack orphaned billable Jev requests.
  if (req.signal.aborted) {
    return new NextResponse(null, { status: 499 });
  }

  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: req.signal,
    });
  } catch (err) {
    if (
      req.signal.aborted ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      return new NextResponse(null, { status: 499 });
    }
    throw err;
  }
  const latencyMs = Math.round(performance.now() - t0);
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Jev HTTP ${res.status}`, body: data, request: payload, latencyMs },
      { status: res.status },
    );
  }

  const answers = ((data as { answers?: Record<string, Record<string, unknown>> }).answers ||
    {}) as Record<string, Record<string, unknown>>;
  const moveAns = answers.move || {};

  const scores: Record<string, unknown> = {};
  for (const m of legal) {
    const a = answers[`score_${m}`];
    if (a) scores[m] = { score: a.score ?? a.value, confidence: a.confidence };
  }
  const foresight = answers.foresight
    ? { choice: answers.foresight.choice, confidence: answers.foresight.confidence, probabilities: answers.foresight.probabilities }
    : null;

  return NextResponse.json({
    request: payload,
    response: {
      model: (data as { model?: string }).model,
      choice: moveAns.choice,
      confidence: moveAns.confidence,
      probabilities: moveAns.probabilities,
      scores: batch ? scores : undefined,
      foresight: batch ? foresight : undefined,
      usage: (data as { usage?: unknown }).usage,
      batch,
    },
    latencyMs,
  });
}
