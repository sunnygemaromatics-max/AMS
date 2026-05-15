# Deploy Guide — Get Your Live Site Updated

Everything I just built is in your code now, but **the live site at ams.thestudioinfinito.com won't change until you do TWO things** below. Both take ~5 minutes each.

> **What's already done for you** (no action needed):
> - All new code is committed and pushed to GitHub ✅
> - A fresh production build is in the `dist/` folder ✅
> - The build is packaged at `ams-hostinger-upload.zip` (1.08 MB) ready to drag-drop ✅
> - GitHub Pages backup mirror is auto-deploying right now (~2 min) ✅

---

## Part 1 — Update Hostinger (gets the new pages live)

### Easy path (do this once, 3 minutes):

1. **Open your file** — find `ams-hostinger-upload.zip` in your `Downloads/asset-harmony-main/` folder.
2. **Log in to Hostinger** at https://hpanel.hostinger.com/
3. Click **Files** (left sidebar) → **File Manager**
4. Open the folder for your domain. Usually called **`public_html`**. If your site lives at a subfolder (e.g. `domains/thestudioinfinito.com/public_html`), open that one instead.
5. **Backup first** (5 seconds, saves your life if anything goes wrong):
   - Select all the existing files in `public_html`
   - Click **Compress** → save as `backup-YYYY-MM-DD.zip` → leave it in that same folder.
6. **Delete the old site files** (NOT the backup zip you just made, and NOT any `.htaccess` file if you have one).
7. **Click "Upload"** (top right) → drag `ams-hostinger-upload.zip` in → wait for green tick.
8. **Right-click** the uploaded zip in the file list → **Extract** → extract into the current folder (`public_html`).
9. Once extracted, you can **delete** `ams-hostinger-upload.zip` from Hostinger to keep things clean.
10. Visit https://ams.thestudioinfinito.com — **Ctrl+F5** to bypass cache. The new dashboard with the Alerts tab and language switcher should be live. 🎉

### Don't want to repeat this every time? Set up auto-deploy (do this once, 7 minutes):

Once you do this, **every code change auto-uploads to Hostinger within ~2 minutes of being committed**. No more manual zip-and-upload.

1. **Get your Hostinger FTP credentials**:
   - Hostinger → **Files** → **FTP Accounts** (left sidebar)
   - Note your **FTP Hostname** (looks like `ftp.thestudioinfinito.com` or `145.79.xxx.xxx`)
   - Note your **FTP Username** (looks like `u123456789.yourdomain`)
   - Click **Change FTP password** if you don't remember it — save the new password somewhere safe (LastPass / 1Password / a paper notepad in your wallet, but somewhere).

2. **Add the credentials to GitHub** (these are encrypted — only GitHub Actions can read them):
   - Open https://github.com/sam7399/asset-harmony in your browser
   - Click **Settings** (tab at the top, right side)
   - Left sidebar → **Secrets and variables** → **Actions**
   - Click **New repository secret**, add these three one at a time:

     | Name | Value |
     |------|-------|
     | `HOSTINGER_FTP_SERVER` | the FTP Hostname from step 1 (e.g. `ftp.thestudioinfinito.com`) |
     | `HOSTINGER_FTP_USERNAME` | your FTP Username |
     | `HOSTINGER_FTP_PASSWORD` | your FTP password |

3. **That's it.** The next push to GitHub will auto-deploy to Hostinger. To test it: open https://github.com/sam7399/asset-harmony/actions and you'll see workflow runs. The most recent one (from the commit I just pushed) won't have FTP yet because the secrets weren't there — once you add them, click **Re-run all jobs** on that workflow and it will deploy via FTP this time.

4. **Verify the server path**: in the workflow file [.github/workflows/deploy.yml](.github/workflows/deploy.yml) at line 76, the upload target is `/public_html/`. If your Hostinger site lives in a different folder (e.g. an addon domain), change that line to match. To find your actual path, in Hostinger File Manager note the breadcrumb at the top of the page when you're inside your site's folder — that's your `server-dir`.

---

## Part 2 — Run the SQL migrations (gets the Alerts tab working)

Without this, the new **Add reminder** button will fail with "table not found" because the `custom_reminders` table doesn't exist yet in your Supabase project.

1. **Log in to Supabase** at https://supabase.com/dashboard
2. Open your project (the one your app talks to — should be the one matching `VITE_SUPABASE_URL` in your `.env`)
3. Left sidebar → **SQL Editor**
4. Click **+ New query**
5. Open `SETUP_CUSTOM_REMINDERS.sql` from your project folder (Downloads/asset-harmony-main/)
6. Copy ALL of its contents → paste into the Supabase SQL Editor
7. Click **Run** (or `Ctrl+Enter`)
8. You should see "Success. No rows returned." plus a quick verification at the bottom.

The Alerts tab is now fully functional. Three sample reminders (insurance, domain, audit) will appear so you can see what it looks like — delete them via the trash icon when you've seen them.

### Optional: Multi-tenant SQL (only if you plan to sell to multiple companies)

If you're planning to host the same app for multiple separate customers ("Acme Corp", "Beta Industries", etc.) all from one Supabase project — run `SETUP_MULTI_TENANT.sql` the same way. Skip it for now if your current single-business use is enough.

---

## Part 3 — Daily email alerts (optional, ~10 minutes)

If you want the system to automatically email you (and your team) a daily digest of expiring items at 9 AM each morning, follow this. Otherwise skip — the alerts in the dashboard will work fine without it.

### One-time setup:

1. **Sign up for Resend** (free tier: 100 emails/day, more than enough):
   - https://resend.com/signup
   - **Domains** → Add your domain `thestudioinfinito.com` → follow the DNS verification instructions (3 DNS records to add in Hostinger → Domains → DNS Zone).
   - Once verified, **API Keys** → Create API Key → copy it (starts with `re_…`).

2. **Install the Supabase CLI** (if not already):
   ```bash
   npm install -g supabase
   ```

3. **From your project folder**, run:
   ```bash
   supabase login
   supabase link --project-ref dfznpbbqianbsgwxmcbs
   supabase secrets set RESEND_API_KEY=re_yourapikeyhere
   supabase secrets set ALERT_FROM_EMAIL="alerts@thestudioinfinito.com"
   supabase functions deploy daily-alerts
   ```

4. **Schedule it daily** — open `supabase/functions/daily-alerts/SCHEDULE.sql` in your project folder. Replace `<your-project-ref>` with `dfznpbbqianbsgwxmcbs` and `<your-supabase-service-role-key>` with your service role key (Supabase → Project Settings → API → `service_role` key). Paste into Supabase SQL Editor → Run.

5. **Configure recipients** in the app: `/organisation` page → "Email Alerts" section → enter the addresses that should receive the digest → save.

Full details + how to add WhatsApp/Slack channels are in `supabase/functions/daily-alerts/README.md`.

---

## What to check after deploying

Once both Parts 1 and 2 are done, visit your site and verify:

| Feature | How to test |
|---|---|
| **New dashboard tabs** | Dashboard page → you should see "Overview" and "Alerts" tabs at the top |
| **Language switcher** | Top bar → globe icon → switch to हिन्दी or मराठी → sidebar relabels |
| **Theme toggle** | Top bar → sun/moon icon → page switches dark/light |
| **Alerts tab** | Dashboard → Alerts → see expiring warranties + the 3 sample custom reminders |
| **Add reminder** | Alerts → "Add reminder" → fill the form → save → it appears in the list |
| **Snooze** | On a custom reminder row → clock icon → "1 week" → row disappears from active list, shows under "Show snoozed" |
| **Bulk handle** | Tick checkboxes on a few custom reminders → click "Mark X as handled" → confirmation |
| **Bell badge** | Top bar → bell icon → see all expiring items including custom ones |
| **Categories report** | Reports → Categories tab → 16 colored category cards |

If any of these don't work, it's almost always one of these three things:
1. **Browser cache** → Ctrl+F5 (hard refresh)
2. **SQL not run** → run `SETUP_CUSTOM_REMINDERS.sql`
3. **Files didn't fully upload to Hostinger** → re-extract the zip

---

## If something goes wrong

1. **Roll back the Hostinger files**: extract that `backup-YYYY-MM-DD.zip` you made in Part 1, step 5. Site returns to the previous version in 30 seconds.
2. **Roll back the SQL**: `DROP TABLE public.custom_reminders CASCADE; DROP TABLE public.reminder_activity CASCADE;` — removes the new tables without touching anything else.
3. **Roll back the code on GitHub**: tell me and I'll revert the commit.

You can't really break anything that isn't recoverable in under 60 seconds. Don't be afraid to try things.

---

## File map — what's where

| File / folder | What it does |
|---|---|
| `dist/` | The built site files. This is what Hostinger serves. |
| `ams-hostinger-upload.zip` | The above, zipped, ready for File Manager. **Local-only, never committed.** |
| `SETUP_CUSTOM_REMINDERS.sql` | Creates the `custom_reminders` + `reminder_activity` tables in Supabase. |
| `SETUP_MULTI_TENANT.sql` | Optional: turns the app into a multi-customer SaaS. |
| `supabase/functions/daily-alerts/` | The email-digest Edge Function and its scheduler. |
| `.github/workflows/deploy.yml` | Auto-builds and (once FTP secrets are set) auto-uploads to Hostinger. |
| `.env` | Your Supabase URL + key. **Local-only, never committed.** |
| `src/` | The actual app source code. |
| `node_modules/` | Dependencies. Auto-generated by `npm install`. Never edit. |

---

If anything in here is unclear or doesn't work, **paste the exact error message back to me** and I'll fix it on the spot. Don't try to debug for an hour — that's what I'm here for.
