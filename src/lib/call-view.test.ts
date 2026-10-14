import { describe, expect, it } from "vitest";

import { buildCallView, type CallViewTick } from "./call-view";

function tick(request: unknown, legal: string[] = ["up", "right"]): CallViewTick {
  return {
    provider: "jev",
    request,
    response: { model: "jev-latest", choice: "right", confidence: 0.82 },
    legal,
  };
}

describe("buildCallView", () => {
  it("reads head and food from the nested System One payload", () => {
    const view = buildCallView(
      tick({
        model: "jev-latest",
        state: {
          head: [6, 6],
          food: [11, 11],
          food_dx: 5,
          food_dy: 5,
          legal: ["up", "right", "down"],
        },
        questions: { move: { type: "choice" } },
      }),
    );

    expect(view.head).toEqual([6, 6]);
    expect(view.food).toEqual([11, 11]);
    expect(view.payload).toMatchObject({
      provider: "jev",
      model: "jev-latest",
      state: {
        head: [6, 6],
        food: [11, 11],
        food_delta: [5, 5],
        safe_moves: ["up", "right", "down"],
      },
      move: { choice: "right", confidence: 0.82 },
    });
  });

  it("still reads a flat serialized board state", () => {
    const view = buildCallView(
      tick({
        head: [4, 2],
        food: [4, 7],
        food_dx: 0,
        food_dy: 5,
        legal: ["down"],
      }),
    );

    expect(view.head).toEqual([4, 2]);
    expect(view.food).toEqual([4, 7]);
    expect(view.payload?.state).toMatchObject({
      food_delta: [0, 5],
      safe_moves: ["down"],
    });
  });

  it("returns an empty view before the first tick", () => {
    expect(buildCallView(null)).toEqual({
      head: null,
      food: null,
      payload: null,
    });
  });
});
