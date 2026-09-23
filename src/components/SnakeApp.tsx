"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ALL_DIRS,
  applyMove,
  createGame,
  DEFAULT_H,
  DEFAULT_W,
  legalMoves,
  serializeState,
  straightShotSteps,
  type Dir,
  type Game,
  type Pt,
} from "@/lib/snake";

type JevResponse = {
  model?: string;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  scores?: Record<string, { score?: number; confidence?: number }>;
  foresight?: { choice?: string; confidence?: number; probabilities?: Record<string, number> } | null;
  usage?: unknown;
  batch?: boolean;
};

type JevTick = {
  request: unknown;
  response: JevResponse;
  latencyMs: number;
  phase: string;
  legal: Dir[];
  batch: boolean;
  held: boolean;
};

type StraightHold = {
  dir: Dir;
  target: Pt;
};

/** Default visual cadence. Network time counts toward this target interval. */
const DEFAULT_TICK_MS = 90;
/** Stop hidden/idle autoplay before it can spend unattended Jev tokens. */
const AUTOPLAY_IDLE_MS = 90_000;

const OPP: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DIR_ARROW: Record<Dir, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

type MoveTag = "safe" | "neck" | "body";

function tagForMove(dir: Dir, currentDir: Dir, legalSet: Set<Dir>): MoveTag {
  if (legalSet.has(dir)) return "safe";
  if (dir === OPP[currentDir]) return "neck";
  return "body";
}

function fmtPct(n: unknown, digits = 1) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function asPair(v: unknown): [number, number] | null {
  if (Array.isArray(v) && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") {
    return [v[0], v[1]];
  }
  return null;
}

/** Compact view of last Jev I/O for the JSON panel — derived only from real request/response. */
function buildCallView(jev: JevTick | null): {
  head: [number, number] | null;
  food: [number, number] | null;
  payload: Record<string, unknown> | null;
} {
  if (!jev) return { head: null, food: null, payload: null };
  const req = (jev.request && typeof jev.request === "object" ? jev.request : {}) as Record<
    string,
    unknown
  >;
  const res = jev.response || {};
  const head = asPair(req.head);
  const food = asPair(req.food);
  const dx = typeof req.food_dx === "number" ? req.food_dx : null;
  const dy = typeof req.food_dy === "number" ? req.food_dy : null;
  const legal = Array.isArray(req.legal)
    ? (req.legal as string[])
    : Array.isArray(jev.legal)
      ? jev.legal
      : [];

  const state: Record<string, unknown> = {
    head: head ?? req.head ?? null,
    food: food ?? req.food ?? null,
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
    payload: { state, move },
  };
}

function highlightJson(value: unknown): string {
  const raw = JSON.stringify(value, null, 2);
  // Escape HTML then color tokens
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\b(null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],]/g,
    (match, str, colon, bool, nul) => {
      if (str !== undefined) {
        if (colon !== undefined) {
          return `<span class="jk">${str}</span>${colon}`;
        }
        return `<span class="js">${str}</span>`;
      }
      if (bool !== undefined) return `<span class="jb">${bool}</span>`;
      if (nul !== undefined) return `<span class="jnul">${nul}</span>`;
      if (/^-?\d/.test(match)) return `<span class="jn">${match}</span>`;
      return `<span class="jp">${match}</span>`;
    },
  );
}

export default function SnakeApp() {
  const [game, setGame] = useState<Game>(() => createGame(DEFAULT_W, DEFAULT_H));
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [jev, setJev] = useState<JevTick | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tickMs, setTickMs] = useState(DEFAULT_TICK_MS);

  const gameRef = useRef(game);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const batchRef = useRef(false);
  const holdRef = useRef<StraightHold | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const runVersionRef = useRef(0);
  const lastActiveRef = useRef(Date.now());
  const gearRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);
  useEffect(() => {
    batchRef.current = batch;
  }, [batch]);

  const bumpActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  const stopAutoplay = useCallback((message?: string) => {
    runningRef.current = false;
    runVersionRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    busyRef.current = false;
    holdRef.current = null;
    setRunning(false);
    if (message) setError(message);
  }, []);

  // Stop autoplay when tab hidden or user idle — saves Jev tokens
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && runningRef.current) {
        stopAutoplay("Autoplay stopped — tab hidden (saves Jev tokens). Hit Start to resume.");
      }
    };
    const onAct = () => bumpActivity();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointerdown", onAct);
    window.addEventListener("keydown", onAct);
    window.addEventListener("mousemove", onAct, { passive: true });
    window.addEventListener("scroll", onAct, { passive: true });
    const id = window.setInterval(() => {
      if (!runningRef.current) return;
      if (document.hidden) return;
      if (Date.now() - lastActiveRef.current < AUTOPLAY_IDLE_MS) return;
      stopAutoplay(
        "Autoplay stopped after 90s idle — no Jev calls while you're away. Hit Start to resume.",
      );
    }, 5000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("keydown", onAct);
      window.removeEventListener("mousemove", onAct);
      window.removeEventListener("scroll", onAct);
      window.clearInterval(id);
    };
  }, [bumpActivity, stopAutoplay]);

  // Close gear menu on outside click
  useEffect(() => {
    if (!gearOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setGearOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [gearOpen]);

  const reset = useCallback(() => {
    stopAutoplay();
    setError(null);
    setJev(null);
    const g = createGame(DEFAULT_W, DEFAULT_H);
    gameRef.current = g;
    setGame(g);
  }, [stopAutoplay]);

  const step = useCallback(async (runVersion: number): Promise<boolean> => {
    if (busyRef.current) return false;
    const g = gameRef.current;
    if (g.status !== "playing") {
      stopAutoplay();
      return false;
    }

    const legal = legalMoves(g);
    if (!legal.length) {
      const lost = { ...g, status: "lost" as const };
      gameRef.current = lost;
      setGame(lost);
      stopAutoplay();
      return false;
    }

    const hold = holdRef.current;
    const targetMatches =
      hold &&
      g.food &&
      hold.target.x === g.food.x &&
      hold.target.y === g.food.y;
    if (
      hold &&
      targetMatches &&
      legal.includes(hold.dir) &&
      straightShotSteps(g, hold.dir) !== null
    ) {
      const next = applyMove(g, hold.dir);
      const ateFood = next.challenges.foodsEaten !== g.challenges.foodsEaten;
      gameRef.current = next;
      setGame(next);
      setJev((prev) =>
        prev
          ? {
              ...prev,
              latencyMs: 0,
              phase: "held",
              legal,
              held: true,
            }
          : prev,
      );

      if (
        ateFood ||
        next.status !== "playing" ||
        straightShotSteps(next, hold.dir) === null
      ) {
        holdRef.current = null;
      }
      if (next.status !== "playing") {
        stopAutoplay();
        return false;
      }
      return true;
    }

    holdRef.current = null;
    busyRef.current = true;
    const useBatch = batchRef.current;
    const state = serializeState(g, legal);
    const controller = new AbortController();
    requestRef.current = controller;

    // Soft phase flip only — keep prior response/request so panels don't blank/flicker
    setJev((prev) => ({
      request: prev?.request ?? state,
      response: prev?.response ?? {},
      latencyMs: prev?.latencyMs ?? 0,
      phase: useBatch ? "batch foresight…" : "Choice(move)…",
      legal,
      batch: useBatch,
      held: false,
    }));
    setError(null);

    try {
      const res = await fetch("/api/jev-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, legal_moves: legal, batch: useBatch }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (
        controller.signal.aborted ||
        runVersion !== runVersionRef.current ||
        !runningRef.current
      ) {
        return false;
      }
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setJev({
          request: data.request ?? state,
          response: data.body ?? data.response ?? {},
          latencyMs: data.latencyMs ?? 0,
          phase: "error",
          legal,
          batch: useBatch,
          held: false,
        });
        stopAutoplay();
        return false;
      }

      const move = data.response?.choice as Dir | undefined;
      // Every new decision must come from Jev — held ticks only reuse this choice.
      if (!move || !legal.includes(move)) {
        setError(
          !move
            ? "Jev returned no Choice — autoplay stopped (no local fallback)."
            : `Jev chose illegal move "${move}" — autoplay stopped (no local fallback).`,
        );
        setJev({
          request: data.request,
          response: data.response,
          latencyMs: data.latencyMs,
          phase: "error",
          legal,
          batch: useBatch,
          held: false,
        });
        stopAutoplay();
        return false;
      }

      const shotSteps = straightShotSteps(g, move);
      const next = applyMove(g, move);
      const ateFood = next.challenges.foodsEaten !== g.challenges.foodsEaten;
      if (
        shotSteps !== null &&
        shotSteps > 1 &&
        !ateFood &&
        next.status === "playing" &&
        next.food &&
        straightShotSteps(next, move) !== null
      ) {
        holdRef.current = { dir: move, target: { ...next.food } };
      }
      gameRef.current = next;
      setGame(next);
      setJev({
        request: data.request,
        response: data.response,
        latencyMs: data.latencyMs,
        phase: "completed",
        legal,
        batch: useBatch,
        held: false,
      });

      if (next.status !== "playing") {
        stopAutoplay();
        return false;
      }
      return true;
    } catch (e) {
      if (controller.signal.aborted) return false;
      setError(e instanceof Error ? e.message : String(e));
      stopAutoplay();
      return false;
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        busyRef.current = false;
      }
    }
  }, [stopAutoplay]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    let wakeTimeout: (() => void) | undefined;
    const runVersion = runVersionRef.current;
    (async () => {
      while (!cancelled && runningRef.current) {
        const startedAt = performance.now();
        const ok = await step(runVersion);
        if (!ok || cancelled || !runningRef.current) break;
        const waitMs = Math.max(0, tickMs - (performance.now() - startedAt));
        if (waitMs > 0) {
          await new Promise<void>((resolve) => {
            wakeTimeout = resolve;
            timeoutId = window.setTimeout(resolve, waitMs);
          });
          wakeTimeout = undefined;
          timeoutId = undefined;
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      wakeTimeout?.();
      if (runVersionRef.current === runVersion) {
        runVersionRef.current += 1;
        requestRef.current?.abort();
        requestRef.current = null;
        busyRef.current = false;
      }
    };
  }, [running, tickMs, step]);

  const toggleRun = () => {
    if (game.status !== "playing") return;
    const next = !runningRef.current;
    if (next) {
      runVersionRef.current += 1;
      lastActiveRef.current = Date.now();
      setError(null);
      runningRef.current = true;
      setRunning(true);
    } else {
      stopAutoplay();
    }
  };

  const legal = jev?.legal || legalMoves(game);
  const legalSet = useMemo(() => new Set(legal), [legal]);
  const probs = jev?.response?.probabilities || {};
  const chosen = (jev?.response?.choice as string) || "";
  const chosenPct =
    chosen && typeof probs[chosen] === "number" ? fmtPct(probs[chosen]) : null;

  const statusKind =
    game.status === "won"
      ? "won"
      : game.status === "lost"
        ? "collision"
        : running
          ? "running"
          : "idle";

  const statusLabel =
    statusKind === "won"
      ? "Won"
      : statusKind === "collision"
        ? "Collision"
        : statusKind === "running"
          ? "Running"
          : "Idle";

  const callView = useMemo(() => buildCallView(jev), [jev]);
  const jsonHtml = useMemo(
    () => (callView.payload ? highlightJson(callView.payload) : ""),
    [callView.payload],
  );

  const headMeta = callView.head ? `[${callView.head[0]}, ${callView.head[1]}]` : "—";
  const foodMeta = callView.food ? `[${callView.food[0]}, ${callView.food[1]}]` : "—";

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>jev / snake</h1>
          <span className={`status-pill ${statusKind}`}>
            <span className="status-dot" aria-hidden />
            {statusLabel}
          </span>
        </div>

        <div className="header-metrics">
          <span className="metric score">
            <span className="metric-label">Score</span>
            <span className="metric-value">{game.challenges.score}</span>
          </span>
          <span className="metric step">
            <span className="metric-label">Step</span>
            <span className="metric-value">{game.ticks}</span>
          </span>
          <span className="metric latency">
            <span className="metric-label">Latency</span>
            <span className="metric-value">
              {jev?.held ? "held · 0 ms" : jev?.latencyMs != null ? `${jev.latencyMs} ms` : "—"}
            </span>
          </span>
        </div>

        <div className="header-right" role="toolbar" aria-label="Game controls">
          <button
            type="button"
            className="btn btn-primary"
            onClick={toggleRun}
            disabled={game.status !== "playing"}
            aria-pressed={running}
          >
            {running ? "Pause" : "Start"}
          </button>
          <button type="button" className="btn btn-outline" onClick={reset}>
            Reset
          </button>
          <div className="btn-gear-wrap" ref={gearRef}>
            <button
              type="button"
              className={"btn btn-gear" + (batch ? " on" : "")}
              aria-label="Settings"
              aria-expanded={gearOpen}
              title="Settings"
              onClick={() => setGearOpen((o) => !o)}
            >
              ⚙
            </button>
            {gearOpen && (
              <div className="gear-menu" role="menu">
                <label>
                  <input
                    type="checkbox"
                    checked={batch}
                    onChange={(e) => setBatch(e.target.checked)}
                  />
                  Batch foresight
                </label>
                <label>
                  Cadence
                  <input
                    type="number"
                    value={tickMs}
                    min={0}
                    step={10}
                    onChange={(e) => setTickMs(Math.max(0, Number(e.target.value) || 0))}
                    title="Target milliseconds per move; Jev request time counts toward it"
                  />
                  <span className="muted">ms</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="main">
        <BoardPanel game={game} />

        <ProbsPanel
          probs={probs}
          chosen={chosen}
          chosenPct={chosenPct}
          legalSet={legalSet}
          currentDir={game.dir}
          held={jev?.held ?? false}
        />
      </div>

      <JsonPanel
        headMeta={headMeta}
        foodMeta={foodMeta}
        html={jsonHtml}
        empty={!jev}
        held={jev?.held ?? false}
      />
    </div>
  );
}

/* ---------- memoized panels ---------- */

const BoardPanel = memo(function BoardPanel({ game }: { game: Game }) {
  const occupied = useMemo(() => {
    const map = new Map<string, "H" | "o" | "*">();
    for (let i = game.snake.length - 1; i >= 0; i--) {
      const p = game.snake[i];
      map.set(`${p.x},${p.y}`, i === 0 ? "H" : "o");
    }
    if (game.food) map.set(`${game.food.x},${game.food.y}`, "*");
    return map;
  }, [game.snake, game.food]);

  return (
    <section className="panel board-panel">
      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${game.width}, var(--cell))`,
          ["--cols" as string]: String(game.width),
          ["--rows" as string]: String(game.height),
        }}
        aria-label="Snake board"
      >
        {Array.from({ length: game.height }, (_, y) =>
          Array.from({ length: game.width }, (_, x) => {
            const c = occupied.get(`${x},${y}`);
            if (c === "H") {
              return (
                <div key={`${x}-${y}`} className={`cell cell-head dir-${game.dir}`}>
                  <span className="eye eye-a" />
                  <span className="eye eye-b" />
                </div>
              );
            }
            if (c === "o") {
              return <div key={`${x}-${y}`} className="cell cell-body" />;
            }
            if (c === "*") {
              return (
                <div key={`${x}-${y}`} className="cell cell-food-wrap">
                  <span className="food-dot" />
                </div>
              );
            }
            return <div key={`${x}-${y}`} className="cell cell-empty" />;
          }),
        )}
      </div>
    </section>
  );
});

const ProbsPanel = memo(function ProbsPanel({
  probs,
  chosen,
  chosenPct,
  legalSet,
  currentDir,
  held,
}: {
  probs: Record<string, number>;
  chosen: string;
  chosenPct: string | null;
  legalSet: Set<Dir>;
  currentDir: Dir;
  held: boolean;
}) {
  const choiceText = held
    ? `held: ${chosen || "—"} · cached Jev`
    : chosen && chosenPct
      ? `choice: ${chosen} (${chosenPct})`
      : chosen
        ? `choice: ${chosen}`
        : "choice: —";

  return (
    <section className="panel probs-panel">
      <div className="panel-head">
        <h2 className="panel-title">Move Probabilities</h2>
        <span className="panel-meta">{choiceText}</span>
      </div>
      <div className="prob-list">
        {ALL_DIRS.map((m) => {
          const ok = legalSet.has(m);
          const p = ok ? Number(probs[m] ?? 0) : 0;
          const active = Boolean(chosen) && m === chosen;
          const tag = tagForMove(m, currentDir, legalSet);
          const pctStr = ok ? fmtPct(p) : "0.0%";
          const widthPct = ok ? Math.max(0, Math.min(100, p * 100)) : 0;
          return (
            <div key={m} className={"prob-row" + (active ? " chosen" : "")}>
              <span className="prob-label">
                <span className="arrow" aria-hidden>
                  {DIR_ARROW[m]}
                </span>
                {m}
              </span>
              <div className="prob-track">
                <div className="prob-fill" style={{ width: `${widthPct}%` }} />
              </div>
              <span className="prob-pct">{pctStr}</span>
              <span className={`prob-tag ${tag}`}>{tag}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
});

const JsonPanel = memo(function JsonPanel({
  headMeta,
  foodMeta,
  html,
  empty,
  held,
}: {
  headMeta: string;
  foodMeta: string;
  html: string;
  empty: boolean;
  held: boolean;
}) {
  return (
    <section className="panel json-panel">
      <div className="panel-head">
        <h2 className="panel-title">Last /v1/systemone Call</h2>
        <span className="panel-meta">
          {held && <span className="held-indicator">held · no API this tick</span>}
          head {headMeta} · food {foodMeta}
        </span>
      </div>
      {empty ? (
        <pre className="json-body json-empty">Waiting for first tick…</pre>
      ) : (
        <pre className="json-body" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </section>
  );
});

