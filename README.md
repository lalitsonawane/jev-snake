# Jev Snake (Web)

Snake autoplay where **every move decision** is a live TypeSafe Jev Choice via `POST https://api.typesafe.ai/v1/systemone`. Safe straight-line holds may reuse the last legal Jev direction without a new API call.

![Architecture overview](docs/assets/jev-snake-architecture.jpg)

## Live

| | |
|---|---|
| Production | https://jev-snake-theta.vercel.app |
| Vercel project | https://vercel.com/apptonics-projects/jev-snake |
| GitHub | https://github.com/lalitsonawane/jev-snake |

## Win & lose (classic rules)

| Outcome | Rule |
|---------|------|
| **Win** | Snake length fills the board (`length === width × height`) |
| **Self crash** | Head moves onto a body cell (not the vacating tail) |
| **Wall** | Head leaves the board |
| **Trapped** | No legal moves remain |

![Endgame outcomes](docs/assets/jev-snake-endgame.jpg)

## Architecture

```mermaid
flowchart TB
  subgraph Browser["Browser"]
    UI["SnakeApp<br/>board · probs · JSON · endgame"]
  end

  subgraph Vercel["Vercel / Next.js"]
    API["POST /api/jev-move<br/>server-only Route Handler"]
  end

  subgraph TypeSafe["TypeSafe"]
    JEV["POST /v1/systemone<br/>model: jev-latest"]
  end

  UI -->|"serializeState + legal_moves"| API
  API -->|"Choice criteria = legal dirs"| JEV
  JEV -->|"choice + probabilities"| API
  API -->|"validated Dir"| UI

  KEY[("TYPESAFE_API_KEY<br/>env · never to browser")]
  KEY -.-> API
```

## Autoplay tick flow

```mermaid
flowchart TD
  Start([Start / tick]) --> Playing{status = playing?}
  Playing -->|no| Stop([Stop autoplay · show endgame])
  Playing -->|yes| Legal{legal moves?}
  Legal -->|none| Trap[lossReason = trapped] --> Stop
  Legal -->|yes| Hold{straight-line hold<br/>still valid?}
  Hold -->|yes| ApplyHold[applyMove held dir<br/>no Jev call]
  Hold -->|no| Fetch[POST /api/jev-move]
  Fetch --> Ok{HTTP OK + legal choice?}
  Ok -->|no| Err[Show error · stop]
  Ok -->|yes| ApplyJev[applyMove Jev choice]
  ApplyHold --> After{status still playing?}
  ApplyJev --> MaybeHold[Maybe arm straight-line hold]
  MaybeHold --> After
  After -->|no| Stop
  After -->|yes| Idle{1 min idle / tab hidden?}
  Idle -->|yes| Pause[Pause · banner]
  Idle -->|no| Wait[Wait cadence ~90ms] --> Start
```

## Endgame state machine

```mermaid
stateDiagram-v2
  [*] --> playing
  playing --> won: board filled
  playing --> lost_self: head hits body
  playing --> lost_wall: head hits wall
  playing --> lost_trapped: no legal moves
  won --> playing: Play again / Reset
  lost_self --> playing: Play again / Reset
  lost_wall --> playing: Play again / Reset
  lost_trapped --> playing: Play again / Reset
```

## Security

`TYPESAFE_API_KEY` (alias `TYPE_SAFE_API_KEY`) is read **only** in `src/app/api/jev-move/route.ts`. Never sent to the browser.

## Local

```bash
export TYPESAFE_API_KEY=...
npm install
npm run dev
```

```bash
npm test    # vitest
npm run build
```

## Vercel

GitHub-linked project: `lalitsonawane/jev-snake` → [apptonics-projects/jev-snake](https://vercel.com/apptonics-projects/jev-snake).

- Pushes to `main` → production
- Other branches → preview
- Env: `TYPESAFE_API_KEY` on Production + Preview (+ Development for `vercel env pull`)

## Docs map

| Doc | Purpose |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | Deep flows (Mermaid) |
| [docs/notion-sync.md](docs/notion-sync.md) | Repo ↔ Notion index |
| [docs/notes/](docs/notes/) | Session / decision mirrors |
