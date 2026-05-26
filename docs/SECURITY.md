# Security

## Secrets and credentials

### Never committed to git

- `.env` (gitignored) — local Supabase URL + anon key
- Supabase **service role key** — never appears in any file in this repo
- Hostinger FTP credentials — only in GitHub Actions Secrets
- Resend / email-provider API keys — only in Supabase Function secrets

### Where each secret lives

| Secret | Storage | Audience |
|---|---|---|
| Supabase **anon / publishable** key | `.env`, GitHub Actions Secrets, shipped in browser bundle | Public — designed to be exposed, RLS protects data |
| Supabase **service role** key | Supabase Function secrets only | Server-side only — bypasses RLS, never ship to browser |
| Supabase **JWT secret** | Managed by Supabase | Internal |
| Hostinger FTP password | GitHub Actions Secrets | CI/CD only |
| Database `postgres` password | Supabase Dashboard → Database | Admin / backups |

### Rotation procedure

If any secret is suspected exposed:

1. **Anon key** — Supabase Dashboard → Project Settings → API → "Reset
   anon key". Update GitHub Actions Secrets + local `.env`. Redeploy.
2. **Service role key** — same panel → "Reset service role key". Update
   Supabase Function secrets (`supabase secrets set …`). Redeploy any
   Functions that use it.
3. **Database password** — Supabase Dashboard → Database → "Reset
   database password". Update any external tools (pg_dump, backup
   scripts) with the new password.
4. **Hostinger FTP password** — Hostinger panel → Files → FTP Accounts →
   change password. Update `HOSTINGER_FTP_PASSWORD` in GitHub Actions
   Secrets.

---

## Row Level Security (RLS)

Every business table has RLS enabled. Policies are defined in
`supabase/migrations/` and the `database/*.sql` scripts. The base pattern:

- **SELECT** — any authenticated user can read, scoped by tenant if
  `database/06_multi_tenant_optional.sql` is applied.
- **INSERT / UPDATE / DELETE** — gated by role (`admin`, `it`, `hr`,
  `viewer`) via the `has_role()` function and the `user_roles` table.
- **Approval gate** — `is_approved()` returns true only if
  `profiles.approval_status = 'approved'`. New users land as `pending`
  until an admin approves them via the Users page.

To inspect live policies:

```sql
SELECT schemaname, tablename, policyname, cmd, qual
  FROM pg_policies
 WHERE schemaname = 'public'
 ORDER BY tablename, cmd;
```

---

## Authentication

- Supabase Auth, password + email confirmation.
- Login accepts username **or** email — username is mapped to email via
  the `get_email_by_username()` SQL function.
- Session storage: `localStorage` (`persistSession: true` in
  `src/integrations/supabase/client.ts`).
- Token auto-refresh: enabled.

### New-user flow

1. User signs up with email + password + username + full name.
2. `on_auth_user_created` trigger creates a `profiles` row with
   `approval_status = 'pending'`.
3. Admin reviews on the **Users** page → approves → `approval_status` →
   `'approved'`.
4. User can now access the app.

### First-user bootstrap

The very first profile created is automatically given
`approval_status = 'approved'` and the `admin` role (logic in
`handle_new_user()`). After the first user exists, subsequent signups are
all `pending` until approved.

---

## Browser bundle exposure

- The frontend ships as a minified bundle with **no source maps**
  (`vite.config.ts: sourcemap: false`). The browser cannot reconstruct
  the original TypeScript.
- The Supabase URL + anon key are visible to anyone using DevTools — this
  is by design and is safe **only because** RLS policies are in place.
- The bundle contains no service-role keys, no DB passwords, no FTP
  credentials.

---

## Input handling

- All form inputs flow through `src/lib/sanitization.ts` helpers
  (XSS-safe HTML escaping, length caps, email / phone / asset-code
  patterns).
- SQL injection is not possible from the frontend — every query goes
  through Supabase PostgREST with parameterised values.
- File uploads (bulk import) are parsed client-side via ExcelJS/CSV
  parsers and validated before being sent to the database.

---

## Audit trail

Every create / update / delete on the major tables is logged to
`audit_log` via per-table triggers (`database/02_audit_triggers.sql`),
capturing: action, table, record id, old values, new values, user id,
user name, timestamp, IP address (where available).

Viewable in-app under **Audit Trail** with filters by table, action,
user, and date range, plus CSV/PDF/XLSX export.

---

## Reporting a security issue

Please email security concerns to the maintainer email listed in the
repository's GitHub settings rather than opening a public issue.
