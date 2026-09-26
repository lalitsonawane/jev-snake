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
  endgameAnnouncement,
  legalMoves,
  serializeState,
  straightShotSteps,
  type Dir,
  type Game,
  type Pt,
} from "@/lib/snake";
import type { ProviderId } from "@/lib/systemone";

type ModelResponse = {
  model?: string;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  scores?: Record<string, { score?: number; confidence?: number }>;
  foresight?: {
    choice?: string;
    confidence?: number;
    probabilities?: Record<string, number>;
  } | null;
  usage?: unknown;
  evaluation_time_ms?: number;
  request_id?: string;
  batch?: boolean;
};

type ModelTick = {
  provider: ProviderId;
  request: unknown;
  response: ModelResponse;
  latencyMs: number;
  legal: Dir[];
  held: boolean;
};

type StraightHold = {
  dir: Dir;
  target: Pt;
};

/** Default visual cadence. Network time counts toward this target interval. */
const DEFAULT_TICK_MS = 90;
/** Stop hidden/idle autoplay before it can spend unattended tokens. */
const AUTOPLAY_IDLE_MS = 60_000;
const DIR_SET: ReadonlySet<string> = new Set(ALL_DIRS);

type PlayMode = "jev" | "drex" | "compare";

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

const PROVIDER_LABEL: Record<ProviderId, string> = {
  jev: "Jev",
  drex: "Drex",
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

function isDir(value: unknown): value is Dir {
  return typeof value === "string" && DIR_SET.has(value);
}

function choiceLabel(
  chosen: string,
  chosenPct: string | null,
  held: boolean,
  providerLabel: string,
) {
  if (held) return `held: ${chosen || "—"} · cached ${providerLabel}`;
  if (!chosen) return "choice: —";
  return chosenPct ? `choice: ${chosen} (${chosenPct})` : `choice: ${chosen}`;
}

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

/** Compact view of last System One I/O for the JSON panel. */
function buildCallView(tick: ModelTick | null): {
  head: [number, number] | null;
  food: [number, number] | null;
  payload: Record<string, unknown> | null;
} {
  if (!tick) return { head: null, food: null, payload: null };
  const req = (
    tick.request && typeof tick.request === "object" ? tick.request : {}
  ) as Record<string, unknown>;
  const res = tick.response || {};
  const head = asPair(req.head);
  const food = asPair(req.food);
  const dx = typeof req.food_dx === "number" ? req.food_dx : null;
  const dy = typeof req.food_dy === "number" ? req.food_dy : null;
  const legal = Array.isArray(req.legal)
    ? (req.legal as string[])
    : Array.isArray(tick.legal)
      ? tick.legal
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
    payload: {
      provider: tick.provider,
      model: res.model ?? null,
      state,
      move,
    },
  };
}

function highlightJson(value: unknown): string {
  const raw = JSON.stringify(value, null, 2);
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

function softTick(
  prev: ModelTick | null,
  provider: ProviderId,
  legal: Dir[],
): ModelTick {
  return {
    provider,
    request: prev?.request ?? {},
    response: prev?.response ?? {},
    latencyMs: prev?.latencyMs ?? 0,
    legal,
    held: false,
  };
}

function markHeld(prev: ModelTick | null, legal: Dir[]): ModelTick | null {
  if (!prev) return prev;
  if (
    prev.held &&
    prev.latencyMs === 0 &&
    prev.legal.length === legal.length &&
    prev.legal.every((dir, index) => dir === legal[index])
  ) {
    return prev;
  }
  return { ...prev, latencyMs: 0, legal, held: true };
}

async function fetchModelMove(
  provider: ProviderId,
  state: Record<string, unknown>,
  legal: Dir[],
  batch: boolean,
  signal: AbortSignal,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch("/api/systemone-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      state,
      legal_moves: legal,
      batch,
    }),
    signal,
  });
  const data = (await res.json()) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

function tickFromData(
  provider: ProviderId,
  legal: Dir[],
  data: Record<string, unknown>,
  fallbackState: unknown,
): ModelTick {
  return {
    provider,
    request: data.request ?? fallbackState,
    response: (data.response as ModelResponse) ||
      (data.body as ModelResponse) ||
      {},
    latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : 0,
    legal,
    held: false,
  };
}

export default function SnakeApp() {
  const [game, setGame] = useState<Game>(() => createGame(DEFAULT_W, DEFAULT_H));
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("jev");
  /** Which model's choice moves the snake when comparing. */
  const [driveWith, setDriveWith] = useState<ProviderId>("jev");
  const [gearOpen, setGearOpen] = useState(false);
  const [ticks, setTicks] = useState<Partial<Record<ProviderId, ModelTick>>>({});
  const [error, setError] = useState<string | null>(null);
  const [tickMs, setTickMs] = useState(DEFAULT_TICK_MS);

  const gameRef = useRef(game);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const batchRef = useRef(false);
  const playModeRef = useRef<PlayMode>(playMode);
  const driveWithRef = useRef<ProviderId>(driveWith);
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
  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);
  useEffect(() => {
    driveWithRef.current = driveWith;
  }, [driveWith]);

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

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && runningRef.current) {
        stopAutoplay(
          "Autoplay stopped — tab hidden (saves API tokens). Hit Start to resume.",
        );
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
        "Autoplay stopped after 1 min idle — no API calls while you're away. Hit Start to resume.",
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
    setTicks({});
    const g = createGame(DEFAULT_W, DEFAULT_H);
    gameRef.current = g;
    setGame(g);
  }, [stopAutoplay]);

  const changePlayMode = useCallback(
    (mode: PlayMode) => {
      if (mode === playMode) return;
      stopAutoplay();
      setPlayMode(mode);
      setTicks({});
      setError(null);
      if (mode !== "compare") setDriveWith(mode);
    },
    [playMode, stopAutoplay],
  );

  const step = useCallback(
    async (runVersion: number): Promise<boolean> => {
      if (busyRef.current) return false;
      const g = gameRef.current;
      if (g.status !== "playing") {
        stopAutoplay();
        return false;
      }

      const legal = legalMoves(g);
      if (!legal.length) {
        const lost = {
          ...g,
          status: "lost" as const,
          lossReason: "trapped" as const,
        };
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
        const ateFood =
          next.challenges.foodsEaten !== g.challenges.foodsEaten;
        gameRef.current = next;
        setGame(next);
        setTicks((prev) => {
          const out: Partial<Record<ProviderId, ModelTick>> = {};
          for (const id of ["jev", "drex"] as const) {
            if (prev[id]) out[id] = markHeld(prev[id]!, legal)!;
          }
          return out;
        });

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
      const mode = playModeRef.current;
      const driver: ProviderId =
        mode === "compare" ? driveWithRef.current : mode;
      const providers: ProviderId[] =
        mode === "compare" ? ["jev", "drex"] : [mode];
      const state = serializeState(g, legal);
      const controller = new AbortController();
      requestRef.current = controller;

      setTicks((prev) => {
        const next: Partial<Record<ProviderId, ModelTick>> = { ...prev };
        for (const p of providers) {
          next[p] = softTick(prev[p] ?? null, p, legal);
        }
        return next;
      });
      setError(null);

      try {
        const results = await Promise.all(
          providers.map((p) =>
            fetchModelMove(p, state, legal, useBatch, controller.signal).then(
              (r) => [p, r] as const,
            ),
          ),
        );

        if (
          controller.signal.aborted ||
          runVersion !== runVersionRef.current ||
          !runningRef.current
        ) {
          return false;
        }

        const byProvider = Object.fromEntries(results) as Record<
          ProviderId,
          { ok: boolean; status: number; data: Record<string, unknown> }
        >;

        const nextTicks: Partial<Record<ProviderId, ModelTick>> = {};
        for (const p of providers) {
          const r = byProvider[p];
          nextTicks[p] = tickFromData(p, legal, r.data, state);
        }
        setTicks(nextTicks);

        const driveResult = byProvider[driver];
        if (!driveResult.ok) {
          setError(
            (driveResult.data.error as string) ||
              `HTTP ${driveResult.status}`,
          );
          stopAutoplay();
          return false;
        }

        const move = (driveResult.data.response as ModelResponse | undefined)
          ?.choice;
        if (!isDir(move) || !legal.includes(move)) {
          const label = PROVIDER_LABEL[driver];
          setError(
            !move
              ? `${label} returned no Choice — autoplay stopped (no local fallback).`
              : `${label} chose illegal move "${move}" — autoplay stopped (no local fallback).`,
          );
          stopAutoplay();
          return false;
        }

        const shotSteps = straightShotSteps(g, move);
        const next = applyMove(g, move);
        const ateFood =
          next.challenges.foodsEaten !== g.challenges.foodsEaten;
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
    },
    [stopAutoplay],
  );

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

  const driverId: ProviderId =
    playMode === "compare" ? driveWith : playMode;
  const driverTick = ticks[driverId] ?? null;
  const legal = driverTick?.legal || legalMoves(game);
  const legalSet = useMemo(() => new Set(legal), [legal]);

  const statusKind =
    game.status === "won"
      ? "won"
      : game.status === "lost"
        ? game.lossReason === "self"
          ? "self-crash"
          : "collision"
        : running
          ? "running"
          : "idle";

  const statusLabel =
    statusKind === "won"
      ? "Won"
      : statusKind === "self-crash"
        ? "Self crash"
        : statusKind === "collision"
          ? "Collision"
          : statusKind === "running"
            ? "Running"
            : "Idle";

  const announcement = useMemo(() => endgameAnnouncement(game), [game]);

  const latencyLabel = useMemo(() => {
    if (playMode === "compare") {
      const j = ticks.jev;
      const d = ticks.drex;
      if (j?.held || d?.held) return "held · 0 ms";
      const parts: string[] = [];
      if (j?.latencyMs != null) parts.push(`J ${j.latencyMs}`);
      if (d?.latencyMs != null) parts.push(`D ${d.latencyMs}`);
      return parts.length ? `${parts.join(" / ")} ms` : "—";
    }
    const t = ticks[playMode];
    if (t?.held) return "held · 0 ms";
    return t?.latencyMs != null ? `${t.latencyMs} ms` : "—";
  }, [playMode, ticks]);

  const comparePayload = useMemo(() => {
    if (playMode !== "compare") return null;
    const j = ticks.jev ? buildCallView(ticks.jev).payload : null;
    const d = ticks.drex ? buildCallView(ticks.drex).payload : null;
    if (!j && !d) return null;
    return { jev: j, drex: d };
  }, [playMode, ticks]);

  const singleCallView = useMemo(
    () => buildCallView(playMode === "compare" ? driverTick : ticks[playMode] ?? null),
    [playMode, ticks, driverTick],
  );

  const jsonHtml = useMemo(() => {
    if (playMode === "compare") {
      return comparePayload ? highlightJson(comparePayload) : "";
    }
    return singleCallView.payload ? highlightJson(singleCallView.payload) : "";
  }, [playMode, comparePayload, singleCallView.payload]);

  const headMeta = singleCallView.head
    ? `[${singleCallView.head[0]}, ${singleCallView.head[1]}]`
    : "—";
  const foodMeta = singleCallView.food
    ? `[${singleCallView.food[0]}, ${singleCallView.food[1]}]`
    : "—";

  const anyHeld =
    playMode === "compare"
      ? Boolean(ticks.jev?.held || ticks.drex?.held)
      : Boolean(ticks[playMode]?.held);
  const anyTick =
    playMode === "compare"
      ? Boolean(ticks.jev || ticks.drex)
      : Boolean(ticks[playMode]);

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
            <span className="metric-value">{latencyLabel}</span>
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
              className={"btn btn-gear" + (batch || playMode !== "jev" ? " on" : "")}
              aria-label="Settings"
              aria-expanded={gearOpen}
              title="Settings"
              onClick={() => setGearOpen((o) => !o)}
            >
              ⚙
            </button>
            {gearOpen && (
              <div className="gear-menu" role="menu">
                <fieldset className="gear-fieldset">
                  <legend>Model</legend>
                  {(
                    [
                      ["jev", "Jev only"],
                      ["drex", "Drex only"],
                      ["compare", "Compare both"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="play-mode"
                        checked={playMode === value}
                        onChange={() => changePlayMode(value)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                {playMode === "compare" && (
                  <fieldset className="gear-fieldset">
                    <legend>Drive moves with</legend>
                    {(["jev", "drex"] as const).map((id) => (
                      <label key={id}>
                        <input
                          type="radio"
                          name="drive-with"
                          checked={driveWith === id}
                          onChange={() => {
                            stopAutoplay();
                            setDriveWith(id);
                          }}
                        />
                        {PROVIDER_LABEL[id]} choice
                      </label>
                    ))}
                  </fieldset>
                )}
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
                    onChange={(e) =>
                      setTickMs(Math.max(0, Number(e.target.value) || 0))
                    }
                    title="Target milliseconds per move; API request time counts toward it"
                  />
                  <span className="muted">ms</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        className="model-bar"
        role="group"
        aria-label="Model selection"
      >
        <button
          type="button"
          className={"model-chip" + (playMode === "jev" ? " active" : "")}
          aria-pressed={playMode === "jev"}
          onClick={() => changePlayMode("jev")}
        >
          Jev
        </button>
        <button
          type="button"
          className={"model-chip" + (playMode === "drex" ? " active" : "")}
          aria-pressed={playMode === "drex"}
          onClick={() => changePlayMode("drex")}
        >
          Drex
        </button>
        <button
          type="button"
          className={
            "model-chip model-chip-compare" +
            (playMode === "compare" ? " active" : "")
          }
          aria-pressed={playMode === "compare"}
          onClick={() => changePlayMode("compare")}
        >
          Compare side by side
        </button>
        {playMode === "compare" && (
          <span className="model-drive-hint">
            Moves apply from{" "}
            <strong>{PROVIDER_LABEL[driveWith]}</strong>
            {" · "}
            <button
              type="button"
              className="linkish"
              onClick={() => {
                stopAutoplay();
                setDriveWith((d) => (d === "jev" ? "drex" : "jev"));
              }}
            >
              switch driver
            </button>
          </span>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className={"main" + (playMode === "compare" ? " main-compare" : "")}>
        <div className="board-stage">
          <BoardPanel game={game} />
          {announcement && (
            <div
              className={
                "endgame-overlay" +
                (game.status === "won"
                  ? " endgame-won"
                  : game.lossReason === "self"
                    ? " endgame-self"
                    : " endgame-lost")
              }
              role="status"
              aria-live="polite"
            >
              <div className="endgame-card">
                <p className="endgame-kicker">
                  {game.status === "won"
                    ? "Victory"
                    : game.lossReason === "self"
                      ? "Classic rule"
                      : "Ended"}
                </p>
                <h2 className="endgame-title">{announcement.title}</h2>
                <p className="endgame-detail">{announcement.detail}</p>
                <dl className="endgame-stats">
                  <div>
                    <dt>Score</dt>
                    <dd>{game.challenges.score}</dd>
                  </div>
                  <div>
                    <dt>Length</dt>
                    <dd>{game.snake.length}</dd>
                  </div>
                  <div>
                    <dt>Steps</dt>
                    <dd>{game.ticks}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="btn btn-primary endgame-cta"
                  onClick={reset}
                >
                  Play again
                </button>
              </div>
            </div>
          )}
        </div>

        {playMode === "compare" ? (
          <div className="compare-probs">
            <ProbsPanel
              title="Jev probabilities"
              provider="jev"
              tick={ticks.jev ?? null}
              legalSet={legalSet}
              currentDir={game.dir}
              driving={driveWith === "jev"}
            />
            <ProbsPanel
              title="Drex probabilities"
              provider="drex"
              tick={ticks.drex ?? null}
              legalSet={legalSet}
              currentDir={game.dir}
              driving={driveWith === "drex"}
            />
          </div>
        ) : (
          <ProbsPanel
            title="Move Probabilities"
            provider={playMode}
            tick={ticks[playMode] ?? null}
            legalSet={legalSet}
            currentDir={game.dir}
            driving
          />
        )}
      </div>

      <JsonPanel
        headMeta={headMeta}
        foodMeta={foodMeta}
        html={jsonHtml}
        empty={!anyTick}
        held={anyHeld}
        compare={playMode === "compare"}
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
  title,
  provider,
  tick,
  legalSet,
  currentDir,
  driving,
}: {
  title: string;
  provider: ProviderId;
  tick: ModelTick | null;
  legalSet: Set<Dir>;
  currentDir: Dir;
  driving: boolean;
}) {
  const probs = tick?.response?.probabilities || {};
  const chosen = (tick?.response?.choice as string) || "";
  const chosenPct =
    chosen && typeof probs[chosen] === "number" ? fmtPct(probs[chosen]) : null;
  const held = tick?.held ?? false;
  const choiceText = choiceLabel(
    chosen,
    chosenPct,
    held,
    PROVIDER_LABEL[provider],
  );
  const conf =
    typeof tick?.response?.confidence === "number"
      ? fmtPct(tick.response.confidence)
      : null;

  return (
    <section
      className={
        "panel probs-panel" + (driving ? " probs-driving" : " probs-reference")
      }
    >
      <div className="panel-head">
        <h2 className="panel-title">
          {title}
          {driving && <span className="drive-badge">driving</span>}
        </h2>
        <span className="panel-meta">
          {choiceText}
          {conf ? ` · conf ${conf}` : ""}
          {tick?.latencyMs != null && !held ? ` · ${tick.latencyMs} ms` : ""}
        </span>
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
  compare,
}: {
  headMeta: string;
  foodMeta: string;
  html: string;
  empty: boolean;
  held: boolean;
  compare: boolean;
}) {
  return (
    <section className="panel json-panel">
      <div className="panel-head">
        <h2 className="panel-title">
          {compare ? "Last compare · /v1/systemone" : "Last /v1/systemone Call"}
        </h2>
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
