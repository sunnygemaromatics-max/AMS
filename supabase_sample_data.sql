-- ============================================================
-- ASSET HARMONY — SAMPLE DATA SEED (1 of each entity)
-- Run in Supabase SQL Editor.
-- All sample rows use the SAMPLE_ prefix in their codes/names so
-- admins can easily identify and delete them later, e.g.:
--   DELETE FROM assets    WHERE sap_code LIKE 'SAMPLE-%';
--   DELETE FROM employees WHERE employee_code LIKE 'SAMPLE-%';
--   ...etc.
-- Idempotent: safe to re-run (uses ON CONFLICT DO NOTHING where unique).
-- ============================================================

BEGIN;

-- 1. COMPANY
INSERT INTO public.companies (name, code, is_active)
VALUES ('Sample Company TSI', 'SAMPLE-CO', true)
ON CONFLICT (code) DO NOTHING;

-- 2. LOCATION
INSERT INTO public.locations (name, code, address, is_active)
VALUES ('Sample HQ', 'SAMPLE-LOC', '123 TSI Street, Mumbai', true)
ON CONFLICT (code) DO NOTHING;

-- 3. DEPARTMENT
INSERT INTO public.departments (name, code, is_active)
VALUES ('Sample IT Department', 'SAMPLE-DEPT', true)
ON CONFLICT (code) DO NOTHING;

-- 4. CATEGORY
INSERT INTO public.categories (name, code, is_active)
VALUES ('Sample Laptop Category', 'SAMPLE-CAT', true)
ON CONFLICT (code) DO NOTHING;

-- 5. VENDOR
INSERT INTO public.vendors (name, contact_person, email, phone, address, gst_number, is_active)
VALUES (
  'Sample Vendor Co.',
  'John Doe',
  'sample.vendor@example.com',
  '+91 9876543210',
  '456 Vendor Lane, Mumbai',
  '27ABCDE1234F1Z5',
  true
)
ON CONFLICT DO NOTHING;

-- 6. EMPLOYEE
INSERT INTO public.employees (
  employee_code, name, email, phone, department, designation,
  department_id, location_id, company_id, is_active, employee_type, date_of_joining
)
SELECT
  'SAMPLE-EMP-001',
  'Sample Employee',
  'sample.employee@example.com',
  '+91 9876543211',
  'Sample IT Department',
  'Software Engineer',
  d.id, l.id, c.id,
  true, 'full_time', CURRENT_DATE - INTERVAL '1 year'
FROM public.departments d, public.locations l, public.companies c
WHERE d.code = 'SAMPLE-DEPT' AND l.code = 'SAMPLE-LOC' AND c.code = 'SAMPLE-CO'
ON CONFLICT (employee_code) DO NOTHING;

-- 7. ASSET (links to vendor, employee, location, company, category, department)
INSERT INTO public.assets (
  sap_code, bin_card_no, name, brand, model, serial_number, specifications,
  asset_type, asset_subtype, is_consumable,
  purchase_date, purchase_bill_no, purchase_cost,
  vendor_id, warranty_start, warranty_end,
  status, current_employee_id, current_location_id, company_id,
  category_id, department_id, notes, is_deleted
)
SELECT
  'SAMPLE-ASSET-001',
  COALESCE((SELECT MAX(bin_card_no) FROM public.assets), 0) + 1000,
  'Sample Laptop',
  'Dell',
  'Latitude 5520',
  'SN-SAMPLE-001',
  'Intel i7 11th Gen, 16GB RAM, 512GB SSD',
  'tangible'::public.asset_type,
  'laptop'::public.asset_subtype,
  false,
  CURRENT_DATE - INTERVAL '6 months',
  'BILL-SAMPLE-001',
  85000.00,
  v.id,
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE + INTERVAL '30 months',
  'available'::public.asset_status,
  e.id, l.id, c.id,
  cat.id, d.id,
  'Sample asset created for demonstration. Safe to delete.',
  false
FROM public.vendors v, public.employees e, public.locations l, public.companies c,
     public.categories cat, public.departments d
WHERE v.name = 'Sample Vendor Co.'
  AND e.employee_code = 'SAMPLE-EMP-001'
  AND l.code = 'SAMPLE-LOC'
  AND c.code = 'SAMPLE-CO'
  AND cat.code = 'SAMPLE-CAT'
  AND d.code = 'SAMPLE-DEPT'
ON CONFLICT (sap_code) DO NOTHING;

-- 8. LICENSE
INSERT INTO public.licenses (
  license_type, license_key, product_name, email_id,
  validity_start, validity_end, max_users, current_users,
  assigned_employee_id, company_id, location_id, status, notes
)
SELECT
  'Microsoft Office 365',
  'SAMPLE-LIC-XXXX-XXXX-XXXX',
  'Microsoft 365 Business',
  'sample.license@example.com',
  CURRENT_DATE - INTERVAL '1 month',
  CURRENT_DATE + INTERVAL '11 months',
  1, 1,
  e.id, c.id, l.id,
  'active',
  'Sample license created for demonstration. Safe to delete.'
FROM public.employees e, public.companies c, public.locations l
WHERE e.employee_code = 'SAMPLE-EMP-001'
  AND c.code = 'SAMPLE-CO'
  AND l.code = 'SAMPLE-LOC'
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFY: show what was inserted
-- ============================================================
SELECT 'companies'  AS entity, name AS label FROM public.companies   WHERE code = 'SAMPLE-CO'
UNION ALL SELECT 'locations',   name FROM public.locations  WHERE code = 'SAMPLE-LOC'
UNION ALL SELECT 'departments', name FROM public.departments WHERE code = 'SAMPLE-DEPT'
UNION ALL SELECT 'categories',  name FROM public.categories WHERE code = 'SAMPLE-CAT'
UNION ALL SELECT 'vendors',     name FROM public.vendors    WHERE name = 'Sample Vendor Co.'
UNION ALL SELECT 'employees',   name FROM public.employees  WHERE employee_code = 'SAMPLE-EMP-001'
UNION ALL SELECT 'assets',      name FROM public.assets     WHERE sap_code = 'SAMPLE-ASSET-001'
UNION ALL SELECT 'licenses',    license_type FROM public.licenses WHERE license_key = 'SAMPLE-LIC-XXXX-XXXX-XXXX';

-- ============================================================
-- 🗑️  ADMIN CLEANUP (run later to remove all sample data)
-- ============================================================
-- DELETE FROM public.licenses           WHERE license_key = 'SAMPLE-LIC-XXXX-XXXX-XXXX';
-- DELETE FROM public.assets             WHERE sap_code = 'SAMPLE-ASSET-001';
-- DELETE FROM public.employees          WHERE employee_code = 'SAMPLE-EMP-001';
-- DELETE FROM public.vendors            WHERE name = 'Sample Vendor Co.';
-- DELETE FROM public.categories         WHERE code = 'SAMPLE-CAT';
-- DELETE FROM public.departments        WHERE code = 'SAMPLE-DEPT';
-- DELETE FROM public.locations          WHERE code = 'SAMPLE-LOC';
-- DELETE FROM public.companies          WHERE code = 'SAMPLE-CO';
