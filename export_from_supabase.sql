-- ============================================================
-- EXPORT DATA FROM SUPABASE TO LOCAL POSTGRESQL
-- Run this in Supabase SQL Editor to generate INSERT statements
-- Copy the results and save to files, then run in local PostgreSQL
-- ============================================================

-- INSTRUCTIONS:
-- 1. Run each section separately in Supabase SQL Editor
-- 2. Copy the output (Results tab) 
-- 3. Save to corresponding file (e.g., 01_companies.sql)
-- 4. Run files in order on your local PostgreSQL

-- ============================================================
-- SECTION 1: COMPANIES (Run First)
-- ============================================================
SELECT format(
  'INSERT INTO public.companies (id, name, code, address, is_active, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, name, code, address, is_active, created_at, updated_at
) as sql
FROM public.companies
ORDER BY created_at;

-- ============================================================
-- SECTION 2: CATEGORIES
-- ============================================================
SELECT format(
  'INSERT INTO public.categories (id, name, code, parent_id, asset_type, is_consumable, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L::uuid, %L::public.asset_type, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, name, code, parent_id, asset_type, is_consumable, created_at, updated_at
) as sql
FROM public.categories
ORDER BY created_at;

-- ============================================================
-- SECTION 3: VENDORS
-- ============================================================
SELECT format(
  'INSERT INTO public.vendors (id, name, contact_person, email, phone, address, gst_number, is_active, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L, %L, %L, %L, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, name, contact_person, email, phone, address, gst_number, is_active, created_at, updated_at
) as sql
FROM public.vendors
ORDER BY created_at;

-- ============================================================
-- SECTION 4: LOCATIONS (References companies)
-- ============================================================
SELECT format(
  'INSERT INTO public.locations (id, name, code, address, company_id, is_active, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L, %L::uuid, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, name, code, address, company_id, is_active, created_at, updated_at
) as sql
FROM public.locations
ORDER BY created_at;

-- ============================================================
-- SECTION 5: DEPARTMENTS (References companies, locations)
-- ============================================================
SELECT format(
  'INSERT INTO public.departments (id, name, code, company_id, location_id, is_active, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L::uuid, %L::uuid, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, name, code, company_id, location_id, is_active, created_at, updated_at
) as sql
FROM public.departments
ORDER BY created_at;

-- ============================================================
-- SECTION 6: EMPLOYEES (References departments, locations, companies)
-- ============================================================
SELECT format(
  'INSERT INTO public.employees (id, employee_code, name, email, phone, department_id, location_id, company_id, reporting_manager, employee_type, designation, is_active, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L, %L, %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L, %L, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, employee_code, name, email, phone, department_id, location_id, company_id, reporting_manager, employee_type, designation, is_active, created_at, updated_at
) as sql
FROM public.employees
ORDER BY created_at;

-- ============================================================
-- SECTION 7: ASSETS (References categories, vendors, companies, locations, employees)
-- ============================================================
SELECT format(
  'INSERT INTO public.assets (id, sap_code, bin_card_no, name, description, category_id, vendor_id, company_id, location_id, current_employee_id, current_location_id, purchase_date, purchase_cost, status, asset_type, asset_subtype, serial_number, model_number, is_deleted, deleted_at, deleted_by, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L, %L, %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::date, %L, %L::public.asset_status, %L::public.asset_type, %L::public.asset_subtype, %L, %L, %L, %L::timestamptz, %L::uuid, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, sap_code, bin_card_no, name, description, category_id, vendor_id, company_id, location_id, current_employee_id, current_location_id, purchase_date, purchase_cost, status, asset_type, asset_subtype, serial_number, model_number, is_deleted, deleted_at, deleted_by, created_at, updated_at
) as sql
FROM public.assets
ORDER BY created_at;

-- ============================================================
-- SECTION 8: LICENSES
-- ============================================================
SELECT format(
  'INSERT INTO public.licenses (id, license_key, license_type, software_name, vendor_id, seats, assigned_employee_id, assigned_asset_id, company_id, location_id, purchase_date, expiry_date, cost, notes, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L, %L::uuid, %L, %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::date, %L::date, %L, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, license_key, license_type, software_name, vendor_id, seats, assigned_employee_id, assigned_asset_id, company_id, location_id, purchase_date, expiry_date, cost, notes, created_at, updated_at
) as sql
FROM public.licenses
ORDER BY created_at;

-- ============================================================
-- SECTION 9: ASSET TRANSACTIONS
-- ============================================================
SELECT format(
  'INSERT INTO public.asset_transactions (id, asset_id, transaction_type, from_employee_id, to_employee_id, from_location_id, to_location_id, performed_by, transaction_date, notes, created_at) VALUES (%L::uuid, %L::uuid, %L::public.transaction_type, %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::timestamptz, %L, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, asset_id, transaction_type, from_employee_id, to_employee_id, from_location_id, to_location_id, performed_by, transaction_date, notes, created_at
) as sql
FROM public.asset_transactions
ORDER BY created_at;

-- ============================================================
-- SECTION 10: PROFILES (Your user accounts)
-- ============================================================
SELECT format(
  'INSERT INTO public.profiles (id, full_name, avatar_url, employee_id, approval_status, approved_by, approved_at, created_at) VALUES (%L::uuid, %L, %L, %L::uuid, %L::public.approval_status, %L::uuid, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO UPDATE SET approval_status = EXCLUDED.approval_status, approved_at = EXCLUDED.approved_at;',
  id, full_name, avatar_url, employee_id, approval_status, approved_by, approved_at, created_at
) as sql
FROM public.profiles
ORDER BY created_at;

-- ============================================================
-- SECTION 11: USER ROLES
-- ============================================================
SELECT format(
  'INSERT INTO public.user_roles (id, user_id, role) VALUES (%L::uuid, %L::uuid, %L::public.app_role) ON CONFLICT DO NOTHING;',
  id, user_id, role
) as sql
FROM public.user_roles
ORDER BY user_id;

-- ============================================================
-- SECTION 12: ORGANIZATION SETTINGS
-- ============================================================
SELECT format(
  'INSERT INTO public.organization_settings (id, org_name, org_address, org_phone, org_email, org_website, logo_url, primary_color, pdf_footer_text, email_alerts_enabled, email_alert_days_before, email_alert_time, created_at, updated_at) VALUES (%L::uuid, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L::timestamptz, %L::timestamptz) ON CONFLICT (id) DO NOTHING;',
  id, org_name, org_address, org_phone, org_email, org_website, logo_url, primary_color, pdf_footer_text, email_alerts_enabled, email_alert_days_before, email_alert_time, created_at, updated_at
) as sql
FROM public.organization_settings;

-- ============================================================
-- GET YOUR USER ID (Save this!)
-- ============================================================
SELECT '--- YOUR USER ID ---' as info, id, email FROM auth.users WHERE email = 'sunny.sobhani90@gmail.com';
