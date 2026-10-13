# Critical Mixer Build TODO

Each checkbox is a separate delivery. Complete the item's focused checks,
update `changelog.md`, then commit and push that item before moving on. See
the delivery workflow in [Critical-Mixer-BUILD-SPEC.md](Critical-Mixer-BUILD-SPEC.md#progress-tracking--delivery).

- [x] Align the build spec with the CM token system and establish progress tracking.
- [ ] Prepare the app, Vercel and Upstash configuration; retire ScoopShare and reconnect Redis as specified.
- [ ] Bootstrap the Next.js App Router project, shared token theme, Redis client, and core utilities.
- [ ] Implement player join, session handling, recovery codes, and account recovery.
- [ ] Implement rotating player QR codes and lobby/active game-state behavior.
- [ ] Implement scan validation, pending scan-backs, confirmation, scoring, and icebreakers.
- [ ] Implement the native-camera QR fallback and in-app-browser guidance.
- [ ] Implement player home, visible-tab polling, leaderboard tiers, and met-player history.
- [ ] Implement admin controls, overview, player search, recovery QR, and data wipe.
- [ ] Implement the ended-game results view for players.
- [ ] Implement wrapped-stat aggregation and the host-paced reveal presentation.
- [ ] Add supplied company logos for supporting identification uses; keep the CM visual system.
- [ ] Test with 5–10 people across iOS and Android, including native-camera and in-app-browser flows; review Redis usage.
- [ ] Deploy to production, generate the join poster QR, and prepare the lobby for launch.
- [ ] Run the event, monitor Redis usage, end the game, and present the reveal.
- [ ] Export any desired final stats, then wipe all `cmx:` data after the game.