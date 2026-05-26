# Database Setup Scripts

One-time SQL scripts that build the application's domain schema on top of the
base Supabase auth tables. The canonical, auto-numbered migrations live in
[`../supabase/migrations/`](../supabase/migrations/) — these scripts are
additive features that were introduced after the initial migration set.

Run them **in numeric order** in the Supabase SQL Editor on a fresh project:

| # | File | Adds |
|---|------|------|
| 01 | `01_bin_cards_audit_log.sql` | `bin_card_entries`, `audit_log`, helper functions |
| 02 | `02_audit_triggers.sql` | Per-table audit triggers (writes to `audit_log`) |
| 03 | `03_sap_import.sql` | SAP B1 CSV import staging table + helpers |
| 04 | `04_custom_reminders_alerts.sql` | `custom_reminders` + `reminder_activity` (Alerts feature) |
| 05 | `05_asset_taxonomy.sql` | Extended `asset_subtype` enum values + categories seed |
| 06 | `06_multi_tenant_optional.sql` | **Optional** — organisations + multi-tenant RLS |

`sample_data.sql` is a small, idempotent seed (one row of each entity)
useful for verifying a fresh install — safe to run, easy to clean up
(every sample row is prefixed `Sample` / `SAMPLE-`).

> Most files use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` and are safe to
> re-run. `06_multi_tenant_optional.sql` is **not** required for single-tenant
> deployments — skip it unless you intend to host multiple separate customers
> from the same Supabase project. Read its header comments first.

Each script begins with a `-- WHAT THIS DOES` block. Always read it before
running on a non-development database.
