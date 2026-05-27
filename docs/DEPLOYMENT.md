# Deployment Guide

## Overview

The application is a static single-page React build served from Hostinger
`public_html/`. CI/CD is handled by GitHub Actions
(`.github/workflows/deploy.yml`).

| Trigger | What happens |
|---|---|
| Push to `main` | GitHub Actions runs `npm ci` → `npm run build` → publishes `dist/` to GitHub Pages (mirror) **and** uploads to Hostinger via FTP if the FTP secrets are present. |
| Manual | Run the **Build & Deploy** workflow from the GitHub Actions tab. |

---

## One-time setup

### 1. GitHub Actions Secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `HOSTINGER_FTP_SERVER` | FTP hostname from Hostinger → Files → FTP Accounts |
| `HOSTINGER_FTP_USERNAME` | FTP username |
| `HOSTINGER_FTP_PASSWORD` | FTP password |

Without the `HOSTINGER_FTP_*` triplet, the workflow still runs the build
and publishes to GitHub Pages but skips the FTP upload (it does not error).

### 2. Hostinger server path

The workflow uploads to `/public_html/`. If your domain lives in a
sub-folder (addon domain or sub-account), update `server-dir` in
`.github/workflows/deploy.yml` to match (e.g.
`/domains/<your-domain>/public_html/`).

### 3. DNS

Point your domain's A / CNAME record to your Hostinger nameservers (already
done for `ams.gemaromatics.com`). The GitHub Pages mirror uses the
`CNAME` file at the repo root; remove that file if you do not want the
mirror.

---

## Routine deployment (after the one-time setup)

1. Make your code change locally.
2. `npm run build` — verify it builds cleanly.
3. `git commit -m "feat/fix: …"`
4. `git push origin main`
5. Watch the workflow at **GitHub → Actions**. Green tick → live within ~2 minutes.
6. Visit the site and **hard-refresh (Ctrl + F5)** to bypass browser cache.

---

## Manual fallback deployment

If GitHub Actions is unavailable or you need to deploy from a workstation
without CI access:

```bash
npm ci
npm run build
# zip dist/ contents and upload via Hostinger File Manager → public_html/
```

The Hostinger File Manager has an "Extract" right-click action on uploaded
zip files.

---

## Rollback

### Source code rollback

Every release is a git commit. Either:

```bash
# Option A — revert (preserves history, creates a new commit)
git revert <bad-commit-sha>
git push origin main

# Option B — reset to a known-good tag (rewrites history; coordinate with team)
git reset --hard <tag>
git push --force origin main
```

The next push triggers a redeploy.

### Tagged restore points

| Tag | Use when |
|---|---|
| `v1.0.0` | The production release handed over to the client. |
| `handover-backup-2026-05-16-pre-cleanup` | Full state immediately before the cleanup / history rewrite. Long-term restore. |

```bash
git checkout <tag>          # inspect
git reset --hard <tag>      # actually roll the branch back
git push --force origin main
```

### Hostinger-side rollback (faster — no rebuild)

Before each release, take a backup zip of `public_html/` via Hostinger File
Manager. To restore: delete the current files, upload the backup zip,
extract.

---

## Build configuration

Defined in `vite.config.ts`. Notable choices:

- **Sourcemaps off** in production (`sourcemap: false`) so the shipped
  bundle is opaque to inspection.
- **Manual chunk splitting** for heavy libs (`recharts`, `jspdf`, `exceljs`,
  `jszip`, `i18next`, `supabase`, `react`, …) so they are loaded only when
  the matching feature runs — keeps the initial bundle ~330 kB gzipped.
- `chunkSizeWarningLimit: 800` because the export libs (Excel, PDF) live in
  their own on-demand chunks and only load when the user clicks Export.

---

## Health checks after deploy

1. Open the site in an **incognito window** (no stale session / cache).
2. Sign in with an admin account → Dashboard loads, KPI cards show counts.
3. Open **Alerts** → list renders (or the "All clear" empty state).
4. **Assets** → add an asset → it appears in the table.
5. **Reports → Categories** → the 40+ cards render.
6. **Language switcher** in the top bar → सूचना / अहवाल labels appear in हिन्दी / मराठी.

If any check fails, see `docs/BACKUP_AND_RESTORE.md` for rollback steps.
