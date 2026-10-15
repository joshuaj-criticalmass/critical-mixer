# Critical Mixer Build TODO

Each checkbox is a separate delivery. Complete the item's focused checks,
update `changelog.md`, then commit and push that item before moving on. See
the delivery workflow in [Critical-Mixer-BUILD-SPEC.md](Critical-Mixer-BUILD-SPEC.md#progress-tracking--delivery).

- [x] Align the build spec with the CM token system and establish progress tracking.
- [x] Prepare the local environment template, ignore rules, and setup notes.
- [x] Bootstrap the Next.js App Router project, shared token theme, Redis client, and core utilities.
- [x] Create and locally link a separate Critical Mixer project in the personal Vercel workspace.
- [x] Connect the existing Upstash database and configure Production/Preview/Development environment variables.
- [x] Establish CLI Preview deployments; GitHub-based automatic deployments are optional and remain unavailable.
- [ ] Connect the Vercel project to `joshuaj-criticalmass/critical-mixer` for automatic deployments, if the Vercel GitHub integration issue is resolved.
- [ ] Decide what ScoopShare data to export and get explicit approval before any Redis wipe.
- [x] Implement player join, session handling, recovery codes, and account recovery.
- [x] Unify player identity and make every confirmed meet worth one point.
- [x] Implement rotating player QR codes with server-time correction, lobby gating, and a 30-second refresh indicator.
- [x] Implement in-app QR scanning, pending scan-backs, atomic one-point confirmation, and shared icebreakers.
- [x] Implement the native-camera QR fallback with token-preserving Join/Recover handoff.
- [x] Implement player home, visible-tab polling, pending scan-backs, leaderboard tiers, and lazy met-player history.
- [x] Implement admin controls, overview, player search, recovery QR, and guarded data wipe.
- [x] Implement the ended-game results view with all tied winners and revealed top-three names; live ended-state visual verification remains pending.
- [x] Implement wrapped-stat aggregation and the host-paced reveal presentation; real event-data verification remains part of launch testing.
- [ ] Test with 5–10 people across iOS and Android, including native-camera and in-app-browser flows; blocked until the Upstash resource is restored (Preview admin overview returns 503; no test players or meets were written).
- [ ] Deploy to production, generate the join poster QR, and prepare the lobby for launch.
- [ ] Run the event, monitor Redis usage, end the game, and present the reveal.
- [ ] Export any desired final stats, then wipe all `cmx:` data after the game.