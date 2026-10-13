# Critical Mixer — Build Specification

A 3-day, in-person "meet people" game for the merged London office of
**Critical Mass, artbot., Tribal, and RAPP**. Everyone gets a live QR code on
their phone. When two people meet, they scan each other's codes. Meeting
someone from another company is worth more than meeting someone from your own.
Most points at the end of Day 3 wins, and ties produce multiple winners,
revealed on a "Wrapped"-style big-screen page.

- **Players:** ~500, all in the London office
- **Dates:** **Tuesday 3 – Thursday 5 November 2026**, started and ended
  manually by the host; winners revealed at the end of Thursday 5 November
- **Hosting:** Vercel (replaces ScoopShare)
- **State:** the existing free Upstash Redis store (reused from ScoopShare)

---

## 1. Game Rules

1. A player opens the app, enters their **name**, picks their **company**, and
   gets a **recovery code** (they're told to screenshot it).
2. The player sees their **personal QR code**, which refreshes every 30 seconds.
3. Players meet in person. **Player A scans Player B's code.** The meet is now
   *pending*, and both phones show a shared **icebreaker question**.
4. **Player B scans Player A's code back within 10 minutes.** The meet is now
   *confirmed*, and both players get points:
   - **2 points** if they're from different companies
   - **1 point** if they're from the same company
5. Each pair can only score once. Re-scanning someone you've already met
   shows "You've already met Sam!" and awards nothing.
6. When the host ends the game, scanning stops, the leaderboard is revealed,
   and **every player tied on the highest points total is a winner**.

---

## 2. Tech Stack

Match ScoopShare's setup wherever possible, but use supported, patched
dependency releases instead of inheriting vulnerable versions. The starter is
bootstrapped with Next.js 16.4, React 19.3, and Tailwind 4.3.

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Styling | Tailwind (or whatever ScoopShare used) |
| Hosting | Vercel |
| State | Upstash Redis via `@upstash/redis` (the existing store) |
| QR generation | `qrcode` (npm), rendered as SVG or canvas client-side |
| QR scanning | `qr-scanner` (nimiq), which uses the native `BarcodeDetector` where available and a web-worker fallback elsewhere (including iOS Safari) |
| Crypto | Web Crypto API (`crypto.subtle`, HMAC-SHA256) on both client and server |
| Realtime | **No WebSockets.** Light polling, only while the tab is visible (see §8) |

### Environment variables

```
KV_REST_API_URL      # existing store (or UPSTASH_REDIS_REST_URL — use whatever ScoopShare had)
KV_REST_API_TOKEN    # existing store
QR_SECRET            # long random string; signs QR codes and recovery links
ADMIN_SECRET         # long random string; protects /admin and /reveal APIs
```

---

## 3. Setup: Retiring ScoopShare

The free Upstash plan allows **one database**, so Critical Mixer reuses
ScoopShare's.

1. **Wipe the old data.** In the Upstash console, run `FLUSHDB` on the store,
   or delete ScoopShare's keys. ⚠️ This cannot be undone, so export anything you
   want to keep first.
2. Either deploy Critical Mixer **into the ScoopShare Vercel project**
   (replacing the code), **or** create a new Vercel project and connect the
   existing Redis store to it, disconnecting it from ScoopShare.
3. All Critical Mixer keys are prefixed `cmx:` so they're easy to find and wipe
   later.

---

## 4. Screens (Player, Mobile-First)

### 4.1 Join — `/`
- Fields: **Name** (free text, 1–40 chars, trimmed) and **Company**
  (a segmented control or dropdown: Critical Mass, artbot., Tribal, RAPP).
- A "Join" button, plus a secondary link: "Already playing? Log back in".
- One line of privacy copy: *"We only store your name and company, and
  everything is deleted after the game."*
- On success, show the **recovery code screen** (4.2) once.

### 4.2 Recovery code — shown once after joining
- Big text: `TANGO-OTTER-42`
- Copy: *"Screenshot this. If you switch phones or clear your browser, you'll
  need it (with your name) to get back in."*
- "Got it" → Home.
- The code also stays viewable from a small "My recovery code" link on Home.

### 4.3 Home — `/play`
The main screen, top to bottom:

1. **Your QR code**, large and centred. It refreshes every 30s, with a subtle
   progress ring so people understand it's live. Name and company appear
   under it.
2. **"Scan someone"**, a big primary button that opens the camera scanner.
3. **Pending scan-backs.** A card for each person who has scanned you and is
   waiting for you to scan them back: *"Priya (Tribal) scanned you — scan her
   back to lock it in! 7:42 left"*.
4. **Your score:** *"You have **18** points · 11 people met"*.
5. **Top 3 (hidden names).** Three rows showing the three highest distinct
   point totals and how many players are on each:
   ```
   🥇 ???  34 pts
   🥈 ???  31 pts   (3 players tied)
   🥉 ???  29 pts
   ```
   plus a nudge: *"11 more points to reach the top 3"* (hidden if the player
   is already there).
6. **People you've met:** a collapsible list (name, company, time).

When the game status is `lobby`, the QR code is visible but greyed out with
*"Game starts soon"*, and scanning is disabled.
When it's `ended`, the screen switches to the **results view** (4.6).

### 4.4 Scanner
- A full-screen camera view using `qr-scanner`, with a close button.
- On a successful decode, call `POST /api/scan` and show the result sheet:
  - **First scan (pending):** *"Nice! Now let **Sam (RAPP)** scan you back."*
    plus the **icebreaker question**.
  - **Second scan (confirmed):** *"You met **Sam**! +2 points"* with a small
    celebration (confetti burst or a haptic via `navigator.vibrate` where
    supported).
  - **Already met:** *"You've already met Sam!"*
  - **Errors:** expired code ("That code expired — ask them to hold it up
    again"), scanning yourself, game not active.
- If camera permission is denied, explain how to enable it, and remind the
  player that their phone's normal camera app also works (see 4.5).

### 4.5 Native camera fallback — `/m/[token]`
Each QR code encodes a full URL (§6), so scanning with the phone's regular
camera app opens this page.
- If the visitor is logged in (localStorage), auto-submit the scan and show the
  same result sheet as 4.4, then a "Back to game" button.
- If not, show Join / Log back in. Once complete, submit the scan.

> **In-app browser caveat:** If someone opens the game inside Teams/Slack's
> built-in browser, the camera may not work, and their login won't carry over
> to Safari/Chrome. The join screen should detect common in-app browsers
> and suggest *"Open in Safari/Chrome for the best experience"*. The recovery
> code covers anyone who gets stuck.

### 4.6 Results view (game ended)
- *"That's a wrap!"*, followed by the winner name(s) with company, the top-3 tiers
  now with names revealed, and the player's own final stats (points, people
  met, how many from each company).

### 4.7 Log back in — `/recover`
- Fields: **Name** and **Recovery code**.
- Name matching is case-insensitive and ignores extra whitespace.
- On success, restore the session (see §7).

---

## 5. Screens (Host)

### 5.1 Admin — `/admin`
- A password field for `ADMIN_SECRET`, stored in `sessionStorage` and sent as
  the `x-admin-key` header on admin API calls.
- **Game controls:** current status, then **Start game** (`lobby → active`)
  and **End game** (`active → ended`), each with an "Are you sure?" confirm.
  A **Reopen** option (`ended → active`) is there in case End is pressed by
  mistake.
- **Live glance:** player count, confirmed meets, cross-company %, and the
  current top-3 *with* names (host only).
- **Player recovery:** search by name (partial match) and see results with
  name, company, points, and join time. A **"Generate login QR"** button shows
  a one-time QR that logs that player back in on their phone
  (`/r/[signedToken]`, valid 10 minutes, single use).
- **Danger zone:** "Wipe all game data", which requires typing `WIPE` to confirm.

### 5.2 Reveal — `/reveal` (big screen, "Wrapped" style)
A full-screen, high-contrast slideshow for the announcement. It's
**host-paced**: it advances on click, the space bar, or the right arrow, so you
control the drama. It's protected by the same admin key and only available once
the game is `ended`.

Suggested sequence (all from the data in §6):

1. **Intro:** "Critical Mixer — 3 days. 4 companies. 1 office."
   (subtitle: "3–5 November 2026")
2. **Players:** "**487** of you joined" with an animated bar per company.
3. **Meets:** "**3,912** meets made", with a big number count-up.
4. **Crossing lines:** "**71%** were cross-company".
5. **Best pairing:** a 4×4 company matrix heat-map, then a highlight:
   "**Tribal × RAPP** met the most — 642 times".
6. **Most social company:** the highest average points per player.
7. **Peak mingling:** "The busiest hour was **Wednesday, 1–2pm**", with a
   small hourly bar chart across the 3 days.
8. **The chase:** the 3rd and 2nd place tiers revealed (names and points).
9. **Drumroll…:** a pause slide.
10. **Winner(s):** a big name card for each winner with their company and
    points. If there's a tie, all winners appear side by side ("It's a
    tie!"). Confetti.

Visual direction: bold type, big numbers, saturated colour blocks, one stat per
slide, and smooth transitions. Think Spotify Wrapped, but in Critical Mixer
branding (see §5.3).

### 5.3 Branding & theme tokens
- **Product name:** Critical Mixer. Use it in the `<title>`, the join screen
  header, the PWA/home-screen name, and the reveal intro.
- All participating companies are presented under the **Critical Mass**
  banner. Use `cm-tokens.json` as the source of truth for the product's visual
  identity; create `styles/tokens.css` from those tokens and mirror them into
  the Tailwind theme. Do not create separate company themes or company color
  palettes.
- **Company logos are supporting assets**, not separate product brands. Add
  the Critical Mass, artbot., Tribal, and RAPP logos when supplied, and use
  them where useful for company identification (for example, selectors,
  player details, or reveal statistics). Keep the product-wide interface and
  visual identity on the Critical Mass token system.
- Use PP Object Sans as the primary typeface and Compacta STD sparingly for
  impactful headlines, following the supplied token roles. Confirm font
  licensing and use approved font files before bundling them; retain sensible
  fallbacks.
- **No color literals in components.** Reference the shared theme tokens so
  the product palette stays consistent and easy to update.
- **Keep the QR code itself black on white** regardless of the palette.
  Brand colours can frame it, but low-contrast or inverted QR codes scan
  noticeably worse on older phones.

---

## 6. QR Codes & Anti-Cheat

### Rotating codes, zero Redis calls
- On join, the server derives a **per-player key**:
  `playerKey = HMAC(QR_SECRET, playerId)` and returns it to the client, which
  stores it in localStorage.
- The client computes a fresh code every **30 seconds**:
  ```
  window = floor((Date.now() + serverOffset) / 30000)
  sig    = base64url(HMAC(playerKey, `${playerId}.${window}`)).slice(0, 12)
  url    = `${ORIGIN}/m/${playerId}.${window}.${sig}`
  ```
- `serverOffset` comes from `serverTime` in the poll response, which corrects
  for phone clock drift.
- **`ORIGIN` is never hard-coded.** On the client it's
  `window.location.origin`; on the server (admin login links, etc.) it's
  derived from the request URL. QR codes therefore work on the `*.vercel.app`
  preview URL, the final production URL, and any custom domain added later,
  with no code change. The only thing to regenerate once the final URL exists
  is the printed **"join the game" poster QR** (§14).
- The server verifies by re-deriving `playerKey` from `QR_SECRET` and checking
  the signature. It accepts `window - 1`, `window`, and `window + 1`, so a code
  is valid for roughly 60–90 seconds. **No Redis read is needed to validate a code.**

### Why this is enough
- A screenshot or a code posted in Teams dies within about a minute.
- The **two-way scan** means faking a meet needs *both* people to cooperate,
  and anyone willing to do that is basically playing anyway.
- This is deliberately "keep it fun" security. Guardrails can be added later
  (e.g. a cap on meets per hour).

### Player IDs
- 10-character random base62 IDs (`nanoid`). Short IDs keep the QR code simple
  and easy to scan from a distance.

---

## 7. Identity & Recovery (No Email)

- **Session:** `{ playerId, playerKey, name, company }` is kept in localStorage.
  Every API call sends `playerId`, plus a lightweight `sessionSig =
  HMAC(QR_SECRET, playerId + ":session")` that the server issued, so nobody can
  act as another player just by knowing their ID.
- **Recovery code:** the format is `WORD-WORD-NN`, built from a curated list of
  ~200 short, friendly, unambiguous words (no offensive or confusable words),
  which gives ~3.6M combinations.
  - Uniqueness is enforced with `SET cmx:recovery:{CODE} {playerId} NX`; on a
    collision, regenerate.
  - Logging back in needs name + code. The name is checked against the player
    record (case-insensitive) as a light sanity check.
  - Rate limit: 5 failed attempts per IP per 10 minutes (an Upstash counter
    with TTL). This is low stakes, so keep it simple.
- **Admin recovery:** see 5.1. The token is `playerId.expiry.sig`, signed with
  `QR_SECRET`, and marked used in Redis on redemption (`SET ... NX EX 600`).
- **Duplicate names** are fine. People are shown as "Sam K. · Tribal" where
  possible, and the company always appears next to the name.

---

## 8. Data Model (Redis, `cmx:` prefix)

| Key | Type | Contents |
|---|---|---|
| `cmx:public` | string (JSON) | `{ status, startedAt, endedAt, top3: [{points, count}], updatedAt }`. This is the cached public state every poll reads. |
| `cmx:player:{id}` | hash | `name, company, points, meetCount, recoveryCode, createdAt` |
| `cmx:recovery:{CODE}` | string | `playerId` |
| `cmx:scores` | sorted set | `playerId → points` |
| `cmx:pair:{lowId}:{highId}` | hash | `{lowId}: scanTs, {highId}: scanTs, confirmedAt` |
| `cmx:pending:{id}` | sorted set | `scannerId → scanTs` (people waiting for *this* player to scan them back) |
| `cmx:met:{id}` | sorted set | `otherId → confirmedTs` (for the "people you've met" list) |
| `cmx:stats` | hash | `players`, `players:{company}`, `meets`, `crossMeets`, `pair:{A}|{B}` (sorted company names), `hour:{YYYY-MM-DDTHH}` |
| `cmx:names` | hash | `playerId → "name|company"` (for admin search and the reveal; one HGETALL instead of N lookups) |
| `cmx:ratelimit:{ip}` | string w/ TTL | failed recovery attempts |
| `cmx:recover-used:{tokenSig}` | string w/ TTL | single-use admin login tokens |

---

## 9. API Routes

All routes are Next.js Route Handlers. Use `redis.pipeline()` / `multi()` for
grouped writes so each request is a single HTTP round trip. Note that every
command in a pipeline still counts toward the command budget.

### Player

| Route | Purpose |
|---|---|
| `POST /api/join` | `{ name, company }` → creates the player and recovery code, increments stats, returns the session + `playerKey` + recovery code |
| `POST /api/recover` | `{ name, code }` → returns the session |
| `POST /api/recover-link` | `{ token }` → validates the admin-generated token, returns the session |
| `GET /api/me` | Returns the poll payload (below) |
| `POST /api/scan` | `{ token }` → the scan logic (below) |
| `GET /api/met` | The player's met list (loaded only when the list is expanded) |

### `GET /api/me` (the poll)
Returns:
```ts
{
  serverTime: number,
  status: 'lobby' | 'active' | 'ended',
  me: { points, meetCount },
  top3: [{ points, count }],          // names hidden unless status === 'ended'
  pending: [{ id, name, company, scannedAt }],
  winners?: [{ name, company, points }] // only when ended
}
```
Commands: `GET cmx:public`, `HMGET cmx:player:{id} points meetCount`, and
`ZRANGEBYSCORE cmx:pending:{id} (now-10min) +inf`, which is **3 commands**. Pending
names come from a single `HMGET cmx:names` only when the pending list is
non-empty.

### `POST /api/scan` logic
```
1. Verify the session signature for the scanner (A)
2. Parse the token → targetId (B), window, sig; verify the signature (no Redis)
3. Reject if A === B
4. Read cmx:public → reject unless status === 'active'
5. HMGET B's name, company (and A's company) → reject if B doesn't exist
6. Read cmx:pair:{low}:{high}
   - confirmedAt set → "already met"
   - B already scanned A within the last 10 min → CONFIRM (step 7)
   - otherwise → write A's scanTs to the pair hash,
                 ZADD cmx:pending:{B} A now,
                 return { result: 'pending', other: B, icebreaker }
7. CONFIRM (in one MULTI):
   - HSET pair confirmedAt
   - pts = A.company !== B.company ? 2 : 1
   - HINCRBY points & meetCount on both players
   - ZINCRBY cmx:scores pts for both
   - ZADD cmx:met:{A} B now; ZADD cmx:met:{B} A now
   - ZREM cmx:pending:{A} B
   - HINCRBY cmx:stats meets, crossMeets (if cross), pair:{X}|{Y}, hour:{bucket}
   then recompute top3 (§10) and SET cmx:public
   return { result: 'confirmed', other: B, points: pts, icebreaker }
```
Race safety: two people scanning each other at the same instant can both reach
the "pending" branch. Guard the confirm with `HSETNX pair confirmedAt` so only
the first request awards points. The second sees "already met," which reads
fine to both users.

### Icebreaker selection
Deterministic per pair, so both phones show **the same question**:
`index = hash(lowId + highId) % ICEBREAKERS.length`. This costs nothing. The
question list lives in a plain TS file (§13).

### Admin (all require the `x-admin-key` header)

| Route | Purpose |
|---|---|
| `POST /api/admin/status` | `{ status }`: start / end / reopen. Updates `cmx:public` |
| `GET /api/admin/overview` | Counts, cross %, top 3 with names |
| `GET /api/admin/search?q=` | Name search over `cmx:names` |
| `POST /api/admin/recovery-token` | `{ playerId }` → a signed one-time login URL |
| `GET /api/admin/wrapped` | All reveal-page data, computed once and cached as `cmx:wrapped` after the game ends |
| `POST /api/admin/wipe` | `{ confirm: 'WIPE' }` → `SCAN` + `DEL` all `cmx:*` keys |

---

## 10. Leaderboard: Top 3 Tiers

"Top 3" means the **three highest distinct point totals** and how many players
are on each. This answers "how many points do I need to reach the top 3?"
even when lots of people are tied.

Recompute after each confirmed meet:
```
ZREVRANGE cmx:scores 0 99 WITHSCORES   → tally distinct scores, take the top 3
```
If a tier's count could extend past the 100 fetched rows (unlikely), use
`ZCOUNT cmx:scores s s` for that tier. Store the result in `cmx:public.top3`.

The client computes the nudge: `gap = top3[2].points - me.points + 1`, shown
only if positive. If there are fewer than 3 distinct scores, the nudge is
hidden.

**Winners** (on end): `ZREVRANGE cmx:scores 0 0 WITHSCORES` gives the top
score, then `ZRANGEBYSCORE cmx:scores top top` gives **all** players on that
score. Every one of them is a winner.

---

## 11. Polling & Command Budget

The free Upstash plan includes **500,000 commands/month**. Design target: stay
**under ~350K for the whole event**.

- Poll `GET /api/me` every **30 seconds**, **only while
  `document.visibilityState === 'visible'`**. Poll immediately on
  `visibilitychange` → visible, and right after any scan.
- Don't poll at all on `/m/[token]` or the scanner screen.

Rough estimate for 500 players:

| Activity | Assumption | Commands |
|---|---|---|
| Polling | ~60 min of app-open time per player over 3 days → 120 polls × 3 cmds × 500 | ~180K |
| Confirmed meets | ~30 meets per player → ~7,500 confirmations × ~15 cmds | ~115K |
| Pending (first) scans | ~7,500 × ~6 cmds | ~45K |
| Joins, recoveries, admin, reveal | — | ~10K |
| **Total** | | **~350K** |

**Monitoring:** wrap the Redis client in a tiny counter that logs commands per
route (console only), and check the Upstash dashboard at the end of Day 1. If
usage is tracking high, raise the poll interval to 45–60s with a single
constant (`POLL_MS`). Worst case, pay-as-you-go overage is $0.20 per 100K
commands.

---

## 12. Edge Cases

- **Expired QR code:** "That code expired — ask them to hold it up again."
- **Pending expires (10 min):** the half-scan is silently dropped. If B
  later scans A, it's treated as a fresh first scan.
- **Scan during `lobby` or after `ended`:** rejected with a friendly message.
- **Game ended while someone is mid-scan:** the server is the source of
  truth, so the scan is rejected.
- **Player clears storage:** the recovery code or admin login QR restores them,
  with all points kept.
- **Two accounts for one person:** allowed, but each account scores
  separately, so there's no benefit. Admin can see duplicates in search.
- **Clock drift:** handled with `serverOffset` plus a ±1 window tolerance.
- **Camera permission denied / in-app browsers:** the native camera fallback
  (4.5) plus the "Open in Safari/Chrome" hint.
- **Bright-screen readability:** the QR is rendered with a quiet zone, high
  contrast, and at least 240px. Optionally bump screen brightness guidance:
  "Turn your brightness up if it won't scan."

---

## 13. Icebreaker Bank (v1, editable)

Light, work-safe, and inclusive, with no assumptions about family, drinking,
money, or religion. Stored in `lib/icebreakers.ts` as a plain array.

1. What's the best thing you've eaten this month?
2. What was your first-ever job?
3. What's a skill you have that nobody at work knows about?
4. What's the most-used non-work app on your phone?
5. If you could instantly master one instrument, what would it be?
6. What's a small thing that reliably makes your day better?
7. What's your go-to karaoke song?
8. What did you want to be when you were ten?
9. What's the best piece of advice you've ever been given?
10. What's a project you're secretly proud of?
11. What's your hottest take on office snacks?
12. Which fictional world would you most like to live in?
13. What's something you've changed your mind about recently?
14. What's the most interesting place you've ever worked from?
15. What's a hobby you picked up and then abandoned?
16. What's a London spot most people don't know about?
17. Tea or coffee — and how do you take it?
18. What's the last thing that made you laugh out loud?
19. What's a tool or shortcut that changed how you work?
20. If your job had a theme song, what would it be?
21. What's a book, show, or podcast you keep recommending?
22. What's the best piece of work you've ever seen land?
23. What's one thing your company does that the others should steal?
24. Window seat or aisle seat?
25. What's your most controversial food opinion?
26. If you could swap roles with anyone here for a day, what would you try?
27. What did you do before this job?
28. What's a word or phrase you know you overuse?
29. What's the best ad you've seen this year?
30. What's a trend you hope never comes back?
31. Early bird or night owl — and is it by choice?
32. What does your perfect Saturday look like?
33. What's a weird topic you know way too much about?
34. What's the most useful thing you've learned in the last year?
35. Which brand has the best personality, in your opinion?
36. What's your favourite way to get around London?
37. What's a small win you've had this week?
38. If you could add one room to this office, what would it be?
39. What's the most overrated piece of tech you own?
40. What's something on your bucket list?
41. What's your favourite way to take a break during the workday?
42. Cats, dogs, or neither — defend your answer.
43. What's the best gig, show, or exhibition you've been to?
44. What's a job you'd be absolutely terrible at?
45. What was the first thing you bought with your own money?
46. What piece of work jargon would you ban forever?
47. Which emoji do you use the most?
48. What are you hoping to learn from the people you meet this week?
49. If you started a side business tomorrow, what would it be?
50. What's the best thing about where you grew up?

---

## 14. Suggested Build Order

1. **Prepare project and infrastructure:** configure Vercel, Upstash, and
  environment variables; map `cm-tokens.json` into `styles/tokens.css` and
  Tailwind. Retire ScoopShare and wipe/reconnect Redis as described in §3.
2. **Join + session + recovery code** (`/`, `/api/join`, `/recover`).
3. **Rotating QR code** on `/play` (client HMAC, `serverOffset`).
4. **Scan flow**: scanner UI, `/api/scan`, pending → confirm, and the
   icebreaker sheet.
5. **Native camera fallback** `/m/[token]`.
6. **Polling + Home**: score, pending scan-backs, top-3 tiers, met list.
7. **Admin**: start/end, overview, search, login-QR recovery, wipe.
8. **Results view** on phones when the game has ended.
9. **Reveal page** (Wrapped slides) + `/api/admin/wrapped`.
10. **Test with 5–10 people** on a mix of iPhones and Androids, including the
    native camera path and a Teams/Slack in-app browser. Check the Upstash
    command count afterwards and extrapolate to 500.
11. **Generate the "join the game" poster QR** from the live production URL.
12. **Wipe test data** before launch day.

### Timeline to launch

| When | Milestone |
|---|---|
| Wed 14 – Fri 23 Oct | Build steps 1–8 (core game + admin) |
| Mon 26 – Wed 28 Oct | Reveal page; deployed to Vercel |
| Thu 29 – Fri 30 Oct | Test session with 5–10 people; fix issues; check Redis usage |
| Mon 2 Nov | Wipe test data; poster QR printed and up; game in `lobby` so people can join early |
| **Tue 3 Nov, morning** | Host taps **Start game** |
| Tue 3 – Thu 5 Nov | Game live; check Upstash usage end of Tue |
| **Thu 5 Nov, end of day** | Host taps **End game** → reveal on the big screen |
| After | Save reveal stats if wanted, then wipe all `cmx:` data |

---

## 15. After the Game

- Take a screenshot or export of the reveal stats if you want to keep them.
- **Wipe all `cmx:` data** via Admin, which keeps the promise on the join screen.

---

## Open Items

- **Company logo assets:** add supplied/approved Critical Mass, artbot.,
  Tribal, and RAPP logos where useful for company identification (§5.3).
- **Production URL:** known once deployed. Nothing in the app depends on it
  (§6); only the poster QR needs generating from it.
- **Exact start/end times** on 3 and 5 November (the host triggers both, so
  this only affects comms and the reveal moment).

## Progress Tracking & Delivery

- `TODO.md` is the source of truth for build tasks. Treat each checkbox as a
  separate delivery and mark it complete only after its focused checks pass.
- After completing each TODO item, update `changelog.md`, create a separate
  commit for that item, and push the commit to the current branch. Keep each
  commit scoped to that item's changes; report any push failure or missing
  remote access rather than marking the delivery as pushed.
