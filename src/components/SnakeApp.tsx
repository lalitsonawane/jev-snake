"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ALL_DIRS,
  applyMove,
  createGame,
  DEFAULT_H,
  DEFAULT_W,
  foodHint,
  legalMoves,
  serializeState,
  type Dir,
  type Game,
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
};

export default function SnakeApp() {
  const [game, setGame] = useState<Game>(() => createGame(DEFAULT_W, DEFAULT_H));
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState(false);
  const [jev, setJev] = useState<JevTick | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tickMs, setTickMs] = useState(0);

  const gameRef = useRef(game);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const batchRef = useRef(false);
  const lastActiveRef = useRef(Date.now());
  /** Autoplay stops after this many ms with no user activity / hidden tab. */
  const IDLE_MS = 90_000;

  useEffect(() => {
    gameRef.current = game;
  }, [game]);
  useEffect(() => {
    batchRef.current = batch;
  }, [batch]);

  const bumpActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  // Stop autoplay when tab hidden or user idle — saves Jev tokens
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && runningRef.current) {
        runningRef.current = false;
        setRunning(false);
        setError("Autoplay stopped — tab hidden (saves Jev tokens). Hit Start to resume.");
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
      if (document.hidden) return; // visibility handler already stops
      if (Date.now() - lastActiveRef.current < IDLE_MS) return;
      runningRef.current = false;
      setRunning(false);
      setError("Autoplay stopped after 90s idle — no Jev calls while you're away. Hit Start to resume.");
    }, 5000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("keydown", onAct);
      window.removeEventListener("mousemove", onAct);
      window.removeEventListener("scroll", onAct);
      window.clearInterval(id);
    };
  }, [bumpActivity]);

  const reset = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    setError(null);
    setJev(null);
    const g = createGame(DEFAULT_W, DEFAULT_H);
    gameRef.current = g;
    setGame(g);
  }, []);

  const step = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    const g = gameRef.current;
    if (g.status !== "playing") {
      runningRef.current = false;
      setRunning(false);
      return false;
    }

    const legal = legalMoves(g);
    if (!legal.length) {
      const lost = { ...g, status: "lost" as const };
      gameRef.current = lost;
      setGame(lost);
      runningRef.current = false;
      setRunning(false);
      return false;
    }

    busyRef.current = true;
    const useBatch = batchRef.current;
    const state = serializeState(g, legal);

    // Soft phase flip only — keep prior response/request so panels don't blank/flicker
    setJev((prev) => ({
      request: prev?.request ?? state,
      response: prev?.response ?? {},
      latencyMs: prev?.latencyMs ?? 0,
      phase: useBatch ? "batch foresight…" : "Choice(move)…",
      legal,
      batch: useBatch,
    }));
    setError(null);

    try {
      const res = await fetch("/api/jev-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, legal_moves: legal, batch: useBatch }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setJev({
          request: data.request ?? state,
          response: data.body ?? data.response ?? {},
          latencyMs: data.latencyMs ?? 0,
          phase: "error",
          legal,
          batch: useBatch,
        });
        runningRef.current = false;
        setRunning(false);
        return false;
      }

      const move = data.response?.choice as Dir | undefined;
      // Every move must come from Jev — no local/heuristic fallback
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
        });
        runningRef.current = false;
        setRunning(false);
        return false;
      }

      // One combined paint: apply move then publish Jev (game first for board, jev second)
      const next = applyMove(g, move);
      gameRef.current = next;
      setGame(next);
      setJev({
        request: data.request,
        response: data.response,
        latencyMs: data.latencyMs,
        phase: "completed",
        legal,
        batch: useBatch,
      });

      if (next.status !== "playing") {
        runningRef.current = false;
        setRunning(false);
        return false;
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      runningRef.current = false;
      setRunning(false);
      return false;
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    (async () => {
      while (!cancelled && runningRef.current) {
        const ok = await step();
        if (!ok || cancelled || !runningRef.current) break;
        if (tickMs > 0) await new Promise((r) => setTimeout(r, tickMs));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [running, tickMs, step]);

  const toggleRun = () => {
    if (game.status !== "playing") return;
    const next = !runningRef.current;
    if (next) {
      lastActiveRef.current = Date.now();
      setError(null);
    }
    runningRef.current = next;
    setRunning(next);
  };

  const cells = game.width * game.height;
  const legal = jev?.legal || legalMoves(game);
  const legalSet = useMemo(() => new Set(legal), [legal]);
  const probs = jev?.response?.probabilities || {};
  const scores = jev?.response?.scores;
  const chosen = (jev?.response?.choice as string) || "—";
  const hint = useMemo(() => foodHint(game.snake[0], game.food), [game.snake, game.food]);
  const ch = game.challenges;
  const danger = legal.length <= 1 && game.status === "playing";

  // Stable JSON strings — only recompute when completed payload changes
  const reqJson = useMemo(
    () => (jev?.request != null ? JSON.stringify(jev.request, null, 2) : ""),
    [jev?.request],
  );
  const resJson = useMemo(
    () => (jev?.response != null ? JSON.stringify(jev.response, null, 2) : ""),
    [jev?.response],
  );

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Jev Snake</h1>
          <p className="sub">
            Hunt food · fill the board ({DEFAULT_W}×{DEFAULT_H}) · every move via TypeSafe Jev
          </p>
        </div>
        <div className="controls">
          <button className="btn" onClick={toggleRun} disabled={game.status !== "playing"}>
            {running ? "Pause" : "Autoplay"}
          </button>
          <button
            className="btn"
            onClick={() => void step()}
            disabled={running || game.status !== "playing"}
          >
            Step
          </button>
          <button className="btn btn-secondary" onClick={reset}>
            Reset
          </button>
          <label className={"toggle" + (batch ? " on" : "")}>
            <input
              type="checkbox"
              checked={batch}
              onChange={(e) => setBatch(e.target.checked)}
            />
            Batch foresight
          </label>
          <label className="field">
            extra delay
            <input
              type="number"
              value={tickMs}
              min={0}
              step={25}
              onChange={(e) => setTickMs(Math.max(0, Number(e.target.value) || 0))}
            />
            ms
          </label>
        </div>
      </header>

      {(game.status !== "playing" || error) && (
        <div
          className={
            "banner " +
            (error ? "banner-err" : game.status === "won" ? "banner-win" : "banner-lost")
          }
        >
          {error
            ? `Autoplay paused — ${error}`
            : game.status === "won"
              ? `WIN — board filled! Score ${ch.score} · ${ch.foodsEaten} foods · ${game.ticks} ticks`
              : `LOST at tick ${game.ticks} · score ${ch.score}`}
        </div>
      )}

      <div className="main">
        <BoardPanel
          game={game}
          cells={cells}
          danger={danger}
          huntText={
            hint.dist == null
              ? "—"
              : `${hint.dist} away · prefer ${hint.prefer.join("/") || "—"}`
          }
        />

        <DashPanel
          chosen={chosen}
          latencyMs={jev?.latencyMs}
          confidence={jev?.response?.confidence}
          phase={jev?.phase ?? "idle"}
          cells={cells}
          snakeLen={game.snake.length}
          challenges={ch}
          probs={probs}
          scores={scores}
          foresight={jev?.response?.foresight}
          legalSet={legalSet}
          batch={batch || Boolean(jev?.batch)}
        />
      </div>

      <RawPanel
        phase={jev?.phase ?? "idle"}
        reqJson={reqJson}
        resJson={resJson}
        empty={!jev}
      />
    </div>
  );
}

/* ---------- memoized panels (stable layout, update highlights/numbers only) ---------- */

const BoardPanel = memo(function BoardPanel({
  game,
  cells,
  danger,
  huntText,
}: {
  game: Game;
  cells: number;
  danger: boolean;
  huntText: string;
}) {
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
      <div className="panel-meta">
        <span>
          tick {game.ticks} · {game.status}
          {danger ? " · ⚠ danger" : ""}
        </span>
        <span>
          len {game.snake.length}/{cells}
        </span>
      </div>
      <div
        className="board"
        style={{ gridTemplateColumns: `repeat(${game.width}, var(--cell))` }}
      >
        {Array.from({ length: game.height }, (_, y) =>
          Array.from({ length: game.width }, (_, x) => {
            const c = occupied.get(`${x},${y}`);
            const kind =
              c === "H"
                ? "cell-head"
                : c === "o"
                  ? "cell-body"
                  : c === "*"
                    ? "cell-food"
                    : "cell-empty";
            return <div key={`${x}-${y}`} className={`cell ${kind}`} />;
          }),
        )}
      </div>
      <div className="hunt-line">Target food: {huntText}</div>
    </section>
  );
});

const DashPanel = memo(function DashPanel({
  chosen,
  latencyMs,
  confidence,
  phase,
  cells,
  snakeLen,
  challenges: ch,
  probs,
  scores,
  foresight,
  legalSet,
  batch,
}: {
  chosen: string;
  latencyMs?: number;
  confidence?: number;
  phase: string;
  cells: number;
  snakeLen: number;
  challenges: Game["challenges"];
  probs: Record<string, number>;
  scores?: JevResponse["scores"];
  foresight?: JevResponse["foresight"];
  legalSet: Set<Dir>;
  batch: boolean;
}) {
  return (
    <section className="panel dash-panel">
      <div className="panel-title">Dashboard</div>
      <div className="dash-grid">
        <DashStat label="Chosen move" value={String(chosen).toUpperCase()} big />
        <DashStat label="Latency" value={`${latencyMs ?? "—"} ms`} />
        <DashStat label="Length / goal" value={`${snakeLen} / ${cells}`} />
        <DashStat label="Confidence" value={fmtPct(confidence)} />
        <DashStat label="Phase" value={phase} />
        <DashStat
          label="Foresight"
          value={batch ? String(foresight?.choice ?? "—").toUpperCase() : "off"}
        />
      </div>

      <div className="panel-title challenge-title">Challenges</div>
      <div className="dash-grid">
        <DashStat label="Score" value={String(ch.score)} big />
        <DashStat label="Level" value={`L${ch.level}`} />
        <DashStat label="Foods eaten" value={String(ch.foodsEaten)} />
        <DashStat label="Food streak" value={String(ch.foodStreak)} />
        <DashStat label="Ticks to food" value={String(ch.ticksSinceFood)} />
        <DashStat
          label="Best food time"
          value={ch.bestFoodTicks == null ? "—" : `${ch.bestFoodTicks}t`}
        />
        <DashStat label="Near-misses" value={String(ch.nearMisses)} />
        <DashStat label="Fill %" value={`${Math.round((snakeLen / cells) * 100)}%`} />
      </div>

      <div className="prob-heading">
        All moves (fixed){batch ? " · batch scores" : ""} — illegal disabled
      </div>
      <div className="prob-list fixed">
        {ALL_DIRS.map((m) => {
          const ok = legalSet.has(m);
          const p = ok ? Number(probs[m] ?? 0) : 0;
          const active = ok && m === chosen;
          const sc = scores?.[m]?.score;
          return (
            <div key={m} className={"prob-row" + (ok ? "" : " disabled")}>
              <span className={"prob-name" + (active ? " active" : "")}>
                {m}
                {!ok ? " ✕" : ""}
              </span>
              <div className="prob-track">
                <div
                  className={"prob-fill" + (active ? " active" : "")}
                  style={{ width: `${Math.max(0, Math.min(100, p * 100))}%` }}
                />
              </div>
              <span className="prob-pct">
                {ok ? fmtPct(p) : "—"}
                {batch && ok && typeof sc === "number" ? ` · s${sc.toFixed(2)}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
});

const RawPanel = memo(function RawPanel({
  phase,
  reqJson,
  resJson,
  empty,
}: {
  phase: string;
  reqJson: string;
  resJson: string;
  empty: boolean;
}) {
  return (
    <details className="panel raw-panel" open>
      <summary>
        Raw Jev I/O <span className="muted">· {phase}</span>
      </summary>
      {empty ? (
        <div className="muted">Waiting for first tick…</div>
      ) : (
        <div className="raw-split">
          <div>
            <div className="raw-label">REQUEST</div>
            <pre className="raw-pre">{reqJson}</pre>
          </div>
          <div>
            <div className="raw-label">RESPONSE</div>
            <pre className="raw-pre">{resJson}</pre>
          </div>
        </div>
      )}
    </details>
  );
});

function DashStat({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="dash-stat">
      <div className="label">{label}</div>
      <div className={"value" + (big ? " big" : "")}>{value}</div>
    </div>
  );
}

function fmtPct(n: unknown) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
