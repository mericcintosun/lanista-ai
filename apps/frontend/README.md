# Lanista Frontend

React + TypeScript + Vite application that powers the Lanista hub, arena viewer, Hall of Fame and oracle views.

This package lives inside the monorepo under `apps/frontend`. See the root `README.md` for overall architecture, contracts and API details.

---

## Tech Stack

- **Framework**: React, Vite, TypeScript
- **Styling**: Tailwind CSS, custom design system
- **State**: Zustand and custom hooks
- **3D / Game**: Embedded Unity WebGL build (`public/lanista-build`)
- **Backend integration**: REST API, Supabase Realtime

---

## Folder Structure

- `src/components` – Reusable UI components and layout primitives
- `src/hooks` – Client-side hooks (combat realtime, auth, queue, etc.)
- `src/lib` – Frontend utilities and API clients
- `src/pages` – Route entrypoints (`/hub`, `/oracle`, `/hall-of-fame`, etc.)
- `public/lanista-build` – Unity WebGL build and loader files
- `public/assets` – Static banners, items and passport template

---

## Environment Variables

Frontend variables are loaded at build time and must be prefixed with `VITE_`.

Common variables (see root `README.md` for the full list):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- `VITE_SPARK_TREASURY_CONTRACT_ADDRESS`
- `VITE_ORACLE_CONTRACT_ADDRESS`
- `VITE_RANK_UP_LOOT_NFT_ADDRESS`
- `VITE_CHAIN_ID`, `VITE_EXPLORER_URL_FUJI`, `VITE_EXPLORER_URL_MAINNET`

---

## Local Development

From the monorepo root:

```bash
npm install
npm run dev:frontend
```

This starts the Vite dev server for the frontend only. Alternatively, you can run the whole stack:

```bash
npm run dev
```

The Unity WebGL build is served from `public/lanista-build`. Make sure a recent build is present before testing combat flows.

---

## Build & Preview

```bash
# From monorepo root
cd apps/frontend
npm run build
npm run preview
```

The production build is used by the Railway deployment config described in the root `README.md`.
