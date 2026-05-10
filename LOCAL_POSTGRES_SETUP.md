# Local PostgreSQL Setup Guide

Step-by-step guide to migrate from Supabase to local PostgreSQL and make your AMS software live.

## Prerequisites

- PostgreSQL 14+ installed locally
- pgAdmin 4 (optional, for GUI management)
- Your Supabase project credentials

---

## Step 1: Create Local Database

Open **pgAdmin 4** or **psql** and create a new database:

```sql
-- Using psql command line
CREATE DATABASE asset_harmony;

-- Connect to the database
\c asset_harmony
```

---

## Step 2: Create Schema Structure

Run the complete schema script to create all tables, functions, and policies:

**Using pgAdmin:**
1. Right-click your database → Query Tool
2. Open `supabase_complete_schema.sql`
3. Press F5 or click Execute

**Using psql:**
```bash
psql -U postgres -d asset_harmony -f "c:\Users\JSK\Downloads\asset-harmony-main\supabase_complete_schema.sql"
```

---

## Step 3: Export Data from Supabase

### Option A: Using Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard** → **Table Editor**
2. For each table, click the table → **Export** → **CSV**
3. Download these tables in order:
   - `companies`
   - `categories`
   - `vendors`
   - `locations`
   - `departments`
   - `employees`
   - `assets`
   - `licenses`
   - `asset_transactions`
   - `profiles`
   - `user_roles`
   - `organization_settings`

### Option B: Using SQL (For Large Data)

Run this in **Supabase SQL Editor** to export as INSERT statements:

```sql
-- Export companies (run for each table)
SELECT format(
  'INSERT INTO companies (id, name, code, address, is_active, created_at, updated_at) VALUES (%L, %L, %L, %L, %L, %L, %L);',
  id, name, code, address, is_active, created_at, updated_at
) as insert_statement
FROM companies;
```

Copy the results and save to `companies_data.sql`.

---

## Step 4: Import Data to Local PostgreSQL

### Method 1: Using CSV Import (Recommended for Beginners)

**Using pgAdmin:**
1. Right-click table → Import/Export Data
2. Select Import, choose your CSV file
3. Set format to CSV, Header ON, Delimiter comma
4. Click OK

**Import in this order:**
1. `companies` → `categories` → `vendors`
2. `locations` → `departments`
3. `employees`
4. `assets` → `licenses`
5. `asset_transactions`
6. `profiles` → `user_roles`
7. `organization_settings`

### Method 2: Using INSERT Statements

If you exported as SQL INSERT statements:

```bash
psql -U postgres -d asset_harmony -f "companies_data.sql"
psql -U postgres -d asset_harmony -f "locations_data.sql"
# ... and so on for each file
```

---

## Step 5: Create Your Admin User

After importing data, approve your account and add admin role:

```sql
-- Replace with your actual user ID from Supabase auth.users
UPDATE public.profiles 
SET approval_status = 'approved', approved_at = now() 
WHERE id = 'YOUR_USER_ID_FROM_SUPABASE';

INSERT INTO public.user_roles (user_id, role) 
VALUES ('YOUR_USER_ID_FROM_SUPABASE', 'admin') 
ON CONFLICT DO NOTHING;
```

**To find your user ID:**
```sql
-- In Supabase SQL Editor
SELECT id, email FROM auth.users WHERE email = 'your@email.com';
```

---

## Step 6: Update App Connection

Edit your app's environment file to connect to local PostgreSQL:

### For Supabase Client (src/lib/supabase.ts)

```typescript
// OLD (Supabase)
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

// NEW (Local PostgreSQL with PostgREST)
const supabaseUrl = 'http://localhost:3000'; // PostgREST URL
const supabaseKey = 'your-local-jwt-secret';
```

### Alternative: Direct PostgreSQL Connection

If not using Supabase client, update database URL:

```env
# .env file
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/asset_harmony
```

---

## Step 7: Set Up PostgREST (Optional)

If your app uses Supabase client, you need **PostgREST** to expose PostgreSQL as REST API:

1. Download PostgREST from https://github.com/PostgREST/postgrest/releases
2. Create `postgrest.conf`:

```conf
db-uri = "postgres://postgres:YOUR_PASSWORD@localhost:5432/asset_harmony"
db-schema = "public"
db-anon-role = "postgres"
server-port = 3000
jwt-secret = "your-secret-key-at-least-32-chars-long"
```

3. Run PostgREST:
```bash
postgrest postgrest.conf
```

4. Update app to use `http://localhost:3000`

---

## Step 8: Verify Everything Works

### Test 1: Database Connection

```bash
psql -U postgres -d asset_harmony -c "SELECT COUNT(*) FROM companies;"
```

### Test 2: Permission Functions

```sql
-- Test your admin permissions
SELECT 
  public.has_role('YOUR_USER_ID'::uuid, 'admin') as has_admin,
  public.is_approved('YOUR_USER_ID'::uuid) as is_approved,
  public.can_write_assets('YOUR_USER_ID'::uuid) as can_write;
```

All should return `true`.

### Test 3: App Login

1. Start your app
2. Try logging in
3. Try adding a location/asset

---

## Troubleshooting

### "Connection refused" Error
- Check PostgreSQL service is running
- Verify port 5432 is open in firewall
- Check pg_hba.conf allows local connections

### "Permission denied" Error in App
- Run the admin user SQL from Step 5
- Verify functions return true:
  ```sql
  SELECT public.has_role('YOUR_ID', 'admin');
  ```

### "Column does not exist" Error
- Check you imported schema before data
- Verify column names match between export and import

### "Foreign key violation" Error
- Import data in correct order (parent tables first)
- Ensure referenced records exist before importing child records

### Data Not Showing in App
- Check RLS policies are created:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'companies';
  ```
- Verify user has approved status and admin role

---

## Quick Commands Reference

```bash
# Start PostgreSQL service (Windows)
net start postgresql-x64-15

# Connect to database
psql -U postgres -d asset_harmony

# Export single table
gpg_dump -U postgres -d asset_harmony -t companies > companies_backup.sql

# Import single table
psql -U postgres -d asset_harmony < companies_backup.sql

# List all tables
psql -U postgres -d asset_harmony -c "\dt"

# Check row counts
psql -U postgres -d asset_harmony -c "
SELECT 'companies' as table_name, count(*) as rows FROM companies
UNION ALL SELECT 'assets', count(*) FROM assets
UNION ALL SELECT 'employees', count(*) FROM employees;
"
```

---

## Next Steps

1. ✅ Database created
2. ✅ Schema imported
3. ✅ Data migrated
4. ✅ App connected
5. 🔄 Set up automated backups
6. 🔄 Configure SSL for production

**Need help?** Check PostgreSQL logs at: `C:\Program Files\PostgreSQL\15\data\log\`
