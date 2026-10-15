# Changelog

Project progress is recorded here as TODO items are completed. Each completed
item should be committed and pushed separately.

## 2026-10-13

- Completed TODO: aligned the build spec with Critical Mass as the product-wide
  brand, using `cm-tokens.json` as the sole visual source of truth.
- Added the build checklist and the per-item changelog, commit, and push
  workflow.

- Completed TODO: prepared a secret-free environment template using
  ScoopShare-compatible Upstash variable names, added ignore rules for local
  environment and Vercel files, and documented setup prerequisites. No Redis
  data was changed.

- Completed TODO: bootstrapped the Next.js App Router, CM token theme, and
  ScoopShare-compatible Redis client. Updated to supported Next.js 16, React
  19, and Tailwind 4 releases; lint and production build pass, and `npm audit`
  reports no vulnerabilities.

- Completed TODO: implemented player join and recovery routes, signed local
  sessions, unique recovery codes, recovery-attempt rate limiting, and the join,
  recovery, and initial signed-in screens. Identity tests, lint, build, and
  audit pass. Redis-backed round-trip testing awaits configured credentials.
- Completed TODO: created a separate `critical-mixer` Vercel project in the
  personal workspace and linked this local checkout.
- Completed TODO: connected ScoopShare's existing `scoopshare-kv` Upstash
  resource to Critical Mixer for Production, Preview, and Development. Added
  fresh QR/admin secrets without exposing their values. No Redis keys or
  ScoopShare data were changed.
- Note: automatic GitHub deployments remain optional and unavailable.
- Completed TODO: configured Vercel to recognize the Next.js framework and
  created a protected Preview deployment through the Vercel CLI. The latest
  Preview, including the QR work, is:
  https://critical-mixer-2cfkaru80-joshuabrainjaffe.vercel.app
- The Preview is protected by Vercel Authentication. No Production deployment
  was made.
- Completed TODO: added an authenticated game-status/server-time endpoint and
  client-side QR signing/rotation. Tokens remain stable for 30 seconds, validate
  across the current and adjacent windows, and are visibly inactive outside the
  active game. Nine identity/QR tests, lint, and production build pass.
- Completed TODO: unified player identity across sessions, join/recovery
  records, and screens. The scan contract awards one point for every confirmed
  pair, without affiliation multipliers or segmented statistics.
- Completed TODO: added authenticated QR scan handling, ten-minute pending
  scan-backs, atomic idempotent confirmation, one-point scoring, and the
  full-screen in-app camera scanner with permission handling. Scan helpers,
  lint, build, and all ten tests pass. No Redis records were written; live
  transaction verification awaits an approved test run.
- Completed TODO: added the native-camera `/m/[token]` fallback. Signed-in
  players auto-submit the scan, while Join and Recover links preserve the
  scanned token and resume it after authentication. No Redis data was written.
- Completed TODO: expanded `/api/me` to return player totals, leaderboard
  tiers, and pending scan-backs on visible-tab polling; added lazy `/api/met`
  history and the player home progress sections. Redis response parsing tests,
  lint, build, and all thirteen tests pass. No live player data was changed.
- Completed TODO: added password-protected host controls for lobby/start/end/
  reopen, player/meet/top-three overview, name search, one-time login QR
  generation and redemption, and `cmx:`-only WIPE guarded by typing `WIPE`.
  Admin-key tests, lint, build, and all sixteen tests pass. An unauthenticated
  WIPE request returned 401; the wipe was not executed.
- Completed TODO: added the ended-only `/api/admin/wrapped` aggregate and a
  seven/eight-slide host-paced reveal with count-ups, London peak-hour bars,
  third/second tiers, drumroll, and all tied winners. Keyboard/click navigation
  and the tie slide were checked at mobile width with mocked data; no Redis
  state was changed.
- Completed TODO: added the ended-game player results view with every tied
  winner, named top-three tiers, and personal final points/meet count. Pure
  leaderboard tests cover distinct tiers and tied winners. A live `ended`
  screen check still requires an authorized Redis test state.