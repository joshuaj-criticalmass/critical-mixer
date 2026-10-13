# Critical Mixer

Critical Mixer is a three-day, in-person meet game for the London office.
The product uses the Critical Mass design tokens in `cm-tokens.json` and
stores game state in Upstash Redis under the `cmx:` key prefix.

## Local setup

The application scaffold is the next build task. Once it is in place:

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and provide the Upstash REST URL and
   token, plus independent long random values for `QR_SECRET` and
   `ADMIN_SECRET`.
3. Run the app with `npm run dev`.

Never commit `.env.local`, production secrets, or `.vercel` project metadata.
The variable names match ScoopShare's existing Upstash setup; its Redis
client also supports the `KV_REST_API_URL` and `KV_REST_API_TOKEN` aliases.

## Deployment and Redis preparation

Create a Critical Mixer Vercel project and connect it to the existing Upstash
database after the app scaffold is ready. Keep ScoopShare available until the
new deployment is verified. Before removing ScoopShare data or running
`FLUSHDB`, export anything that must be retained and get explicit approval;
the wipe is irreversible. Do not run database cleanup as part of local setup.

See [Critical-Mixer-BUILD-SPEC.md](Critical-Mixer-BUILD-SPEC.md) for the full
build, game, and launch plan.