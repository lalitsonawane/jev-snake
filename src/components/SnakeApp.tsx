* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  overflow-x: hidden;
}

body {
  color: #111827;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #f8fafc;
}

.app {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(1240px, 100%);
  max-width: 1240px;
  margin: 0 auto;
  padding: 14px 12px 28px;
}

/* ---------- Header ---------- */
.app-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-self: start;
  min-width: 0;
}

.header-left h1 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111827;
  white-space: nowrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.78rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-pill.running .status-dot { background: #22c55e; }
.status-pill.idle .status-dot { background: #9ca3af; }
.status-pill.collision .status-dot { background: #ef4444; }
.status-pill.self-crash .status-dot { background: #dc2626; }
.status-pill.won .status-dot { background: #2563eb; }

.header-metrics {
  display: flex;
  align-items: center;
  gap: 18px;
  justify-self: center;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.metric {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.metric.score { min-width: 72px; }
.metric.step { min-width: 64px; }
.metric.latency { min-width: 110px; }

.metric-label {
  font-size: 0.78rem;
  color: #6b7280;
  font-weight: 500;
}

.metric-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.2;
  transition: background 80ms ease, opacity 80ms ease;
  touch-action: manipulation;
}

.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: #2563eb;
  color: #fff;
  min-width: 78px;
}
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }

.btn-outline {
  background: #fff;
  color: #111827;
  border: 1px solid #e5e7eb;
  min-width: 72px;
}
.btn-outline:hover:not(:disabled) { background: #f9fafb; }

.btn-shortcuts {
  min-width: 40px;
  width: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.btn-gear {
  background: #fff;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  width: 36px;
  height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1rem;
  position: relative;
}
.btn-gear:hover { background: #f9fafb; color: #111827; }
.btn-gear.on {
  border-color: #93c5fd;
  color: #2563eb;
  background: #eff6ff;
}

.btn-gear-wrap { position: relative; }

.gear-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  padding: 10px 12px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gear-menu label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.gear-menu input[type="checkbox"],
.gear-menu input[type="radio"] { accent-color: #2563eb; }
.gear-menu input[type="number"] {
  width: 64px;
  margin-left: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 2px 6px;
}

.gear-fieldset {
  margin: 0;
  padding: 0;
  border: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gear-fieldset legend {
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 2px;
}

.model-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.model-chip {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  border-radius: 10px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.model-chip:hover {
  background: #f9fafb;
  color: #111827;
}

.model-chip.active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.model-chip-compare.active {
  border-color: #86efac;
  background: #f0fdf4;
  color: #166534;
}

.model-drive-hint {
  font-size: 0.78rem;
  color: #6b7280;
  margin-left: 4px;
}

.model-drive-hint strong {
  color: #111827;
  font-weight: 650;
}

button.linkish {
  border: none;
  background: none;
  padding: 0;
  color: #2563eb;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.error-banner {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.82rem;
  font-weight: 500;
}

.hold-banner {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 600;
}

.shortcut-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
  z-index: 40;
  padding: 16px;
}

.shortcut-card {
  width: min(100%, 420px);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
  padding: 16px;
}

.shortcut-head {
  margin-bottom: 12px;
}

.shortcut-grid {
  display: grid;
  gap: 8px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  padding: 9px 10px;
  font-size: 0.8rem;
  color: #374151;
}

.shortcut-row kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 5px 7px;
  border-radius: 7px;
  border: 1px solid #dbe3ee;
  background: #fff;
  box-shadow: inset 0 -2px 0 rgba(148, 163, 184, 0.2);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 700;
  color: #111827;
}

.mini-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  border-radius: 8px;
  padding: 5px 9px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.board-stage {
  position: relative;
  width: 100%;
  max-width: 540px;
  min-width: 0;
}

.endgame-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(2px);
  animation: endgame-fade 280ms ease-out both;
}

.endgame-card {
  width: min(100%, 320px);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  padding: 18px 18px 16px;
  text-align: center;
  animation: endgame-rise 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.endgame-kicker {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}

.endgame-self .endgame-kicker { color: #dc2626; }
.endgame-won .endgame-kicker { color: #2563eb; }

.endgame-title {
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 750;
  letter-spacing: -0.03em;
  color: #111827;
}

.endgame-detail {
  margin: 0 0 14px;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #4b5563;
}

.endgame-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0 0 14px;
  padding: 10px 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.endgame-stats div {
  margin: 0;
}

.endgame-stats dt {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.endgame-stats dd {
  margin: 2px 0 0;
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #111827;
}

.endgame-cta {
  width: 100%;
  min-height: 44px;
}

@keyframes endgame-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes endgame-rise {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .endgame-overlay,
  .endgame-card,
  .shortcut-overlay {
    animation: none;
  }
}

/* ---------- Body: board | probs ---------- */
.main {
  display: grid;
  grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  width: 100%;
}

.main-compare {
  grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
}

.side-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;
}

.compare-probs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-width: 0;
  width: 100%;
}

.compare-probs .probs-panel {
  max-width: none;
}

/* ---------- Session stats (beside probs) ---------- */
.stats-board {
  width: 100%;
  max-width: none;
  padding: 0 0 10px;
}

.stats-board-collapsed {
  padding-bottom: 8px;
}

.stats-board .panel-head {
  padding: 12px 14px 8px;
}

.panel-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stats-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  padding: 0 10px 4px;
}

.stats-columns-compare {
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stats-col {
  min-width: 0;
  padding: 8px 10px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #f8fafc;
}

.stats-columns:not(.stats-columns-compare) .stats-col {
  background: transparent;
  padding: 0 4px 4px;
}

.stats-col-driving {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.stats-col-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-bottom: 8px;
  min-height: 22px;
}

.stats-provider {
  font-size: 0.82rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}

.stats-model {
  font-size: 0.68rem;
  font-weight: 500;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  margin: 0;
}

.stats-metrics > div {
  margin: 0;
  min-width: 0;
}

.stats-metrics dt {
  margin: 0;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #6b7280;
}

.stats-metrics dd {
  margin: 1px 0 0;
  font-size: 0.86rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: #111827;
  line-height: 1.25;
}

.stats-metrics dd.stats-warn {
  color: #dc2626;
}

.stats-metrics dd.stats-choice {
  text-transform: lowercase;
}

.stats-sub {
  font-weight: 500;
  font-size: 0.72rem;
  color: #6b7280;
}

.probs-driving {
  border-color: #93c5fd;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.probs-reference {
  opacity: 0.96;
}

.drive-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  vertical-align: middle;
  text-transform: uppercase;
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  contain: layout style;
  min-width: 0;
}

.board-panel {
  width: 100%;
  max-width: 540px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board {
  --cols: 12;
  --rows: 12;
  --cell: clamp(22px, calc((100vw - 56px) / var(--cols)), 40px);
  --gap: 1px;
  display: grid;
  gap: var(--gap);
  width: calc(var(--cols) * var(--cell) + (var(--cols) - 1) * var(--gap));
  height: calc(var(--rows) * var(--cell) + (var(--rows) - 1) * var(--gap));
  max-width: 100%;
  background: #e5e7eb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.cell {
  width: var(--cell);
  height: var(--cell);
  background: #fff;
  position: relative;
}

.cell-empty { background: #fff; }

.cell-body,
.cell-head {
  background: #fff;
}

.cell-body::before,
.cell-head::before {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 8px;
  background: #3b82f6;
}

.cell-head::before {
  background: #2563eb;
}

.cell-head {
  position: relative;
  z-index: 1;
}

.cell-food-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.food-dot {
  width: calc(var(--cell) * 0.45);
  height: calc(var(--cell) * 0.45);
  border-radius: 50%;
  background: #22c55e;
}

/* Eyes oriented by direction */
.eye {
  z-index: 2;
  position: absolute;
  width: max(4px, calc(var(--cell) * 0.125));
  height: max(4px, calc(var(--cell) * 0.125));
  border-radius: 50%;
  background: #fff;
  pointer-events: none;
}

.cell-head.dir-right .eye-a { top: 20%; right: 18%; }
.cell-head.dir-right .eye-b { bottom: 20%; right: 18%; }
.cell-head.dir-left .eye-a { top: 20%; left: 18%; }
.cell-head.dir-left .eye-b { bottom: 20%; left: 18%; }
.cell-head.dir-up .eye-a { top: 18%; left: 20%; }
.cell-head.dir-up .eye-b { top: 18%; right: 20%; }
.cell-head.dir-down .eye-a { bottom: 18%; left: 20%; }
.cell-head.dir-down .eye-b { bottom: 18%; right: 20%; }

/* ---------- Move Probabilities ---------- */
.probs-panel {
  width: 100%;
  max-width: 420px;
  min-height: 0;
  height: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
}

@media (min-width: 900px) {
  .probs-panel {
    height: 540px;
    max-height: 540px;
  }
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.panel-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 650;
  color: #111827;
}

.panel-meta {
  font-size: 0.75rem;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: nowrap;
}

.held-indicator {
  display: inline-block;
  margin-right: 10px;
  color: #2563eb;
  font-weight: 650;
}

.prob-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  justify-content: flex-start;
  padding-top: 4px;
}

.prob-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 52px 44px;
  align-items: center;
  gap: 10px;
  min-height: 28px;
}

.prob-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: #374151;
  font-weight: 500;
}

.prob-label .arrow {
  width: 14px;
  text-align: center;
  color: #6b7280;
  font-size: 0.85rem;
}

.prob-row.chosen .prob-label {
  color: #2563eb;
  font-weight: 650;
}

.prob-row.chosen .prob-label .arrow { color: #2563eb; }

.prob-track {
  width: 100%;
  max-width: 180px;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  justify-self: stretch;
}

.prob-fill {
  height: 100%;
  width: 0;
  background: #cbd5e1;
  border-radius: 4px;
  transition: width 100ms linear;
}

.prob-row.chosen .prob-fill {
  background: #2563eb;
}

.prob-pct {
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #6b7280;
  text-align: right;
}

.prob-tag {
  font-size: 0.75rem;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.prob-tag.safe { color: #22c55e; }
.prob-tag.neck,
.prob-tag.body { color: #ef4444; }

/* ---------- Full-width JSON under board+probs ---------- */
.json-panel {
  width: 100%;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.json-panel .panel-head {
  margin-bottom: 10px;
}

.json-body {
  margin: 0;
  flex: 1;
  min-height: 180px;
  max-height: 320px;
  overflow: auto;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  color: #111827;
  white-space: pre;
  font-variant-numeric: tabular-nums;
  -webkit-overflow-scrolling: touch;
}

.json-body .jk { color: #2563eb; }
.json-body .js { color: #b45309; }
.json-body .jn { color: #c2410c; }
.json-body .jb { color: #7c3aed; }
.json-body .jnul { color: #9ca3af; }
.json-body .jp { color: #6b7280; }

.json-empty {
  color: #9ca3af;
  font-style: normal;
}

.muted { color: #6b7280; font-size: 0.75rem; }

/* ---------- Mobile / tablet ---------- */
@media (max-width: 899px) {
  .app {
    gap: 12px;
    padding: 12px 10px 24px;
  }

  .app-header {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .header-left {
    justify-content: space-between;
    width: 100%;
  }

  .header-metrics {
    justify-self: stretch;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
    padding: 8px 10px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
  }

  .metric.score,
  .metric.step,
  .metric.latency {
    min-width: 0;
  }

  .header-right {
    justify-self: stretch;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 8px;
  }

  .header-right .btn {
    min-height: 44px;
    width: 100%;
  }

  .header-right .btn-primary,
  .header-right .btn-outline {
    min-width: 0;
  }

  .btn-gear {
    width: 44px;
    height: 44px;
  }

  .main {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .compare-probs {
    grid-template-columns: 1fr;
  }

  .stats-columns-compare {
    grid-template-columns: 1fr;
  }

  .model-drive-hint {
    width: 100%;
    margin-left: 0;
  }

  .board-panel {
    max-width: none;
    padding: 12px;
  }

  .board-stage {
    max-width: none;
  }

  .board {
    --cell: clamp(20px, calc((100vw - 48px) / var(--cols)), 36px);
  }

  .probs-panel {
    max-width: none;
  }

  .panel-meta {
    white-space: normal;
  }

  .prob-row {
    grid-template-columns: 64px minmax(0, 1fr) 48px 40px;
    gap: 8px;
  }

  .prob-track {
    max-width: none;
  }
}

@media (max-width: 420px) {
  .header-left h1 {
    font-size: 0.95rem;
  }

  .metric-label {
    font-size: 0.7rem;
  }

  .metric-value {
    font-size: 0.82rem;
  }

  .prob-row {
    grid-template-columns: 56px minmax(0, 1fr) 44px 36px;
  }
}

/* ---------- Flow sampler (application flow animation) ---------- */
.flow-sampler {
  --fs-ink: #1a2332;
  --fs-muted: #5c6b7a;
  --fs-teal: #2a9d8f;
  --fs-teal-deep: #1d7a6f;
  --fs-warm: #c45c26;
  --fs-warm-soft: #e8a87c;
  --fs-line: #c5d4de;
  --fs-panel: rgba(255, 255, 255, 0.72);
  --fs-grid: rgba(42, 157, 143, 0.09);
  position: relative;
  width: 100%;
  padding: 16px 16px 12px;
  border: 1px solid var(--fs-line);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
  overflow: hidden;
}

.flow-sampler::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: linear-gradient(var(--fs-grid) 1px, transparent 1px), linear-gradient(90deg, var(--fs-grid) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}

.flow-sampler > * {
  position: relative;
  z-index: 1;
}

.fs-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.fs-brand {
  min-width: 0;
}

.fs-eyebrow {
  margin: 0 0 4px;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--fs-muted);
}

.fs-title {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: -0.03em;
  color: var(--fs-ink);
}

.fs-badge-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.fs-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(42, 157, 143, 0.08);
  border: 1px solid rgba(42, 157, 143, 0.25);
  color: var(--fs-teal-deep);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fs-meta {
  margin: 0;
  font-size: 0.7rem;
  color: var(--fs-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.fs-meta-accent {
  color: var(--fs-teal-deep);
  font-weight: 700;
}

.fs-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.fs-pane {
  position: relative;
  border: 1px solid var(--fs-line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.76);
  padding: 10px 10px 8px;
  min-height: 180px;
}

.fs-pane-parallel {
  border-color: rgba(42, 157, 143, 0.4);
  background: rgba(247, 252, 251, 0.86);
}

.fs-pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fs-muted);
}

.fs-pane-model {
  color: var(--fs-teal-deep);
}

.fs-pane-tag {
  margin: 8px 0 6px;
  color: var(--fs-warm);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.fs-viz {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
}

.fs-svg {
  width: 100%;
  height: 100%;
  max-width: 260px;
}

.fs-serial-trail {
  stroke: rgba(30, 41, 59, 0.15);
  stroke-width: 2.2;
  fill: none;
}

.fs-serial-draw {
  stroke: var(--fs-warm);
  stroke-width: 2.2;
  fill: none;
  stroke-dasharray: 270;
  stroke-dashoffset: 270;
  animation: fs-serial-draw 1.8s ease-in-out infinite alternate;
}

.fs-serial-dot {
  fill: rgba(30, 41, 59, 0.35);
}

.fs-serial-dot.on {
  fill: var(--fs-warm);
}

.fs-serial-focus {
  fill: rgba(196, 92, 38, 0.12);
  stroke: var(--fs-warm);
  stroke-width: 1.5;
}

.fs-serial-num,
.fs-burst-label {
  fill: var(--fs-ink);
  font-size: 11px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.fs-burst-ring {
  fill: none;
  stroke: rgba(42, 157, 143, 0.28);
  stroke-width: 1.2;
  transform-origin: center;
  animation: fs-ring 1.7s ease-out infinite;
}

.fs-burst-ring.delay {
  animation-delay: 0.25s;
}

.fs-burst-ray {
  stroke: rgba(42, 157, 143, 0.75);
  stroke-width: 1.2;
  stroke-linecap: round;
  animation: fs-ray-pulse 1.8s ease-in-out infinite;
}

.fs-burst-core {
  fill: var(--fs-teal);
  transform-origin: center;
  animation: fs-core 1.4s ease-in-out infinite;
}

.fs-pane-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: 0.58rem;
  color: var(--fs-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.fs-clock-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fs-clock {
  width: 120px;
  height: 28px;
}

.fs-clock-base {
  stroke: rgba(30, 41, 59, 0.35);
  stroke-width: 1.2;
}

.fs-clock-bead {
  fill: var(--fs-warm);
  offset-path: path("M 0,20 C 12,4 26,18 40,10 S 74,0 112,8");
  animation: fs-bead 1.8s linear infinite;
}

.fs-clock-wave {
  fill: none;
  stroke: rgba(42, 157, 143, 0.5);
  stroke-width: 1.6;
  stroke-linecap: round;
}

.fs-clock-wave.pulse {
  stroke: rgba(42, 157, 143, 0.9);
  stroke-dasharray: 18 18;
  animation: fs-wave 1.8s linear infinite;
}

.fs-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.fs-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 10px 8px;
  border: 1px solid var(--fs-line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
}

.fs-tile-k {
  font-size: 0.58rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--fs-muted);
}

.fs-tile-v {
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--fs-ink);
}

.fs-tile-sub {
  font-size: 0.58rem;
  line-height: 1.3;
  color: var(--fs-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.fs-spark-bars {
  display: flex;
  align-items: end;
  gap: 5px;
  height: 26px;
  margin-top: 2px;
}

.fs-spark-bars span {
  display: block;
  flex: 1;
  min-width: 4px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, rgba(42, 157, 143, 0.7), rgba(42, 157, 143, 0.25));
  animation: fs-cost 1.5s ease-out infinite alternate;
}

.fs-spark-line {
  width: 100%;
  height: 28px;
}

.fs-cost-path {
  stroke: rgba(196, 92, 38, 0.7);
  stroke-width: 1.8;
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  animation: fs-cost 1.6s ease-in-out infinite;
}

.fs-conf-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin-top: 2px;
}

.fs-conf-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  font-size: 0.54rem;
  font-weight: 700;
  border-radius: 4px;
  color: rgba(17, 24, 39, 0.8);
  background: rgba(42, 157, 143, calc(0.2 + var(--fs-c, 0.5) * 0.75));
  animation: fs-cell 2.8s ease-in-out infinite;
}

.fs-console {
  position: relative;
  border-top: 1px solid var(--fs-line);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 12px;
}

.fs-console-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
  font-size: 0.6rem;
  letter-spacing: 0.02em;
  line-height: 1.35;
  border-bottom: 1px solid rgba(197, 212, 222, 0.7);
  padding-bottom: 4px;
}

.fs-console-k {
  color: var(--fs-warm);
  font-weight: 700;
}

.fs-console-v {
  color: var(--fs-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-sampler.fs-live .fs-pane-parallel {
  border-color: var(--fs-teal);
}

.flow-sampler.fs-live .fs-burst-core {
  animation-duration: 0.7s;
}

.flow-sampler.fs-reduced .fs-serial-draw,
.flow-sampler.fs-reduced .fs-serial-focus,
.flow-sampler.fs-reduced .fs-burst-ray,
.flow-sampler.fs-reduced .fs-burst-ring,
.flow-sampler.fs-reduced .fs-burst-core,
.flow-sampler.fs-reduced .fs-clock-bead,
.flow-sampler.fs-reduced .fs-clock-wave.pulse,
.flow-sampler.fs-reduced .fs-cost-path,
.flow-sampler.fs-reduced .fs-spark-bars span,
.flow-sampler.fs-reduced .fs-conf-cell {
  animation: none !important;
}

.flow-sampler.fs-reduced .fs-serial-draw {
  stroke-dashoffset: 0;
}

.flow-sampler.fs-reduced .fs-clock-wave.pulse {
  stroke-dashoffset: 0;
  opacity: 1;
}

.flow-sampler.fs-reduced .fs-cost-path {
  stroke-dashoffset: 0;
}

@keyframes fs-serial-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes fs-pulse-ring {
  0% { opacity: 0.9; transform: scale(0.85); }
  100% { opacity: 0; transform: scale(1.55); }
}

@keyframes fs-ray-pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.85; }
}

@keyframes fs-ring {
  0% { transform: scale(0.55); opacity: 0.45; }
  100% { transform: scale(1.15); opacity: 0; }
}

@keyframes fs-core {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.18); }
}

@keyframes fs-bead {
  to { offset-distance: 100%; }
}

@keyframes fs-wave {
  to { stroke-dashoffset: 0; }
}

@keyframes fs-cost {
  to { stroke-dashoffset: 0; }
}

@keyframes fs-cell {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

@media (max-width: 720px) {
  .fs-head, .fs-pane-foot {
    flex-direction: column;
    align-items: flex-start;
  }

  .fs-badge-wrap {
    align-items: flex-start;
    text-align: left;
  }

  .fs-split,
  .fs-metrics {
    grid-template-columns: 1fr;
  }
}

