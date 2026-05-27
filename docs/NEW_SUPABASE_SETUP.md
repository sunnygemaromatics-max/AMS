# New Supabase project — bootstrap order

Run these SQL files **in order, one paste per file**, in the Supabase
SQL Editor of the new project. Most are idempotent (safe to re-run);
the asset-taxonomy script has parts that must be run separately because
Postgres won't allow a brand-new enum value to be *used* in the same
transaction it was *added*.

Estimated time: **15–20 minutes**.

---

## Prerequisites

- New empty Supabase project created
- Project URL + anon key in hand (`Project Settings → API`)
- Database password saved somewhere safe (`Project Settings → Database`)

---

## Run order

| # | File | Notes |
|---|------|-------|
| 1 | `supabase/migrations/SETUP_NEW_PROJECT.sql` | Base schema — enums, core tables, RLS, triggers, indexes. Idempotent. |
| 2 | `supabase/migrations/AUDIT_USERNAME.sql` | Adds `username`/`email` to `profiles` + the `get_email_by_username` RPC the login form uses. |
| 3 | `supabase/migrations/FIX_RLS_WRITE_POLICIES.sql` | Tightens the write-side RLS policies on the core tables. |
| 4 | `supabase/migrations/20260428_employee_enhancements.sql` | Extra employee fields (designation, department, etc.). |
| 5 | `supabase/migrations/20260516000000_fix_handle_new_user_enum_cast.sql` | Rebuilds `handle_new_user()` with the explicit enum cast — **critical**, without this every signup fails with 42804. |
| 6 | `supabase/migrations/20260527000000_sub_assets.sql` | `parent_asset_id` self-FK + cycle guard. |
| 7 | `supabase/migrations/20260527000001_credentials_vault.sql` | `credentials` table + admin/IT-only RLS + count RPC. |
| 8 | `supabase/migrations/20260527000002_custom_field_definitions.sql` | `custom_field_definitions` + JSONB `custom_fields` columns. |
| 9 | `database/01_bin_cards_audit_log.sql` | `bin_card_entries` + `audit_log` schema + helper functions. |
| 10 | `database/02_audit_triggers.sql` | Audit triggers — note the schema is the one that matches the `audit_log` from step 9. |
| 11 | `database/03_sap_import.sql` | SAP B1 CSV import staging + helpers. |
| 12 | `database/04_custom_reminders_alerts.sql` | `custom_reminders` + `reminder_activity` + audit trigger for the Alerts feature. |
| 13 | `database/05_asset_taxonomy.sql` — **PART 1 only** | Adds 14 new `asset_subtype` enum values. Wait for the success message before continuing. |
| 14 | `database/05_asset_taxonomy.sql` — **PART 2 only** | Seeds the categories table with the 2-level taxonomy. Must be a SEPARATE run from PART 1. |
| 15 | `database/05_asset_taxonomy.sql` — **PART 3 only** | Adds 21 more extended ITAM enum values. SEPARATE run. |
| 16 | `database/05_asset_taxonomy.sql` — **PART 4 only** | Extended-taxonomy category seed. SEPARATE run. |

**Steps 13–16:** open `database/05_asset_taxonomy.sql` in your editor.
It is clearly divided into `-- PART 1`, `-- PART 2`, `-- PART 3`, `-- PART 4`
banners. Copy each part separately into the SQL Editor and Run. The
"new enum value cannot be used in the same transaction it was added"
rule is the only reason we split.

**Optional:**

| File | When to run |
|------|-------------|
| `database/06_multi_tenant_optional.sql` | Only if you intend to host multiple separate customers from this one Supabase project. Skip for the standard single-tenant deploy. |
| `database/sample_data.sql` | Inserts one sample row per entity — useful to verify the install renders something in the UI. Every sample row is prefixed `Sample` / `SAMPLE-` so it's easy to delete later. |

---

## Verify the install

After running steps 1–14 (at minimum), open the SQL Editor and run:

```sql
-- All public tables created
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' AND table_type='BASE TABLE'
 ORDER BY table_name;
-- Expect ~15+ tables including: assets, employees, licenses, credentials,
-- custom_reminders, reminder_activity, custom_field_definitions, audit_log,
-- bin_card_entries, companies, locations, departments, vendors, categories,
-- user_roles, profiles, import_runs (if SAP import section ran).

-- RLS enabled on every business table
SELECT tablename, rowsecurity FROM pg_tables
 WHERE schemaname='public' ORDER BY tablename;

-- Key custom enums present
SELECT typname FROM pg_type
 WHERE typname IN ('app_role','approval_status','asset_status','asset_subtype','asset_type','transaction_type')
 ORDER BY typname;

-- asset_subtype should now include 35+ values (14 base + 14 + 21 extended)
SELECT unnest(enum_range(NULL::public.asset_subtype)) AS subtype ORDER BY 1;
```

---

## Create the first admin user

The very first profile created automatically becomes `admin` + `approved`.
After the install completes:

1. Update your local `.env` with the new project URL + anon key.
2. Update GitHub Actions Secrets (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`).
3. Sign up on the live app — this account is your admin. Subsequent
   signups land as `pending` until you approve them on the Users page.

---

## If something fails mid-way

- **`42804: column ... is of type ... but expression is of type text`**
  → step 5 hasn't run. Run it now.
- **`type "asset_subtype" already has a value ...`**
  → harmless; means the enum value already exists. Skip and continue.
- **`relation "..." already exists`** → harmless; idempotent scripts.
- **Anything else** → paste the exact error and we'll fix it.

---

## After bootstrap — handy admin tweaks

```sql
-- Promote a known user to admin (replace email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'you@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Force-approve a stuck user (replace email)
UPDATE public.profiles SET approval_status='approved', approved_at=now()
 WHERE id = (SELECT id FROM auth.users WHERE email='you@example.com');
```
