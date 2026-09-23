# 2026-09-23 — Jev One — Vercel GitHub link (replace cloud copy)

## Outcome

Connected `github.com/lalitsonawane/jev-snake` to a new Vercel project so pushes to `main` deploy automatically. The previous upload/cloud-copy project was renamed and left as a backup (env vars retained there).

Repo mirror: `docs/notes/2026-09-23-vercel-github-link.md`  
Notion: (see `docs/notion-sync.md`)

## Key decisions

- Renamed the unlinked cloud-copy project to `jev-snake-cloud-copy` so the canonical name `jev-snake` could be reclaimed for a GitHub-linked project (`create_git_project` cannot reconnect an existing unlinked project with the same name).
- Linked provider: **GitHub** (`lalitsonawane/jev-snake`), production branch `main`.
- Did not decrypt or copy `TYPESAFE_API_KEY` via API; migrate that secret in the Vercel dashboard from `jev-snake-cloud-copy` → `jev-snake` (Production + Preview + Development).

## Artifacts / links

- Vercel project: https://vercel.com/apptonics-projects/jev-snake
- Production: https://jev-snake-theta.vercel.app
- Team alias: https://jev-snake-apptonics-projects.vercel.app
- Git branch alias: https://jev-snake-git-main-apptonics-projects.vercel.app
- Backup (cloud copy): https://vercel.com/apptonics-projects/jev-snake-cloud-copy
- First GitHub-backed deployment: `dpl_EAZCzZgJ5uLpm1bGMzgv2V1J9rq8` (READY, commit `2960bf3` on `main`)

## Open follow-ups

- Copy `TYPESAFE_API_KEY` onto the new project (dashboard → Project Settings → Environment Variables), then redeploy or wait for the next push.
- After confirming live Jev play on the new URL, delete or archive `jev-snake-cloud-copy` if no longer needed.
- Optional: assign any preferred custom/`*.vercel.app` production domain that should stay stable across the cutover.
