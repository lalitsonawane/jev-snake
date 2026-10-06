# 2026-10-06 — Jev One — Vercel/GitHub status review

Repo mirror of Notion Project Knowledge Library session note.

**Notion:** https://app.notion.com/p/3f189f54d2c281289266ed672d9d439e  

**Project:** Jev One  
**Type:** Session summary  
**Status:** Active  
**Keywords:** Vercel, GitHub, Debugging, Cursor

## Outcome

Reviewed GitHub and Vercel for `lalitsonawane/jev-snake`. No open issues or PRs. Three consecutive Vercel builds failed; root cause is corrupted source on `main` after PR #12.

## Key findings

### GitHub

- Open issues: **0**
- Open PRs: **0**
- No `.github/workflows` (no Actions CI)
- Latest merge: [PR #12](https://github.com/lalitsonawane/jev-snake/pull/12) — “Revert operator-efficiency UI enhancements” (`583cef7`)
- Commit status on `main`: **Vercel FAILURE** (resolved by PR #14)

### Vercel

- Project: `jev-snake` (`prj_9AslNQ6yVqA8j0qOn9ekgvtFgCE7`) on team `apptonics-projects`
- Last READY production: `dpl_5GS2w2Rb8Z1EbZeG62gG3PLrnepZ` @ `160c603` (flow sampler)
- Failed ERROR deploys (newest first):
  1. `dpl_EQ6LnUH9He6ceZXUZcjBGGqAiaz3` — production `main`/`583cef7` (PR #12 merge)
  2. `dpl_NHCTdX35GLswun7dScdLtXxzRgnT` — preview PR #12 branch
  3. `dpl_DH8LhuLyCE5HEWPFxKCQKcWgvxNH` — production `8207ca5` (operator-efficiency commit)
- Error: `BUILD_UTILS_SPAWN_1` — `npm run build` / Turbopack
- Runtime error clusters (7d): none
- SSO protection enabled on all deployments; homepage `https://jev-snake-theta.vercel.app` redirects to Vercel SSO

## Root cause

Two separate corruptions:

1. **`8207ca5`** swapped file contents: `globals.css` got TypeScript (`"use client"` / React imports) and `SnakeApp.tsx` got CSS. Build: 30 Turbopack CSS parse errors.
2. **PR #12 revert (`a09af5d`)** replaced both files with the literal placeholder `[...]` (5 bytes each). Build: CSS “Unexpected end of input” + `SnakeApp.tsx` “Expression expected”.

## Fix path

Merged via [PR #14](https://github.com/lalitsonawane/jev-snake/pull/14): restored both files from `160c603`. Docs/status review carried on [PR #13](https://github.com/lalitsonawane/jev-snake/pull/13).

## Artifacts / links

- Failed prod inspect: https://vercel.com/apptonics-projects/jev-snake/EQ6LnUH9He6ceZXUZcjBGGqAiaz3
- PR #12: https://github.com/lalitsonawane/jev-snake/pull/12
- Fix PR (merged): https://github.com/lalitsonawane/jev-snake/pull/14
- Docs/status PR: https://github.com/lalitsonawane/jev-snake/pull/13
- Production URL (SSO): https://jev-snake-theta.vercel.app

## Open follow-ups

- [x] Restore `globals.css` + `SnakeApp.tsx` — merged in [PR #14](https://github.com/lalitsonawane/jev-snake/pull/14)
- [ ] Optionally re-land operator-efficiency UI without swapping file contents
- [ ] Consider a GitHub Actions `npm run build` check so broken `main` cannot merge silently
