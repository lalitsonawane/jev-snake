"use client";

import { memo, useEffect, useId, useMemo, useState } from "react";

import type { ProviderId } from "@/lib/systemone";
import {
  avgMs,
  type SessionStats,
} from "@/lib/provider-stats";

export type FlowTickLite = {
  provider: ProviderId;
  latencyMs: number;
  held: boolean;
  response: {
    choice?: string;
    confidence?: number;
    probabilities?: Record<string, number>;
    model?: string;
    evaluation_time_ms?: number;
    usage?: unknown;
  };
};

type PlayMode = "jev" | "drex" | "compare";

type FlowSamplerProps = {
  playMode: PlayMode;
  driveWith: ProviderId;
  running: boolean;
  ticks: Partial<Record<ProviderId, FlowTickLite>>;
  sessionStats: SessionStats;
  gameTicks: number;
  score: number;
};

const PROVIDER_LABEL: Record<ProviderId, string> = {
  jev: "Jev",
  drex: "Drex",
};

function parseTokens(usage: unknown): { in: number; out: number } {
  if (!usage || typeof usage !== "object") return { in: 0, out: 0 };
  const u = usage as Record<string, unknown>;
  const inn =
    typeof u.input_tokens === "number"
      ? u.input_tokens
      : typeof u.prompt_tokens === "number"
        ? u.prompt_tokens
        : 0;
  const out =
    typeof u.output_tokens === "number"
      ? u.output_tokens
      : typeof u.completion_tokens === "number"
        ? u.completion_tokens
        : 0;
  return { in: inn || 0, out: out || 0 };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/** Zigzag polyline through a serial path (LLM-style contrast). */
function SerialPath({ activeStep }: { activeStep: number }) {
  const pts = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    let x = 18;
    let y = 70;
    for (let i = 0; i < 14; i++) {
      out.push({ x, y });
      x += 18;
      y = i % 2 === 0 ? 38 : 102;
    }
    return out;
  }, []);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const focus = pts[Math.min(activeStep, pts.length - 1)];

  return (
    <svg className="fs-svg" viewBox="0 0 260 140" aria-hidden="true">
      <path className="fs-serial-trail" d={d} fill="none" />
      <path className="fs-serial-draw" d={d} fill="none" />
      {pts.map((p, i) => (
        <circle
          key={i}
          className={"fs-serial-dot" + (i === activeStep ? " on" : "")}
          cx={p.x}
          cy={p.y}
          r={i === activeStep ? 5.5 : 2.8}
        />
      ))}
      <circle className="fs-serial-focus" cx={focus.x} cy={focus.y} r={14} />
      <text className="fs-serial-num" x={focus.x} y={focus.y + 4} textAnchor="middle">
        {String(activeStep + 1).padStart(2, "0")}
      </text>
    </svg>
  );
}

/** Radial pulse — every answer at once (System One). */
function ParallelBurst({ pulse }: { pulse: number }) {
  // Pre-rounded so SSR + client markup match (no hydration float drift).
  const rays = useMemo(() => {
    const n = 28;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const len = 42 + (i % 5) * 8;
      return {
        x2: Number((130 + Math.cos(a) * len).toFixed(2)),
        y2: Number((70 + Math.sin(a) * len * 0.72).toFixed(2)),
        delay: Number(((i % 8) * 0.08).toFixed(2)),
      };
    });
  }, []);

  return (
    <svg className="fs-svg" viewBox="0 0 260 140" aria-hidden="true">
      <circle className="fs-burst-ring" cx="130" cy="70" r="48" />
      <circle className="fs-burst-ring delay" cx="130" cy="70" r="62" />
      {rays.map((r, i) => (
        <line
          key={i}
          className="fs-burst-ray"
          x1="130"
          y1="70"
          x2={r.x2}
          y2={r.y2}
          style={{ animationDelay: `${r.delay}s` }}
        />
      ))}
      <circle className="fs-burst-core" cx="130" cy="70" r="9" />
      <text className="fs-burst-label" x="130" y="74" textAnchor="middle">
        {String((pulse % 8) + 1).padStart(2, "0")}
      </text>
    </svg>
  );
}

function SerialClock() {
  return (
    <svg className="fs-clock" viewBox="0 0 120 28" aria-hidden="true">
      <line className="fs-clock-base" x1="8" y1="20" x2="112" y2="8" />
      <circle className="fs-clock-bead serial" cx="8" cy="20" r="3.5" />
    </svg>
  );
}

function ParallelClock() {
  const pts = "0,18 10,10 20,16 30,6 40,14 50,4 60,12 70,8 80,15 90,5 100,11 110,7 120,13";
  return (
    <svg className="fs-clock" viewBox="0 0 120 28" aria-hidden="true">
      <polyline className="fs-clock-wave" points={pts} fill="none" />
      <polyline className="fs-clock-wave pulse" points={pts} fill="none" />
    </svg>
  );
}

function ConfidenceGrid({
  probs,
  confidence,
}: {
  probs: Record<string, number> | undefined;
  confidence: number | null;
}) {
  const cells = useMemo(() => {
    const vals = probs
      ? Object.values(probs).filter((v) => typeof v === "number")
      : [];
    const base =
      vals.length > 0
        ? vals
        : confidence != null
          ? [confidence, confidence * 0.92, confidence * 0.85]
          : [0.72, 0.81, 0.64, 0.9, 0.55, 0.78, 0.88, 0.61, 0.7];
    const out: number[] = [];
    for (let i = 0; i < 9; i++) {
      out.push(base[i % base.length]!);
    }
    return out;
  }, [probs, confidence]);

  return (
    <div className="fs-conf-grid" aria-hidden="true">
      {cells.map((v, i) => (
        <span
          key={i}
          className="fs-conf-cell"
          style={{
            ["--fs-c" as string]: String(Math.max(0.15, Math.min(1, v))),
            animationDelay: `${(i % 3) * 0.12 + Math.floor(i / 3) * 0.05}s`,
          }}
        >
          {v.toFixed(2)}
        </span>
      ))}
    </div>
  );
}

function SparkBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="fs-spark-bars" aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.round((v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function CostTrace() {
  return (
    <svg className="fs-spark-line" viewBox="0 0 80 28" aria-hidden="true">
      <path
        className="fs-cost-path"
        d="M2,20 C12,18 18,8 28,12 S48,24 58,10 72,6 78,14"
        fill="none"
      />
    </svg>
  );
}

export const FlowSampler = memo(function FlowSampler({
  playMode,
  driveWith,
  running,
  ticks,
  sessionStats,
  gameTicks,
  score,
}: FlowSamplerProps) {
  const uid = useId();
  const reduced = usePrefersReducedMotion();
  const driverId: ProviderId = playMode === "compare" ? driveWith : playMode;
  const driver = ticks[driverId] ?? null;
  const live = Boolean(driver && !driver.held);

  const [pulse, setPulse] = useState(0);
  const [serialStep, setSerialStep] = useState(0);

  // Idle demo loop + react to live ticks
  useEffect(() => {
    if (reduced) return;
    if (live) {
      setPulse((p) => p + 1);
      return;
    }
    const id = window.setInterval(() => {
      setPulse((p) => p + 1);
      setSerialStep((s) => (s + 1) % 14);
    }, running ? 420 : 900);
    return () => window.clearInterval(id);
  }, [live, driver?.latencyMs, driver?.response?.choice, running, reduced]);

  const stats = sessionStats[driverId];
  const avgLatency = avgMs(stats.latencySum, stats.latencyCount);
  const lastLatency = driver?.held
    ? 0
    : (driver?.latencyMs ?? stats.lastLatencyMs);
  const latencySec =
    lastLatency != null ? (lastLatency / 1000).toFixed(3) : "—";
  const conf =
    typeof driver?.response?.confidence === "number"
      ? driver.response.confidence
      : stats.lastConfidence;
  const tokens = parseTokens(driver?.response?.usage);
  const sessionIn = stats.inputTokens;
  const decisionsPerSec =
    avgLatency && avgLatency > 0
      ? (1000 / avgLatency).toFixed(1)
      : running
        ? "…"
        : "—";

  const parallelName =
    playMode === "compare"
      ? `${PROVIDER_LABEL.jev} · ${PROVIDER_LABEL.drex}`
      : PROVIDER_LABEL[playMode];

  const choice = driver?.response?.choice ?? "—";
  const model = driver?.response?.model ?? `${driverId}-latest`;
  const phase = live ? "LIVE TICK" : running ? "DEMO / RUN" : "DEMO / IDLE";

  const typeLine = live
    ? `STATE → QUESTIONS → ANSWERS · CHOICE ${String(choice).toUpperCase()} · CONF ${(conf ?? 0).toFixed(2)}`
    : `STATE → QUESTIONS(MOVE:CHOICE) → PROBABILITIES → APPLY_MOVE`;
  const trackLine = live
    ? `PARALLEL=TRUE · PROVIDER=${driverId.toUpperCase()} · LATENCY_MS=${lastLatency ?? "—"} · TOKENS=${tokens.in}/${tokens.out} · STEP=${gameTicks}`
    : `PARALLEL=TRUE · CORE.PULSE(${String((pulse % 8) + 1).padStart(2, "0")}) · SCORE=${score} · STEPS=${gameTicks} · MODE=${playMode.toUpperCase()}`;
  const kernelLine = live
    ? `EMIT ALL<ANSWER> · FN ROUTE(STATE) → DECISION<${String(choice).toUpperCase()}> · MODEL=${model}`
    : `SIGN<RESULT> · EMIT ALL<ANSWER> · FN ROUTE(INPUT:SIGNAL) → DECISION<RESULT>`;

  const latencyBars = useMemo(() => {
    const base = lastLatency ?? avgLatency ?? 120;
    return [base * 0.35, base, base * 0.55, base * 0.8, base * 0.4, base * 0.95];
  }, [lastLatency, avgLatency]);

  return (
    <section
      className={
        "flow-sampler" +
        (reduced ? " fs-reduced" : "") +
        (live ? " fs-live" : "") +
        (running ? " fs-running" : "")
      }
      aria-label="Application flow sampler"
      data-pulse={pulse}
    >
      <header className="fs-head">
        <div className="fs-brand">
          <p className="fs-eyebrow">TYPESAFE LAB / APPLICATION FLOW DYNAMICS</p>
          <h2 className="fs-title">
            {playMode === "compare" ? "COMPARE." : `${PROVIDER_LABEL[playMode].toUpperCase()}.`}
          </h2>
        </div>
        <div className="fs-badge-wrap">
          <span className="fs-badge">FLOW SAMPLER</span>
          <p className="fs-meta">
            N = {Math.max(gameTicks, stats.apiCalls, 1)} · {phase} ·{" "}
            <span className="fs-meta-accent">{parallelName}</span>
          </p>
        </div>
      </header>

      <div className="fs-split">
        <article className="fs-pane fs-pane-serial">
          <div className="fs-pane-head">
            <span className="fs-idx">01 / SEQUENTIAL</span>
            <span className="fs-pane-model">LLM-STYLE CONTRAST</span>
          </div>
          <p className="fs-pane-tag">ONE TOKEN AT A TIME</p>
          <div className="fs-viz">
            <SerialPath activeStep={reduced ? 6 : serialStep} />
          </div>
          <div className="fs-pane-foot">
            <span>SERIAL LINK / {String(serialStep + 1).padStart(2, "0")}</span>
            <div className="fs-clock-block">
              <span>SERIAL CLOCK / 01 SWEEP</span>
              <SerialClock />
            </div>
          </div>
        </article>

        <article className="fs-pane fs-pane-parallel">
          <div className="fs-pane-head">
            <span className="fs-idx">02 / PARALLEL</span>
            <span className="fs-pane-model">{parallelName.toUpperCase()}</span>
          </div>
          <p className="fs-pane-tag">EVERY ANSWER AT ONCE</p>
          <div className="fs-viz">
            <ParallelBurst pulse={pulse} />
          </div>
          <div className="fs-pane-foot">
            <span>
              PULSE {String((pulse % 8) + 1).padStart(2, "0")} / 08 · STATE→MOVE
            </span>
            <div className="fs-clock-block">
              <span>PARALLEL CLOCK / 08 PULSES</span>
              <ParallelClock />
            </div>
          </div>
        </article>
      </div>

      <div className="fs-metrics" role="group" aria-label="Flow metrics">
        <div className="fs-tile">
          <span className="fs-tile-k">LATENCY</span>
          <span className="fs-tile-v">{latencySec === "—" ? "—" : `${latencySec} s`}</span>
          <SparkBars values={latencyBars} />
          <span className="fs-tile-sub">ONE TALL / ROUND-TRIP</span>
        </div>
        <div className="fs-tile">
          <span className="fs-tile-k">TOKENS / CALL</span>
          <span className="fs-tile-v">
            {tokens.in || sessionIn
              ? `${tokens.in || "—"} / ${tokens.out || 0}`
              : "—"}
          </span>
          <CostTrace />
          <span className="fs-tile-sub">
            SESSION IN {sessionIn || 0} · USAGE TRACE
          </span>
        </div>
        <div className="fs-tile">
          <span className="fs-tile-k">DECISIONS/S</span>
          <span className="fs-tile-v">{decisionsPerSec}</span>
          <SparkBars
            values={[4, 6, 5, 7, 6, 8, 7, 6].map((v) =>
              decisionsPerSec === "—" ? v : v,
            )}
          />
          <span className="fs-tile-sub">
            AVG LAT {avgLatency != null ? `${avgLatency} ms` : "—"}
          </span>
        </div>
        <div className="fs-tile fs-tile-conf">
          <span className="fs-tile-k">CONFIDENCE</span>
          <span className="fs-tile-v">
            {conf != null ? conf.toFixed(2) : "—"}
          </span>
          <ConfidenceGrid
            probs={driver?.response?.probabilities}
            confidence={conf}
          />
          <span className="fs-tile-sub">CONFIDENCE GRID / PROBS</span>
        </div>
      </div>

      <div className="fs-console" aria-label="Flow console">
        <div className="fs-console-row">
          <span className="fs-console-k">TYPE /</span>
          <span className="fs-console-v" id={`${uid}-type`}>
            {typeLine}
          </span>
        </div>
        <div className="fs-console-row">
          <span className="fs-console-k">TRACK /</span>
          <span className="fs-console-v">{trackLine}</span>
        </div>
        <div className="fs-console-row">
          <span className="fs-console-k">KERNEL /</span>
          <span className="fs-console-v">{kernelLine}</span>
        </div>
      </div>
    </section>
  );
});
