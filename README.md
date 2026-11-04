# Hulegeb Marketplace frontend

The frontend is a bilingual English/Amharic multi-vendor marketplace built with
Next.js App Router, React, TypeScript, and Tailwind CSS v4. Existing authentication,
catalog, buyer dashboard, and order functionality should be preserved during
frontend changes.

## Setup

Install dependencies and configure the backend URL:

```powershell
pnpm install
Copy-Item .env.example .env.local
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to the backend API URL, then run:

```bash
pnpm dev
```

The development server is available at [http://localhost:4000](http://localhost:4000).
The backend defaults to port 3000; its `FRONTEND_URL` and CORS allowlist should
include `http://localhost:4000` for local browser authentication and API requests.

## Scripts

- `pnpm lint` — run ESLint.
- `pnpm exec tsc --noEmit` — type-check the project.
- `pnpm build` — create a production build.

## Architecture

See [`src/README.md`](./src/README.md) for the source organization, API boundaries,
localization structure, and design-token notes.
