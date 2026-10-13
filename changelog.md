# Changelog

Project progress is recorded here as TODO items are completed. Each completed
item should be committed and pushed separately.

## 2026-10-13

- Completed TODO: aligned the build spec with Critical Mass as the product-wide
  brand, using `cm-tokens.json` as the source of truth and company logos as
  supporting identification assets.
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
  created a protected Preview deployment through the Vercel CLI:
  https://critical-mixer-pv6vkeebt-joshuabrainjaffe.vercel.app
- The Preview is protected by Vercel Authentication. No Production deployment
  was made.