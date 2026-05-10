-- ============================================================
-- Import Mumbai Desktop Assets from CSV
-- Run this in Supabase SQL Editor after creating location
-- ============================================================

-- Step 1: Ensure Mumbai location exists
INSERT INTO public.locations (name, code, is_active, created_at)
VALUES ('Mumbai', 'MUM', true, now())
ON CONFLICT (code) DO NOTHING;

-- Step 2: Ensure Gem Aromatics company exists
INSERT INTO public.companies (name, code, is_active, created_at)
VALUES ('Gem Aromatics Limited', 'GEM', true, now())
ON CONFLICT (code) DO NOTHING;

-- Step 3: Create departments if not exist
INSERT INTO public.departments (name, code, is_active, created_at)
VALUES 
  ('IT', 'IT', true, now()),
  ('Sales', 'SALES', true, now()),
  ('Accounts', 'ACC', true, now()),
  ('Exim', 'EXIM', true, now()),
  ('Compliance', 'COMP', true, now()),
  ('Banking', 'BANK', true, now()),
  ('Marketing', 'MKT', true, now()),
  ('HR', 'HR', true, now()),
  ('Purchase', 'PUR', true, now()),
  ('Stores', 'STORE', true, now()),
  ('Conference', 'CONF', true, now())
ON CONFLICT (code) DO NOTHING;

-- Step 4: Create placeholder employees (will be updated later with real data)
-- Using employee codes from your CSV
INSERT INTO public.employees (employee_code, name, department_id, location_id, is_active, created_at)
SELECT 
  emp.code,
  emp.name,
  d.id,
  l.id,
  true,
  now()
FROM (VALUES
  ('001', 'Saloni Kasare', 'SALES'),
  ('002', 'Sunny Sobhani', 'IT'),
  ('003', 'Asmita Dhuri', 'ACC'),
  ('004', 'Darshana Sawant', 'COMP'),
  ('005', 'Anamika Chowdhari', 'EXIM'),
  ('006', 'Mayuri Sawant', 'BANK'),
  ('007', 'Rashida Shoeb', 'EXIM'),
  ('008', 'Abraham Stephen', 'IT'),
  ('009', 'Divya Shetty', 'IT'),
  ('010', 'Sofia Sathe', 'SALES'),
  ('011', 'Pooja Poojari', 'SALES'),
  ('012', 'Divya D''Silva', 'IT'),
  ('013', 'Bhushan Naidu', 'IT'),
  ('014', 'Savitri Thakur', 'EXIM'),
  ('015', 'Vinita Vibhandik', 'SALES'),
  ('016', 'Akshata Sawant', 'IT'),
  ('017', 'Milan Singh', 'IT'),
  ('018', 'Sai Kadam', 'IT'),
  ('019', 'Manisha Mane', 'COMP'),
  ('020', 'Shivani Singh', 'COMP'),
  ('021', 'Sanika Shetye', 'EXIM'),
  ('022', 'Misbah Parkar', 'EXIM'),
  ('023', 'Anjali Rai', 'BANK'),
  ('024', 'Nikhil Choudhary', 'MKT'),
  ('025', 'Snehali Parab', 'ACC'),
  ('026', 'Roshni Singh', 'BANK'),
  ('027', 'Ajay More', 'EXIM'),
  ('028', 'Ashvi Panchal', 'EXIM'),
  ('029', 'Swati Patel', 'EXIM'),
  ('030', 'Sukhada Vaje', 'EXIM'),
  ('031', 'Vaibhav Vaze', 'IT'),
  ('032', 'Rutuja Parab', 'COMP'),
  ('033', 'Sushma Prajapati', 'SALES'),
  ('034', 'Neha Loke', 'ACC'),
  ('035', 'Abin Thomas', 'ACC'),
  ('036', 'Dolphin', 'IT'),
  ('037', 'Conference 503', 'CONF'),
  ('038', 'Nageshwar Infotech', 'IT'),
  ('924', 'Roshni Singh', 'BANK'),
  ('951', 'Neha Loke', 'ACC'),
  ('965', 'Ajay More', 'EXIM'),
  ('519', 'Swati Patel', 'EXIM'),
  ('828', 'Ashvi Panchal', 'EXIM'),
  ('915', 'Sushma Prajapati', 'SALES'),
  ('121', 'Rutuja Parab', 'COMP'),
  ('940', 'Abin Thomas', 'ACC'),
  ('710', 'Sukhada Vaje', 'EXIM'),
  ('710', 'Vaibhav Vaze', 'IT')
) AS emp(code, name, dept_code)
JOIN public.departments d ON d.code = emp.dept_code
JOIN public.locations l ON l.code = 'MUM'
ON CONFLICT (employee_code) DO NOTHING;

-- Step 5: Create vendors
INSERT INTO public.vendors (name, is_active, created_at)
VALUES 
  ('Regalia Worldwide', true, now()),
  ('Sharpline Solutions', true, now()),
  ('Macwin Infotech', true, now()),
  ('Sharp Business System', true, now()),
  ('Ingram Micro', true, now()),
  ('Ashi Infoserve', true, now()),
  ('Kalpendra Computer', true, now()),
  ('MAC IT SOLUTION', true, now()),
  ('GREEN APPLE COMPUNET', true, now()),
  ('Ganesh Computer', true, now()),
  ('Nageshwar Infotech', true, now())
ON CONFLICT DO NOTHING;

-- Step 6: Create category for Desktops
INSERT INTO public.categories (name, code, asset_type, is_consumable, created_at)
VALUES ('Desktop Computer', 'DESKTOP', 'tangible', false, now())
ON CONFLICT (code) DO NOTHING;

-- Step 7: Import Mumbai Desktop Assets
-- Note: Run this after the above setup
-- This creates assets with their bin card data

-- Create a function to import the data
CREATE OR REPLACE FUNCTION import_mumbai_assets()
RETURNS TABLE(imported_count INT) AS $$
DECLARE
  v_location_id UUID;
  v_company_id UUID;
  v_category_id UUID;
  v_count INT := 0;
BEGIN
  -- Get IDs
  SELECT id INTO v_location_id FROM public.locations WHERE code = 'MUM' LIMIT 1;
  SELECT id INTO v_company_id FROM public.companies WHERE code = 'GEM' LIMIT 1;
  SELECT id INTO v_category_id FROM public.categories WHERE code = 'DESKTOP' LIMIT 1;
  
  -- Import each asset (sample - you would add all 38 assets here)
  -- Asset MCD-01
  INSERT INTO public.assets (
    asset_code, name, description, category_id, location_id, 
    serial_number, purchase_cost, purchase_date, status, 
    created_at, updated_at
  )
  VALUES (
    'MCD-01', 'Dell Vostro 3670', 'Dell Vostro 3670 / i5-8400 / 8GB / 1TB',
    v_category_id, v_location_id,
    'J8F4F12', 42473.00, '2020-01-15', 'allocated', now(), now()
  )
  ON CONFLICT (asset_code) DO NOTHING;
  
  -- Create bin card entry
  INSERT INTO public.bin_cards (
    asset_id, transaction_date, transaction_type, 
    quantity, balance_quantity, reference_no, notes
  )
  SELECT 
    a.id, '2020-01-15', 'receipt', 1, 1, 
    'PBN-PSI/19-20/469, GRN-1042/19-20',
    'Opening balance - Regalia Worldwide'
  FROM public.assets a WHERE a.asset_code = 'MCD-01'
  ON CONFLICT DO NOTHING;
  
  v_count := v_count + 1;
  
  -- Return count
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- Run the import
SELECT * FROM import_mumbai_assets();

-- Verify import
SELECT 
  'Assets imported:' as info,
  COUNT(*) as count
FROM public.assets a
JOIN public.locations l ON a.location_id = l.id
WHERE l.code = 'MUM';

SELECT 
  'Employees created:' as info,
  COUNT(*) as count
FROM public.employees e
JOIN public.locations l ON e.location_id = l.id
WHERE l.code = 'MUM';
