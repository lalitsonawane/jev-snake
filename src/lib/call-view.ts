import type { ProviderId } from "@/lib/systemone";

export type CallViewTick = {
  provider: ProviderId;
  request: unknown;
  response: {
    model?: string;
    choice?: string;
    confidence?: number;
  };
  legal: readonly string[];
};

function asPair(v: unknown): [number, number] | null {
  if (
    Array.isArray(v) &&
    v.length >= 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number"
  ) {
    return [v[0], v[1]];
  }
  return null;
}

/**
 * Route responses store the upstream payload `{ model, state, questions }`.
 * Aborted or early-error ticks fall back to the flat serialized board state.
 */
function boardState(req: Record<string, unknown>): Record<string, unknown> {
  const nested = req.state;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const state = nested as Record<string, unknown>;
    if (
      "head" in state ||
      "food" in state ||
      "food_dx" in state ||
      "legal" in state
    ) {
      return state;
    }
  }
  return req;
}

/** Compact view of the last System One I/O for the JSON panel. */
export function buildCallView(tick: CallViewTick | null): {
  head: [number, number] | null;
  food: [number, number] | null;
  payload: Record<string, unknown> | null;
} {
  if (!tick) return { head: null, food: null, payload: null };
  const req = (
    tick.request && typeof tick.request === "object" ? tick.request : {}
  ) as Record<string, unknown>;
  const board = boardState(req);
  const res = tick.response || {};
  const head = asPair(board.head);
  const food = asPair(board.food);
  const dx = typeof board.food_dx === "number" ? board.food_dx : null;
  const dy = typeof board.food_dy === "number" ? board.food_dy : null;
  const legal = Array.isArray(board.legal)
    ? (board.legal as string[])
    : Array.isArray(req.legal)
      ? (req.legal as string[])
      : [...tick.legal];

  const state: Record<string, unknown> = {
    head: head ?? board.head ?? null,
    food: food ?? board.food ?? null,
    food_delta: dx != null && dy != null ? [dx, dy] : null,
    safe_moves: legal,
  };

  const move: Record<string, unknown> = {
    choice: res.choice ?? null,
    confidence: typeof res.confidence === "number" ? res.confidence : null,
  };

  return {
    head,
    food,
    payload: {
      provider: tick.provider,
      model: res.model ?? null,
      state,
      move,
    },
  };
}
