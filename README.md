# Jev Snake (Web)

Snake autoplay where **every move** is a live TypeSafe Jev Choice via `POST https://api.typesafe.ai/v1/systemone`.

## Win
Board fill: snake length === width × height.

## Security
`TYPESAFE_API_KEY` is read **only** in `src/app/api/jev-move/route.ts` (server). Never sent to the browser.

## Local
```bash
export TYPESAFE_API_KEY=...
npm install
npm run dev
```

## Vercel

Project is linked to this GitHub repo (`lalitsonawane/jev-snake` → [apptonics-projects/jev-snake](https://vercel.com/apptonics-projects/jev-snake)). Pushes to `main` create production deployments; other branches get previews.

- Production: https://jev-snake-theta.vercel.app
- Set project env `TYPESAFE_API_KEY` for Production + Preview (and Development if you use `vercel env pull`).
