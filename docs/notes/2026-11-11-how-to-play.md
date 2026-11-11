# 2026-11-11 — Jev One — how to play controls

Repo mirror: `docs/notes/2026-11-11-how-to-play.md`
Notion: https://app.notion.com/p/41589f54d2c2814385ecc489b31423df

## Outcome

README now has a **How to play** section that matches `SnakeApp`. Start, pause, and reset are header buttons. There are no keyboard shortcuts for those actions or for steering.

## Key decisions

- Document only controls implemented in `src/components/SnakeApp.tsx`. Do not invent Space, R, or arrow-key bindings.
- The `keydown` listener only calls `bumpActivity()`. It resets the idle timer, the same as pointer, mouse move, and scroll.
- Idle stop is 90 seconds (`AUTOPLAY_IDLE_MS = 90_000`), polled every 5 seconds. The banner string still says “1 min idle”.
- A hidden tab stops autoplay immediately.
- **Reset** and **Play again** both call `reset()`. They do not auto-start.
- Switching model or Compare driver calls `stopAutoplay()`. **Batch foresight** and **Cadence** do not.

## Controls

The board opens Idle. **Start** is enabled only while status is `playing`. After a win or loss it stays disabled until reset.

| Control | What it does |
|---------|----------------|
| **Start** | Header button while autoplay is stopped. Clears the error banner and starts the tick loop. |
| **Pause** | Same button while running. Stops the loop, aborts the in-flight `POST /api/systemone-move`, and clears a straight-line hold. The board is unchanged. |
| **Reset** | Header **Reset**. Stops autoplay, clears the error, move panels, and session stats, and deals a new board. |
| **Play again** | Endgame card. Same action as **Reset**. |
| **Jev / Drex / Compare** | Chips under the header, or the ⚙ **Model** radios. Switching stops autoplay and clears panels, session stats, and the error. Compare’s driver starts as Jev. |
| **Switch driver** | Compare only: the “switch driver” link, or ⚙ **Drive moves with**. Stops autoplay and changes which model’s choice moves the snake. |
| **⚙ Settings** | Model, driver (Compare only), **Batch foresight**, and **Cadence**. Click outside the menu to close it. Batch foresight and cadence do not stop a running game. Cadence is the target milliseconds per move (default **90**, clamped to **0–60000**, step **10**). Request time counts toward that interval. |
| **Deep link** | `?mode=jev`, `?mode=drex`, or `?mode=compare` on load. Anything else is ignored. |

Automatic stops:

- **Hidden tab** — stops immediately. Banner: “Autoplay stopped — tab hidden (saves API tokens). Hit Start to resume.”
- **Idle** — no pointer, key, mouse move, or scroll for **90 seconds**. The banner text says “1 min idle”; the timer is 90 seconds. **Start** resumes the same board.

Keyboard: none for game actions. Any key only refreshes the idle timer.

## Artifacts/links

- README: `README.md` (How to play)
- Notion README mirror: https://app.notion.com/p/3e289f54d2c281a59b5dea24e51a80ff
- Notion how-to: https://app.notion.com/p/41589f54d2c2814385ecc489b31423df
- Code: `src/components/SnakeApp.tsx` (`toggleRun`, `reset`, gear menu, idle listeners)

## Open follow-ups

- Banner copy says “1 min idle” while `AUTOPLAY_IDLE_MS` is 90 seconds. Left unchanged; this change is docs-only.
- Keyboard shortcuts remain unimplemented (see `docs/notes/2026-10-14-systemone-call-panel.md`). Do not document them until they exist in `SnakeApp`.
