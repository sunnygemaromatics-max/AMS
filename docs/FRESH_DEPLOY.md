# Fresh Deploy — new Supabase project + new GitHub repository

Step-by-step to bring the application up on a brand-new Supabase project
and a brand-new GitHub repository. Estimated time: **30–45 minutes**.

> Throughout this guide, replace placeholders in `<angle brackets>` with
> your real values. Never paste any of these values into a chat, email or
> issue tracker — use a password manager.

---

## Part A — New Supabase project

### A1. Create the project

1. https://supabase.com → **New project**.
2. Choose an organisation, name (e.g. `ams-prod`), strong DB password
   (save in password manager), region (closest to your users), plan
   (Pro recommended for daily backups).
3. Wait ~2 min for provisioning to finish.

### A2. Capture the values you'll need

From **Project Settings → API**:

| Value | Where you'll use it |
|---|---|
| Project URL — `https://xxxxxxxxxxxx.supabase.co` | `VITE_SUPABASE_URL` |
| `anon` / `publishable` key | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `service_role` key | Edge Function secrets only — **never** in the app bundle |

From **Project Settings → Database → Connection string**:

| Value | Where you'll use it |
|---|---|
| Project ref (the `xxxxxxxxxxxx` from the URL) | `supabase link --project-ref …` |
| Database password (set in A1) | `pg_dump`, manual backups |

### A3. Update `supabase/config.toml`

Open `supabase/config.toml` in this repo and set the new project ref:

```toml
project_id = "<new-project-ref>"
```

### A4. Apply migrations

Two options.

**A4a — Supabase CLI (recommended):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <new-project-ref>
supabase db push          # applies everything in supabase/migrations/
```

**A4b — Manual via the SQL Editor:**

Open each file in `supabase/migrations/` in chronological filename order,
copy the contents into the SQL Editor, Run. Then do the same for every
file in `database/` in numeric order — see [`../database/README.md`](../database/README.md).

### A5. Verify the schema

In the SQL Editor:

```sql
-- expect ~12+ user tables
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;

-- every business table should have rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';

-- key custom enums
SELECT typname FROM pg_type WHERE typname IN ('app_role','approval_status','asset_status','asset_subtype','asset_type');
```

### A6. Create the first admin user

The very first user to sign up automatically gets the `admin` role and
`approval_status='approved'` (logic in `handle_new_user()`). So:

1. Build + run the app locally with the new env values (Part B):
   ```bash
   npm run dev
   ```
2. Open http://localhost:8080 and sign up. The first account is your
   admin. Subsequent users land as `pending` until you approve them on
   the **Users** page.

If you'd rather create users in SQL, use the pattern in
`docs/SECURITY.md` → "Manual demo accounts".

---

## Part B — Local environment

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://<new-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-A2>
# VITE_SENTRY_DSN=...   (optional)
```

```bash
npm install
npm run dev
```

App runs on http://localhost:8080. Sign up your first admin.

---

## Part C — New GitHub repository

### C1. Create the empty repo

1. https://github.com/new → name (e.g. `asset-harmony` or whatever the
   client wants), **private**, **no** README/license/.gitignore (the
   project already has them).
2. Note the new HTTPS URL: `https://github.com/<owner>/<repo>.git`

### C2. Re-point this local clone at the new repo

```bash
git remote -v                                       # see the old one
git remote set-url origin https://github.com/<owner>/<repo>.git
git remote -v                                       # confirm
git push -u origin main
git push origin --tags                              # optional — skip if you don't want backup tags on the new repo
```

If you'd prefer a clean slate with no tags from the old project:

```bash
git tag -l | xargs -I{} git push origin :refs/tags/{}   # delete remote tags
# (then re-create a single v1.0.0 tag if you want)
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

### C3. GitHub Actions Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | from A2 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | from A2 |
| `HOSTINGER_FTP_SERVER` | from Hostinger → Files → FTP Accounts |
| `HOSTINGER_FTP_USERNAME` | same |
| `HOSTINGER_FTP_PASSWORD` | same |

Without the three `HOSTINGER_FTP_*` secrets, the workflow still builds
and publishes to GitHub Pages but skips the FTP upload (no error).

### C4. Branch protection

Repo → **Settings → Branches → Add rule** for `main`:
- Require a pull request before merging (1 reviewer)
- Block force-push
- Block deletions

### C5. First push triggers a deploy

Once C2 and C3 are done, the workflow run from the `main` push will
build and (if FTP secrets are set) upload to Hostinger. Watch under
**Actions**. Green tick = live.

---

## Part D — Hostinger configuration

### D1. FTP account

Hostinger panel → **Files → FTP Accounts** → confirm or create an
account for the domain. Note the hostname, username, password — these
are the values for `HOSTINGER_FTP_*` in C3.

### D2. Server path

The workflow uploads to `/public_html/`. If your domain lives in a
sub-folder (addon domain or sub-account), update `server-dir` in
`.github/workflows/deploy.yml`:

```yaml
server-dir: /domains/<your-domain>/public_html/
```

### D3. DNS

Hostinger panel → **Domains → DNS Zone** — verify the A / CNAME record
points to your hosting plan's nameservers (Hostinger sets this up
automatically when the domain is in their panel).

### D4. SSL

Hostinger panel → **Security → SSL** → ensure the SSL certificate is
active for the domain. Hostinger Free SSL renews automatically.

---

## Part E — Smoke test the live site

After Part C5's workflow goes green:

1. Visit the production URL in an **incognito window**.
2. Sign up — first account becomes admin (verify on Users page).
3. **Dashboard** loads, KPIs show zeros (empty DB).
4. **Add an asset** → it appears in the register.
5. **Alerts** tab — "All clear" or "expiring soon" content renders.
6. **Credentials** page — admin/IT only access works.
7. **Field Definitions** page — admin only, blank list ready for use.
8. **Reports → Categories** — 40+ cards render.
9. Switch language to हिन्दी / मराठी — sidebar relabels.

If any step fails, see `docs/BACKUP_AND_RESTORE.md` for rollback or
re-run Part A4's verification queries.

---

## Part F — Optional: Edge Function for daily email alerts

If the client wants the daily digest email:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
supabase secrets set ALERT_FROM_EMAIL="alerts@<their-domain>"
supabase functions deploy daily-alerts
```

Then schedule via `pg_cron` — see
`supabase/functions/daily-alerts/SCHEDULE.sql` for the SQL template
(replace `<your-project-ref>` and the service role key).

---

## Quick checklist

- [ ] New Supabase project created, password saved
- [ ] `supabase/config.toml` updated with new project ref
- [ ] Migrations applied (CLI or manual SQL Editor)
- [ ] Schema verified (Part A5 queries)
- [ ] `.env` updated locally with new URL + anon key
- [ ] App runs locally, first admin signed up
- [ ] New private GitHub repo created
- [ ] Local `origin` re-pointed and pushed
- [ ] All 5 GitHub Actions Secrets added
- [ ] Branch protection on `main` enabled
- [ ] Hostinger FTP configured + workflow run green
- [ ] Live site smoke-tested
- [ ] (Optional) Edge Function for email alerts deployed
- [ ] Secret values shared with the new owner via password manager
