import { describe, expect, it } from "vitest";

import { straightShotSteps, type Game } from "./snake";

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
