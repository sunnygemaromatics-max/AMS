# Asset Management System (AMS)

Enterprise asset management web application — track, allocate, audit and
report on hardware, software licenses, infrastructure and consumables across
multiple locations and departments. Built for The Studio Infinito by
Personify Crafters.

**Production URL:** https://ams.thestudioinfinito.com

---

## Features

- **Assets** — full register with status workflow (available · allocated ·
  under maintenance · lost · damaged · scrapped), allocation / transfer /
  return flows, bin-card history, QR code generation.
- **Asset taxonomy** — 4-class hierarchy (Intangible · Tangible · Allied ·
  Equipment) covering 40+ standard IT asset types with grouped selection.
- **Employees** — directory, designations, asset assignments, departmental
  rollups.
- **Licenses** — software keys, email accounts, certificates, expiry tracking.
- **Alerts** — unified expiry stream across warranties, AMC, licenses and
  user-defined custom reminders, with severity filters, search, snooze,
  bulk-acknowledge and recurring auto-renew.
- **Reports** — Asset Register · Categories (20-card grid) · Available
  Inventory · Summary (group by company / department / location) · Expiry
  Alerts · Employee Assets · all with CSV / XLSX / PDF / Print export.
- **Bulk import** — CSV / Excel / ZIP with auto-detection of employees,
  assets, licenses and transfers, plus per-run rollback.
- **Audit trail** — every create / update / delete logged with old/new
  values, filterable by table, action, user and date range.
- **Roles & approval** — admin / it / hr / viewer with per-page permissions
  and a new-user approval gate.
- **Multi-language** — English / हिन्दी / मराठी, switchable from the top bar.
- **Dark mode** — light / dark / system preference.

---

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix
- **State / data:** TanStack Query, react-hook-form, zod
- **i18n:** i18next + react-i18next
- **Charts:** Recharts
- **Exports:** ExcelJS, jsPDF + autotable, JSZip
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Hosting:** Hostinger (static) — GitHub Pages mirror configured
- **CI/CD:** GitHub Actions (build + FTP deploy)

---

## Project layout

```
.
├── src/                    Application source (React + TypeScript)
│   ├── components/         Reusable UI + feature components
│   ├── pages/              Route-level pages (one file per route)
│   ├── hooks/              Data hooks (TanStack Query wrappers over Supabase)
│   ├── contexts/           AuthContext (session, profile, roles, permissions)
│   ├── lib/                Pure utilities (exporters, sanitization, PDF, etc.)
│   ├── i18n/               Locale resources (en / hi / mr)
│   ├── integrations/       Supabase client + generated DB types
│   └── test/               Vitest unit tests
│
├── public/                 Static assets shipped as-is (favicon, 404.html, …)
├── supabase/
│   ├── migrations/         Canonical, timestamp-ordered schema migrations
│   ├── functions/          Edge Functions (e.g. daily-alerts email digest)
│   └── config.toml         Supabase CLI project config
│
├── database/               Additional one-time SQL feature scripts (read /database/README.md)
├── docs/                   Operations, deployment, backup, security, handover
│
├── .github/workflows/      CI/CD (build + GitHub Pages + Hostinger FTP)
├── index.html              Vite entry
├── vite.config.ts          Build config (chunk splitting, etc.)
└── package.json
```

---

## Getting started (local development)

Prereqs: **Node 20+** and **npm**.

```bash
git clone <repo-url>
cd asset-harmony-main
npm install
cp .env.example .env       # then fill in your Supabase URL + anon key
npm run dev                # http://localhost:8080
```

### Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 8080 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

---

## Environment variables

Defined in `.env` (never committed — see `.env.example`):

| Name | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase anon/publishable key (safe to expose) |
| `VITE_SENTRY_DSN` | no | Sentry error reporting (optional) |

For CI / production builds the same variables must be configured as
**GitHub Actions Secrets** in the repository settings.

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full step-by-step.
TL;DR: every push to `main` triggers GitHub Actions which builds the site
and (when the FTP secrets are configured) uploads `dist/` to Hostinger
`public_html/`.

---

## Backup and restore

See [`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md).

---

## Documentation index

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — build, deploy, rollback
- [`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md) — code + database backups
- [`docs/SECURITY.md`](docs/SECURITY.md) — secrets, RLS, auth, rotation
- [`docs/HANDOVER_CHECKLIST.md`](docs/HANDOVER_CHECKLIST.md) — credentials + ownership transfer
- [`docs/SAP_B1_IMPORT_GUIDE.md`](docs/SAP_B1_IMPORT_GUIDE.md) — SAP B1 CSV import format
- [`database/README.md`](database/README.md) — one-time SQL setup scripts

---

## License & copyright

© Personify Crafters — All Rights Reserved.
