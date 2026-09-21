export type Dir = "up" | "down" | "left" | "right";
export type Pt = { x: number; y: number };

export type Challenges = {
  score: number;
  foodsEaten: number;
  foodStreak: number; // consecutive eats without a near-miss between
  ticksSinceFood: number;
  bestFoodTicks: number | null; // best time-to-food this run
  nearMisses: number; // ticks with only 1 legal move
  level: number;
};

export type Game = {
  width: number;
  height: number;
  snake: Pt[];
  dir: Dir;
  food: Pt | null;
  status: "playing" | "won" | "lost";
  ticks: number;
  challenges: Challenges;
};

export const ALL_DIRS: Dir[] = ["up", "down", "left", "right"];

const DIRS: Record<Dir, Pt> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const key = (p: Pt) => `${p.x},${p.y}`;

export const DEFAULT_W = 12;
export const DEFAULT_H = 12;

function emptyChallenges(): Challenges {
  return {
    score: 0,
    foodsEaten: 0,
    foodStreak: 0,
    ticksSinceFood: 0,
    bestFoodTicks: null,
    nearMisses: 0,
    level: 1,
  };
}

function placeFood(
  width: number,
  height: number,
  snake: Pt[],
  mode: "random" | "deterministic" = "random",
): Pt | null {
  const occupied = new Set(snake.map(key));
  const empty: Pt[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  if (!empty.length) return null;
  if (mode === "deterministic") return empty[empty.length - 1];
  return empty[Math.floor(Math.random() * empty.length)];
}

export function createGame(width = DEFAULT_W, height = DEFAULT_H): Game {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const snake: Pt[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    width,
    height,
    snake,
    dir: "right",
    food: placeFood(width, height, snake, "deterministic"),
    status: "playing",
    ticks: 0,
    challenges: emptyChallenges(),
  };
}

export function legalMoves(game: Game): Dir[] {
  const head = game.snake[0];
  const body = new Set(game.snake.slice(0, -1).map(key));
  const out: Dir[] = [];
  for (const name of ALL_DIRS) {
    if (name === OPP[game.dir]) continue;
    const d = DIRS[name];
    const nx = head.x + d.x;
    const ny = head.y + d.y;
    if (nx < 0 || ny < 0 || nx >= game.width || ny >= game.height) continue;
    if (body.has(`${nx},${ny}`)) continue;
    out.push(name);
  }
  return out;
}

function manhattan(a: Pt, b: Pt) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Primary compass toward food (may be diagonal → prefer axis with larger delta). */
export function foodHint(head: Pt, food: Pt | null): {
  dist: number | null;
  dx: number | null;
  dy: number | null;
  prefer: Dir[];
} {
  if (!food) return { dist: null, dx: null, dy: null, prefer: [] };
  const dx = food.x - head.x;
  const dy = food.y - head.y;
  const prefer: Dir[] = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) prefer.push("right");
    if (dx < 0) prefer.push("left");
    if (dy > 0) prefer.push("down");
    if (dy < 0) prefer.push("up");
  } else {
    if (dy > 0) prefer.push("down");
    if (dy < 0) prefer.push("up");
    if (dx > 0) prefer.push("right");
    if (dx < 0) prefer.push("left");
  }
  return { dist: manhattan(head, food), dx, dy, prefer };
}

function levelForLength(len: number) {
  return Math.max(1, Math.floor((len - 3) / 8) + 1);
}

export function applyMove(game: Game, move: Dir): Game {
  if (game.status !== "playing") return game;
  const d = DIRS[move];
  const head = game.snake[0];
  const next = { x: head.x + d.x, y: head.y + d.y };
  const legalBefore = legalMoves(game);
  const nearMiss = legalBefore.length <= 1;

  let ch = { ...game.challenges };
  if (nearMiss) {
    ch = { ...ch, nearMisses: ch.nearMisses + 1, foodStreak: 0 };
  }

  const base: Game = {
    ...game,
    dir: move,
    ticks: game.ticks + 1,
    challenges: { ...ch, ticksSinceFood: ch.ticksSinceFood + 1 },
  };

  if (next.x < 0 || next.y < 0 || next.x >= game.width || next.y >= game.height) {
    return { ...base, status: "lost" };
  }
  const willGrow = !!(game.food && next.x === game.food.x && next.y === game.food.y);
  const bodyCheck = willGrow ? game.snake : game.snake.slice(0, -1);
  if (bodyCheck.some((p) => p.x === next.x && p.y === next.y)) {
    return { ...base, status: "lost" };
  }

  let snake = [next, ...game.snake];
  let food = game.food;
  let challenges = base.challenges;

  if (willGrow) {
    const took = challenges.ticksSinceFood; // includes this tick
    const speedBonus = Math.max(0, 20 - took);
    const foodsEaten = challenges.foodsEaten + 1;
    const foodStreak = nearMiss ? 1 : challenges.foodStreak + 1;
    const score = challenges.score + 10 + speedBonus + foodStreak * 2;
    const bestFoodTicks =
      challenges.bestFoodTicks == null ? took : Math.min(challenges.bestFoodTicks, took);
    challenges = {
      ...challenges,
      foodsEaten,
      foodStreak,
      score,
      bestFoodTicks,
      ticksSinceFood: 0,
      level: levelForLength(snake.length),
    };
    if (snake.length >= game.width * game.height) {
      return {
        ...base,
        snake,
        food: null,
        status: "won",
        challenges: { ...challenges, score: challenges.score + 100 },
      };
    }
    food = placeFood(game.width, game.height, snake);
  } else {
    snake = snake.slice(0, -1);
    challenges = { ...challenges, level: levelForLength(snake.length) };
  }

  if (snake.length >= game.width * game.height) {
    return {
      ...base,
      snake,
      food: null,
      status: "won",
      challenges: { ...challenges, score: challenges.score + 100 },
    };
  }
  return { ...base, snake, food, challenges };
}

/** Lean state for Jev — includes food vector so it can hunt. */
export function serializeState(game: Game, legal: Dir[]) {
  const head = game.snake[0];
  const hint = foodHint(head, game.food);
  return {
    w: game.width,
    h: game.height,
    snake: game.snake.map((p) => [p.x, p.y] as [number, number]),
    head: [head.x, head.y] as [number, number],
    dir: game.dir,
    food: game.food ? ([game.food.x, game.food.y] as [number, number]) : null,
    food_dx: hint.dx,
    food_dy: hint.dy,
    food_dist: hint.dist,
    food_prefer: hint.prefer,
    len: game.snake.length,
    goal: game.width * game.height,
    legal,
    illegal: ALL_DIRS.filter((d) => !legal.includes(d)),
    tick: game.ticks,
    objective: "survive → eat current food → fill board",
  };
}
