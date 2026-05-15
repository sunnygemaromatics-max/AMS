-- ============================================================
-- Schedule the daily-alerts Edge Function to run every morning.
--
-- PRE-REQUISITES (Supabase Dashboard → Database → Extensions)
--   - pg_cron     ✓
--   - pg_net      ✓
-- ============================================================

-- 1. Store the function URL + service role key inside Postgres so pg_cron
--    can invoke them. Vault is the production-grade place for the key.
SELECT vault.create_secret(
    'https://<your-project-ref>.supabase.co/functions/v1/daily-alerts',
    'daily_alerts_url'
);

SELECT vault.create_secret(
    '<your-supabase-service-role-key>',
    'service_role_key'
);

-- 2. Schedule the cron job. Runs every day at 09:00 IST (= 03:30 UTC).
--    Adjust the cron expression to your timezone.
SELECT cron.schedule(
    'daily-alerts-09am-ist',                                 -- job name
    '30 3 * * *',                                            -- 03:30 UTC = 09:00 IST
    $$
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'daily_alerts_url'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- ─── Useful follow-ups ──────────────────────────────────────────────────
-- View scheduled jobs:
--   SELECT * FROM cron.job;
--
-- View recent runs:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- Trigger manually (e.g. for testing):
--   SELECT net.http_post(
--     url := 'https://<your-project-ref>.supabase.co/functions/v1/daily-alerts',
--     headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>'),
--     body := '{}'::jsonb
--   );
--
-- Unschedule:
--   SELECT cron.unschedule('daily-alerts-09am-ist');
