## Backend Deployment Guide (Render + Cloudflare R2)

- **Repo structure**
  - API code lives in `server/src`
  - Storage helpers live in `server/src/storage`, with drivers for `local` and `r2`
  - JSON data defaults to `server/data` when using the `local` driver

- **Environment variables**
  - Duplicate `server/env.example` into `.env` for local development
  - Always set `STORAGE_DRIVER=r2` on Render to use Cloudflare R2
  - Provide the Cloudflare credentials and bucket configuration as Render secrets
  - Optional `CLOUDFLARE_R2_PREFIX` prefixes every object key (useful by environment)
  - Set `CLOUDFLARE_R2_PUBLIC_BASE_URL` if the bucket exposes public assets via a CDN

- **Render deployment**
  - `render.yaml` in the repo root defines a `web` service targeting the `server` directory
  - Render runs `npm install` followed by `npm run start`, leveraging `package.json` scripts
  - Configure secrets in Render’s dashboard or via the YAML `secrets` entries (`sync: false` by default)
  - Expose the service on HTTPS; Render will manage TLS/HTTP automatically

- **Cloudflare R2 usage**
  - Binary uploads (`images`, `videos`, etc.) should be written via `storage.writeFile`
  - `storage.getPublicUrl` returns a CDN link when `CLOUDFLARE_R2_PUBLIC_BASE_URL` is set
  - For private assets, omit the public base URL and serve via signed URLs (future enhancement)
  - Keep JSON metadata in R2 by writing to `storage.writeJson` with appropriate key prefixes

- **Local development**
  - switch `STORAGE_DRIVER` to `local` in `.env` when you want filesystem storage (`server/data`)
  - leave it as `r2` to exercise the full cloud flow (requires valid credentials)
  - Add breakpoint-friendly logging via `morgan` already configured in `server/src/app.js`

- **Next steps**
  - Implement upload endpoints that call into the storage service
  - Add request validation for media uploads (size, mime types)
  - Consider background processing (e.g., queues) for media transformations on R2

