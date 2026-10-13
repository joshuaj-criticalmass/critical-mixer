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