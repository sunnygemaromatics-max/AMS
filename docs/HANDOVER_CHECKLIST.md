# Handover Checklist

Use this when transferring the project to a new owner / team. Tick each
item; sign off at the bottom.

---

## Code & repository

- [ ] Repository is **private** (or about to be transferred to the new
      owner's private org).
- [ ] `main` branch protection enabled (require PR review, no force-push,
      no deletion). Repo → Settings → Branches → Add rule.
- [ ] `v1.0.0` tag exists, points at the production release commit.
- [ ] A long-term restore tag exists
      (`handover-backup-YYYY-MM-DD-pre-cleanup`).
- [ ] `git log` reviewed for any sensitive strings — none found.
- [ ] No `.env` file in git, only `.env.example` template.
- [ ] CI/CD workflow runs green on the current `main`.

## Database (Supabase)

- [ ] Project on a tier that includes automated daily backups (Pro+) — or
      a manual weekly backup schedule is set up.
- [ ] All migrations in `supabase/migrations/` have been applied.
- [ ] All scripts in `database/` that the deployment uses have been run
      (see `database/README.md` for which are required vs optional).
- [ ] At least one admin account exists and has been tested.
- [ ] Anon key, service role key, and database password have been rotated
      since any external person had access (see [SECURITY.md](SECURITY.md)).
- [ ] RLS policies verified via `SELECT * FROM pg_policies WHERE
      schemaname='public'`.

## Hosting (Hostinger / domain)

- [ ] Production URL resolves and serves the latest build.
- [ ] DNS records documented (registrar, A/CNAME values, expiry).
- [ ] Hostinger account: ownership and billing details documented.
- [ ] FTP credentials regenerated and stored in GitHub Actions Secrets of
      the new repo location.
- [ ] SSL certificate active and auto-renews.

## Secrets

- [ ] `.env.example` lists every variable the app needs.
- [ ] All GitHub Actions Secrets present (`VITE_SUPABASE_URL`,
      `VITE_SUPABASE_PUBLISHABLE_KEY`, `HOSTINGER_FTP_*`).
- [ ] All Supabase Function secrets present
      (`RESEND_API_KEY`, `ALERT_FROM_EMAIL`) — if email alerts are in use.
- [ ] Secret values delivered to the new owner via a **secure channel**
      (password manager share, not email/Slack/WhatsApp text).

## Documentation

- [ ] [README.md](../README.md) accurate and complete.
- [ ] [DEPLOYMENT.md](DEPLOYMENT.md) — followable end-to-end.
- [ ] [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) — both code and DB paths covered.
- [ ] [SECURITY.md](SECURITY.md) — secret locations and rotation steps documented.
- [ ] [database/README.md](../database/README.md) — every SQL file accounted for.

## Functional smoke tests (admin login)

- [ ] Dashboard loads with real KPI counts.
- [ ] Alerts tab shows expiring items or "All clear".
- [ ] Add an asset → it appears in the register.
- [ ] Edit an employee → audit log captures the change.
- [ ] Reports → Categories → 40+ category cards render with counts.
- [ ] Reports → Available Inventory → unallocated stock grouped by type.
- [ ] Bulk Import → upload the sample CSV → rows imported, history captured.
- [ ] Language switcher → English / हिन्दी / मराठी all relabel the sidebar.
- [ ] Dark mode toggle works and persists across reload.
- [ ] Sign out and sign back in with a different role — permissions
      adjust as expected.

## Final session

- [ ] Walk-through call recorded with the new owner.
- [ ] All credentials handed over (password manager share).
- [ ] Outgoing developer's access removed (or kept as collaborator if
      ongoing maintenance is contracted).

---

**Handover completed by:** ____________________

**Received by:** ____________________

**Date:** ____________________
