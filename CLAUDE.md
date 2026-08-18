# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`umax-frontend` is the SPA frontend for the "umax" project (deployed publicly as `erpdh.credimasperu.com`). It consumes a separate Laravel API backend (repo `ayni-x/umax`, local dev at `http://umax.test`, not yet deployed to production).

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check (`tsc -b`) then build for production (`vite build`); loads `.env.production` automatically
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint (`.oxlintrc.json`)

There is no test runner configured yet.

## UI library: Material UI (MUI) — do not introduce alternatives

This project standardizes on **MUI** (`@mui/material`, `@mui/icons-material`, `@emotion/react`/`styled` as its engine). All new UI must be built with MUI components (`Box`, `Stack`, `Container`, `TextField`, `Button`, etc.) and the `sx` prop for one-off styling, consistent with existing pages (`src/pages/LoginPage.tsx`, `src/pages/HomePage.tsx`).

- Do not add another component/styling library (no Tailwind, no Chakra, no styled-components, no CSS modules) — stay within MUI + `sx` / `styled` from `@mui/material/styles`.
- Theme is centralized in `src/theme/theme.ts` (`buildTheme(mode)`), a monochrome black/white palette with `borderRadius: 10`, no elevation on `Paper`/`AppBar`, and `TextField` defaulting to `outlined` + `fullWidth`. Prefer extending this theme (palette tokens, `components.styleOverrides`, `defaultProps`) over overriding styles ad hoc in individual components.
- Light/dark mode is handled by `ThemeModeProvider` (`src/theme/ThemeModeContext.tsx`), which persists the choice to `localStorage` (`theme_mode`) and falls back to `prefers-color-scheme`. Consume it via `useThemeMode()`; don't build a second theme/mode mechanism.
- Fonts are Roboto via `@fontsource/roboto` (imported once in `main.tsx`), matching MUI's default typography.

## Architecture

- **Routing**: `react-router-dom` v7 with a single `BrowserRouter` in `App.tsx`. `ProtectedRoute` (`src/routes/ProtectedRoute.tsx`) wraps a single layout route (`AppLayout`, rendering `<Outlet />`) instead of gating each page individually; it redirects to `/login` when there's no user and shows an MUI `CircularProgress` while auth state is loading.
- **Lazy-loaded module pages**: `LoginPage` and `HomePage` are imported eagerly (one of them is almost always needed on first load), but every other module page (`EmpresasPage`, `AgenciasPage`, and future ones like `UsersPage`) is loaded with `React.lazy()` in `App.tsx` so each becomes its own JS chunk, only downloaded when the user navigates there. `AppLayout` wraps its `<Outlet />` in a single `<Suspense fallback={<TableSkeleton />}>`, so new lazy pages don't need their own Suspense boundary. Follow this pattern for any new top-level module page.
- **Auth**: token-based, not cookie/Sanctum-SPA session-based. `AuthProvider`/`useAuth()` (`src/hooks/useAuth.tsx`) holds `user` in memory and the bearer token in `localStorage` (`access_token`). On mount it calls `GET /auth/me` if a token exists to rehydrate the session. `login()`/`logout()` call the backend and update both `localStorage` and context state.
- **API layer**: `src/api/client.ts` exports `apiFetch<T>(path, options)`, a thin `fetch` wrapper that prefixes `VITE_API_URL`, attaches `Authorization: Bearer <token>` when present, and throws on non-OK responses using the backend's `message` field. Domain-specific calls live in per-resource files under `src/api/` (e.g. `auth.ts`) that call `apiFetch` and type the result with `src/types/api.ts`.
- **API response shape**: the backend wraps responses as `ApiResponse<T> = { success, message, data }` (see `src/types/api.ts`). Type new endpoint responses the same way rather than assuming a bare payload.
- **Env config**: `VITE_API_URL` is the only env var, pointing at the backend's `/api` base path.
  - `.env` (dev, gitignored) → `http://umax.test/api`
  - `.env.production` (prod, gitignored) → `https://erpbk.credimasperu.com/api`
  - `.env.example` is the tracked template (dev-style default).

## Shared components — extract once a second page needs the same pattern

`src/components/` holds cross-page UI, not one-off page pieces. Module pages (Empresas, Agencias, ...) follow the same CRUD shape: a `DataTable`-driven list with pagination, a create/edit `Dialog`, and a delete `ConfirmDialog`. When a new module page needs that same shape, reuse these instead of copy-pasting a table/dialog:

- `DataTable<T>` (`src/components/DataTable.tsx`) — column-driven table with loading state, empty message, and pagination built in. Pass `columns: DataTableColumn<T>[]` (each with a `render(row)`), not raw JSX rows.
- `ConfirmDialog` (`src/components/ConfirmDialog.tsx`) — generic delete/destructive-action confirmation dialog.
- `TableSkeleton` (`src/components/TableSkeleton.tsx`) — the `Suspense` fallback used in `AppLayout` for lazy module pages.

Create/edit form dialogs are left inline per page (fields differ per resource), not abstracted. The rule of thumb used so far: don't extract a shared component pre-emptively — wait until a second page actually needs the same behavior, then lift it into `src/components/`.

## Deployment

Production build (`npm run build`) outputs static files to `dist/`, served by nginx as an SPA (`try_files $uri /index.html`) on the DigitalOcean server under `/var/www/credimas/erpdh`, domain `erpdh.credimasperu.com`. The backend API domain (`erpbk.credimasperu.com`) is reserved but not yet deployed.
