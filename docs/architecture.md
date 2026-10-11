# Jev Snake — architecture

Repo mirror for the system design. Companion Notion page: https://app.notion.com/p/3e489f54d2c281fba90dda670039ba34 (also listed in [notion-sync.md](notion-sync.md)).

![System layers](assets/jev-snake-architecture.jpg)

## Components

| Layer | Path | Role |
|-------|------|------|
| UI | `src/components/SnakeApp.tsx` | Autoplay loop, Jev/Drex/Compare, board, probs, StatsBoard, endgame |
| Flow UI | `src/components/FlowSampler.tsx` | Parallel Sampler–style application flow animation |
| Rules | `src/lib/snake.ts` | Moves, legal dirs, straight-line holds, win/lose, serializeState |
| Stats | `src/lib/provider-stats.ts` | Per-provider session metrics + compare agreement |
| Providers | `src/lib/systemone.ts` | Jev + Drex env, payload build, response shape, upstream error text |
| Route logic | `src/lib/systemone-route.ts` | Shared POST handler (503/502/499 JSON) |
| API | `src/app/api/systemone-move/route.ts` | Unified endpoint (`provider: jev \| drex`) |
| Alias | `src/app/api/jev-move/route.ts` | Deprecated Jev-only alias of systemone-move |
| Host | Vercel project `jev-snake` | GitHub deploys from `main` |

## Request path

```mermaid
sequenceDiagram
  participant U as SnakeApp
  participant R as /api/systemone-move
  participant J as TypeSafe jev-latest
  participant D as Drex drex-latest

  U->>U: legalMoves(game)
  alt straight-line hold still valid
    U->>U: applyMove(heldDir) without network
  else single model
    U->>R: POST { provider, state, legal_moves, batch }
    alt provider = jev
      R->>J: POST /v1/systemone
      J-->>R: choice + probabilities
    else provider = drex
      R->>D: POST /v1/systemone
      D-->>R: choice + probabilities
    end
    R-->>U: response
    U->>U: applyMove(choice)
  else compare
    U->>R: parallel Jev + Drex (same state/questions)
    R-->>U: both answers
    U->>U: applyMove(driver choice)
  end
  alt status ≠ playing
    U->>U: stop · endgameAnnouncement
  end
```

## Env (server-only)

| Provider | Key | Base URL | Default base | Model |
|----------|-----|----------|--------------|-------|
| Jev | `TYPESAFE_API_KEY` (alias `TYPE_SAFE_API_KEY`) | `TYPESAFE_BASE_URL` (optional) | `https://api.typesafe.ai` | `jev-latest` |
| Drex | `DREX_API_KEY` | `DREX_BASE_URL` (**required**) | none (`api.drex.ai` does not resolve) | `drex-latest` |

`DREX_BASE_URL` must be an absolute `http(s)` System One **root**. Do not append `/v1/systemone` (stripped if present). Missing key/base → JSON `503`. Upstream DNS/connect fail → JSON `502` (not HTML 500).

## Session stats + Flow Sampler

```mermaid
flowchart LR
  Tick[Autoplay tick] --> Probs[Probability panels]
  Tick --> Stats[Session stats board]
  Tick --> Flow[Flow Sampler]
  Stats --> Metrics[API · held · errors · latency · tokens · confidence]
  Flow --> Anim[Serial zigzag · parallel pulse · console]
```

- **Stats board** — beside probs; per-provider cumulative metrics; compare agreement rate; reset on Reset / mode switch. See [stats board note](notes/2026-09-26-stats-board-compare.md).
- **Flow Sampler** — under board/probs/stats; animates state → questions → answers → move; idle demo vs live pulse; respects `prefers-reduced-motion`. See [flow sampler note](notes/2026-09-27-flow-sampler-anim.md).

## Game rules

```mermaid
flowchart LR
  subgraph Win
    W["length = width × height"]
  end
  subgraph Lose
    S["self — head on body"]
    A["wall — out of bounds"]
    P["trapped — no legal moves"]
  end
  Move[applyMove] --> W
  Move --> S
  Move --> A
  Empty[legalMoves empty] --> P
```

![Endgame graphic](assets/jev-snake-endgame.jpg)

`endgameAnnouncement(game)` maps:

| `status` / `lossReason` | Title | Detail |
|-------------------------|-------|--------|
| `won` | Board cleared | Filled every cell |
| `lost` / `self` | Game over | Crashed into itself while maneuvering |
| `lost` / `wall` | Game over | Hit the wall |
| `lost` / `trapped` | Game over | No safe moves left |

## Token-saving behaviors

```mermaid
flowchart TB
  subgraph SkipJev["Skip TypeSafe call"]
    H[Straight-line hold<br/>reuse last legal dir]
  end
  subgraph Pause["Stop autoplay"]
    I[1 min idle]
    V[Tab hidden]
    E[Error / illegal choice]
    L[Lost / won]
  end
  Tick --> H
  Tick --> I
  Tick --> V
  Tick --> E
  Tick --> L
```

## Deploy pipeline

```mermaid
flowchart LR
  GH[GitHub push] --> VH[Vercel Git integration]
  VH -->|main| Prod[Production<br/>jev-snake-theta.vercel.app]
  VH -->|branch / PR| Prev[Preview URL]
  EnvJ[(TYPESAFE_API_KEY)] --> Prod
  EnvD[(DREX_API_KEY)] --> Prod
  EnvB[(DREX_BASE_URL)] --> Prod
  EnvJ --> Prev
  EnvD --> Prev
  EnvB --> Prev
```

## Related notes

- [2026-09-26 Jev / Drex compare](notes/2026-09-26-jev-drex-compare.md) (PR #8)
- [2026-09-26 Drex base URL required](notes/2026-09-26-drex-base-url-required.md) (PR #9)
- [2026-09-26 Session stats board](notes/2026-09-26-stats-board-compare.md) (PR #10)
- [2026-09-27 Flow Sampler](notes/2026-09-27-flow-sampler-anim.md) (PR #11)
- [2026-10-11 Docs sync PRs #8–#11](notes/2026-10-11-docs-sync-pr8-11.md)
- [2026-09-23 Vercel GitHub link](notes/2026-09-23-vercel-github-link.md)
- [2026-09-23 Documentation refresh](notes/2026-09-23-docs-architecture.md)
- [2026-09-23 Straight-line hold](notes/2026-09-23-straight-line-hold.md)
- [2026-09-23 Idle auto-pause](notes/2026-09-23-idle-auto-pause.md)
- [2026-09-23 Endgame self-crash](notes/2026-09-23-endgame-self-crash.md)
- [2026-09-23 Cancel upstream on abort](notes/2026-09-23-cancel-upstream-jev-abort.md)
