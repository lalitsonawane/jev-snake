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
Set project env `TYPESAFE_API_KEY` for Production + Preview, then deploy.
