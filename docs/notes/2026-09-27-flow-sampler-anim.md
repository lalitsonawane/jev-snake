# 2026-09-27 — Jev One — flow sampler animations

## Outcome
Added a **Flow Sampler** panel under the board / probs / session-stats region that animates the real System One application flow (state → questions → answers/probabilities → move), visually matching the Parallel Sampler lab aesthetic (teal + warm accent, grid, sequential vs parallel).

## What animates and when
| Piece | Idle / demo | Live tick |
|-------|-------------|-----------|
| Sequential zigzag + serial clock | Looping contrast (LLM-style one-token path) | Continues as contrast |
| Parallel radial pulse + parallel clock | Tasteful loop | Pulse advances on each API answer |
| Metric tiles (latency, tokens, decisions/s, confidence grid) | Placeholders / session averages | Driven by driver tick + session stats |
| TYPE / TRACK / KERNEL console | Generic flow string | Choice, confidence, latency, tokens, model |

`prefers-reduced-motion: reduce` freezes CSS motion (static frames).

## Artifacts
- `src/components/FlowSampler.tsx`
- CSS: `.flow-sampler` in `globals.css`
- Wired in `SnakeApp.tsx` below main grid, above JSON panel
- Media: `/cursor/stores/self/media/flow-sampler-panel.png`, `flow-sampler-jev.png`, `flow-sampler-compare.png`, `flow-sampler-demo.mp4`

## Open follow-ups
- None required for Drex host / logic gates (out of scope).
