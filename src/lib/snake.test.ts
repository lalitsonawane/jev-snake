import { describe, expect, it } from "vitest";

import {
  applyMove,
  endgameAnnouncement,
  straightShotSteps,
  type Game,
} from "./snake";

function game(overrides: Partial<Game> = {}): Game {
  return {
    width: 8,
    height: 8,
    snake: [
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
    ],
    dir: "right",
    food: { x: 6, y: 3 },
    status: "playing",
    lossReason: null,
    ticks: 0,
    challenges: {
      score: 0,
      foodsEaten: 0,
      foodStreak: 0,
      ticksSinceFood: 0,
      bestFoodTicks: null,
      nearMisses: 0,
      level: 1,
    },
    ...overrides,
  };
}

describe("straightShotSteps", () => {
  it("returns the remaining steps for a clear collinear target", () => {
    expect(straightShotSteps(game(), "right")).toBe(4);
  });

  it("rejects a direction that does not point exactly at the food", () => {
    expect(straightShotSteps(game(), "up")).toBeNull();
    expect(straightShotSteps(game({ food: { x: 6, y: 4 } }), "right")).toBeNull();
  });

  it("rejects a corridor containing any snake body cell", () => {
    const blocked = game({
      snake: [
        { x: 2, y: 3 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
      ],
    });

    expect(straightShotSteps(blocked, "right")).toBeNull();
  });

  it("rejects terminal games and games without food", () => {
    expect(straightShotSteps(game({ status: "lost" }), "right")).toBeNull();
    expect(straightShotSteps(game({ food: null }), "right")).toBeNull();
  });
});

describe("classic self-crash endgame", () => {
  it("marks lossReason self when the head hits the body", () => {
    // Head (2,1) moving down into body cell (2,2) — not the vacating tail.
    const g = game({
      snake: [
        { x: 2, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 1 },
      ],
      dir: "right",
      food: { x: 7, y: 7 },
    });

    const next = applyMove(g, "down");
    expect(next.status).toBe("lost");
    expect(next.lossReason).toBe("self");
    expect(endgameAnnouncement(next)).toEqual({
      title: "Game over",
      detail: "The snake crashed into itself while maneuvering.",
    });
  });

  it("marks lossReason wall when leaving the board", () => {
    const g = game({
      snake: [
        { x: 7, y: 3 },
        { x: 6, y: 3 },
        { x: 5, y: 3 },
      ],
      dir: "right",
      food: { x: 1, y: 1 },
    });

    const next = applyMove(g, "right");
    expect(next.status).toBe("lost");
    expect(next.lossReason).toBe("wall");
    expect(endgameAnnouncement(next)?.detail).toMatch(/wall/i);
  });
});
