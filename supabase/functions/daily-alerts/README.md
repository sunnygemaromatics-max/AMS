# Daily Alert Digest

A Supabase Edge Function that emails a single HTML digest per organisation, listing everything expiring soon across warranties, AMC contracts, licenses, and custom reminders.

## What it sends

A branded HTML email with:
- **Header band** (gradient, same as the in-app theme).
- **4 KPI pills** — Expired / Urgent / Soon / Upcoming counts.
- **Table** sorted by days-left ascending, with severity-colored badges.
- **Empty-state** if nothing's expiring (so empty digests aren't sent — see "Skip empty" below).

## One-time setup

### 1. Pick an email provider

This function uses [Resend](https://resend.com) — has a free tier (100 emails/day), simple API.

```bash
# Sign up at resend.com, verify your sending domain, get an API key, then:
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set ALERT_FROM_EMAIL="alerts@yourdomain.com"
```

**Want a different provider?** Replace the `sendEmail()` function in `index.ts` — it's ~10 lines. SendGrid, AWS SES, Postmark, Mailgun all have one-call REST APIs.

### 2. Deploy the function

```bash
supabase functions deploy daily-alerts
```

### 3. Schedule it daily

Open `SCHEDULE.sql` in this folder, fill in your project ref + service-role key, paste into the Supabase SQL Editor, Run. Default schedule: **09:00 IST every day**.

That's it. To test manually before scheduling:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/daily-alerts \
  -H "Authorization: Bearer <service-role-key>"
```

## How "no recipients / no expiries" is handled

- **`email_alerts_enabled = false`** in `org_settings` → the org is skipped silently.
- **No recipients configured** → skipped.
- **Nothing expiring in the lookahead window** → skipped (no spammy empty digests).

The response body returns a JSON summary with per-org results, useful for cron monitoring.

## Adding WhatsApp / Slack / SMS

The function is intentionally provider-agnostic at the output layer. To add another channel:

1. Write a `sendWhatsApp(...)` / `sendSlack(...)` helper next to `sendEmail()`.
2. Call it inside the `for (const s of settingsRows)` loop, gated by an `org_settings` flag (e.g. `whatsapp_alerts_enabled`).
3. Add the corresponding columns + UI toggle in `OrganisationSettingsPage.tsx`.

**For WhatsApp**, [Twilio's WhatsApp Business API](https://www.twilio.com/docs/whatsapp/api) is the most popular path — requires a Meta-approved template since WhatsApp messages cannot be free-form for transactional alerts. Render a simple template like:

> *Your AMS digest — 3 expired, 5 urgent, 12 upcoming. Open the dashboard: {{link}}*

…and link to the in-app Alerts tab.

## Multi-tenant behaviour

Once `SETUP_MULTI_TENANT.sql` has been run, every alert query is scoped by `organisation_id`. The function iterates every row in `org_settings` (one per org) and sends an isolated digest per tenant. Tenants only see their own data.

Before multi-tenant is enabled, there's a single `org_settings` row → one digest goes to everyone listed in `email_alert_recipients`.

## Monitoring

```sql
-- Recent runs (success / failure)
SELECT start_time, status, return_message
FROM cron.job_run_details
WHERE jobname = 'daily-alerts-09am-ist'
ORDER BY start_time DESC LIMIT 10;
```

Each successful run returns `200` with a JSON body like:

```json
{
  "ran_at": "2026-05-15T03:30:00.123Z",
  "results": [
    { "org": "Acme Corp", "sent": 3 },
    { "org": "Default", "sent": 0, "error": "nothing expiring" }
  ]
}
```
