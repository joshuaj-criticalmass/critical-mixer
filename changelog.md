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
  https://critical-mixer-23ltas1k0-joshuabrainjaffe.vercel.app
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
- Blocker: the Preview Upstash resource reports `Uninstalled` and the admin
  overview returns 503; the configured Redis hostname does not resolve. The
  test game was not started and no player/meet data was written. Restore the
  Upstash resource before attempting the live test.

## 2026-10-23

- Security: upgraded Next.js 16.4.0 to 16.4.3, fixing critical advisories
  GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, and GHSA-673q-mjm6-r5xr.
  `npm audit` reports 0 vulnerabilities; tests, typecheck, lint, and build
  pass.
- UI: added a "Save code image" button to the recovery code screen; it renders
  a PNG of the name and code and opens the share sheet (download fallback).
- UI: poster-style redesign using only CM tokens: paper grain background,
  dashed guide lines with the CM dot, Calgary Blue halftone, CM block-and-dot
  lockup, uppercase Compacta headlines, slate-bar panels, and a square QR
  progress frame. Bundled the CM font files in `public/fonts/` (licence to be
  confirmed). Typecheck and lint pass; join and play screens checked at
  desktop and mobile widths.
- UI: replaced the CSS-drawn CM mark with the official CM logo SVG
  (`public/cm-logo.svg`) across all screens and in the saved recovery image.
- Resolved: the deleted Upstash database was replaced by the Vercel
  Marketplace resource `critical-mixer-kv`, connected to all environments.
- Completed TODO: added the anonymous live board. `GET /api/live` returns
  status, player and meet totals, nameless top-three tiers, and eight hours
  of meets, with a 5-second CDN cache. `/live` is the phone view, linked from
  the player leaderboard; `/live?screen` scales up for an office display,
  adds a join QR, and holds a screen wake lock. Opened from the admin header.
  Three new tests (24 total), typecheck, and lint pass; both layouts checked.

## 2026-10-26

- Deployed `0fdc25c` to production at https://critical-mixer.vercel.app.
  The domain, live API, fonts, and logo respond publicly without Vercel
  authentication. Generated the join QR (`qr/critical-mixer-join.png`, 2048px,
  and `.svg`) with high error correction. Production shares the
  `critical-mixer-kv` database, which still holds test data from an active
  test game; no data was changed.
- UI: Poppy the pigeon (`public/poppy.svg`) replaces the halftone on `/play`
  and `/live`, anchored bottom-right at 90% of the viewport height. Wide
  screens reserve space so content sits beside her; phones show her as a
  faded watermark for legibility. `/live?screen` now fits a 1080p display
  without scrolling.
- UI: added the approved three-step "How to play" copy to the join screen and
  as a collapsible section on the player screen. The icebreaker is
  deliberately left out as a surprise.

## 2026-10-27

- Join now asks for first, middle (optional), and last name so winners are
  identifiable. The full name is still stored as `name`, with `firstName`,
  `middleName`, and `lastName` alongside. Recovery matches first and last
  name plus the recovery code; players who joined earlier still recover by
  their stored full name. Parts are capped at 30 characters.
- Added a full rules page at `/rules`, linked from the player screen's
  How to play section and from the live board.
- Added a simplified rules panel to `/live`; on `/live?screen` it sits
  beside the chart and the board still fits a 1080p display.
- Two new name tests (26 total), typecheck, and lint pass. Join/recover
  validation was checked with rejected requests only; no data was written.

## 2026-10-29

- Deployed `f2293aa` to production. `/`, `/rules`, `/live`, `/recover`, and
  `/play` respond, and the first/last name validation is live. `/rules`
  briefly returned a stale edge-cached 404 right after the alias switched;
  it cleared on its own without a cache purge.
- Fix: after an admin wipe, players' saved sessions still signed correctly,
  so `/play` kept showing their old name with zero points. `/api/me` now
  returns 410 when the player record no longer exists, and `/play` clears the
  stored session and returns to the join screen. Verified locally with a
  signed session for a non-existent player (410) and a bad signature (401).
- Playtest fix: refreshing after joining showed the name form again, and
  re-entering a name created a duplicate player. The join screen now sends
  anyone with a saved session straight back to the game.
- Replaced recovery codes with name-based login. Entering an existing full
  name (ignoring case, accents, punctuation, and spacing) asks "Is that you?"
  and logs in, or asks a different person to add a middle name. Close matches
  (nicknames such as Mike/Michael, typos, extra middle names) offer "Did you
  mean...?" before creating a new player. Exact duplicates are blocked, with a
  per-name Redis key guarding simultaneous joins. Added `POST /api/login`;
  removed `/api/recover`, recovery-code generation, the recovery code screen,
  and the save-image button. `/recover` now redirects to the join screen, and
  the host's one-time login QR no longer depends on a recovery code.
  28 tests, typecheck, and lint pass. Join/login were checked against real
  playtest names using only requests that return "exists"/"similar" or log in;
  no players were created.
- Admin: replaced the name search with a full player list (`GET
  /api/admin/players`, admin key required). It shows every player's points,
  meets, and join time, with a name filter, sort by points/name/newest, and
  the one-time login QR on each row. Removed the unused search endpoint.
  Note: a test player "Zzyzx Nobodyhere" was created in the shared database
  during browser checks of the join form; it is removed by the next wipe.
- Join screen copy: split the tagline onto two lines and added the game
  explanation with the Tuesday 3 November, 10am start.
- Moved How to play off the join screen into a pop-up shown once on `/play`
  right after a new player joins. It closes on "Let's go", Escape, or
  automatically after 30 seconds, and doesn't return on refresh or for
  players logging back in. The join button now reads "Join". Verified the
  open, countdown, auto-close, and no-repeat behaviour in the browser.
