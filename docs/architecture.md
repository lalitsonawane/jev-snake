# Jev Snake — architecture

Repo mirror for the system design. Companion Notion page: https://app.notion.com/p/3e489f54d2c281fba90dda670039ba34 (also listed in [notion-sync.md](notion-sync.md)).

![System layers](assets/jev-snake-architecture.jpg)

## Components

| Layer | Path | Role |
|-------|------|------|
| UI | `src/components/SnakeApp.tsx` | Autoplay loop, board, probs, JSON, endgame overlay |
| Rules | `src/lib/snake.ts` | Moves, legal dirs, straight-line holds, win/lose, serializeState |
| API | `src/app/api/jev-move/route.ts` | Server-only TypeSafe call + choice validation |
| Host | Vercel project `jev-snake` | GitHub deploys from `main` |

## Request path

```mermaid
sequenceDiagram
  participant U as SnakeApp
  participant R as /api/jev-move
  participant T as TypeSafe systemone

  U->>U: legalMoves(game)
  alt straight-line hold still valid
    U->>U: applyMove(heldDir) without network
  else need new Jev Choice
    U->>R: POST { state, legal_moves, batch }
    R->>R: rebuild Choice criteria from state
    R->>T: POST /v1/systemone (jev-latest)
    T-->>R: choice + probabilities
    R->>R: reject if choice ∉ legal_moves
    R-->>U: response
    U->>U: applyMove(choice)
    U->>U: maybe arm straightShot hold
  end
  alt status ≠ playing
    U->>U: stop · endgameAnnouncement
  end
```

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
  Env[(TYPESAFE_API_KEY)] --> Prod
  Env --> Prev
```

## Related notes

- [2026-09-23 Vercel GitHub link](notes/2026-09-23-vercel-github-link.md)
- [2026-09-23 Documentation refresh](notes/2026-09-23-docs-architecture.md)
- [2026-09-23 Straight-line hold](notes/2026-09-23-straight-line-hold.md)
- [2026-09-23 Idle auto-pause](notes/2026-09-23-idle-auto-pause.md)
- [2026-09-23 Endgame self-crash](notes/2026-09-23-endgame-self-crash.md)
