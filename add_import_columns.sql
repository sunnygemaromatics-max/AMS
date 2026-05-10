-- ============================================================
-- Add Temporary Import Columns to Store All Your Data
-- Run this first, then your CSV import will work!
-- ============================================================

-- Add columns to assets table for temporary storage
-- Note: purchase_bill_no and import_notes are added by FIX_400_ERROR.sql and auto_import_csv.sql respectively
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS grn_no TEXT,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS employee_code TEXT,
ADD COLUMN IF NOT EXISTS employee_name TEXT,
ADD COLUMN IF NOT EXISTS department_name TEXT,
ADD COLUMN IF NOT EXISTS receiver_date DATE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assets_employee_code ON public.assets(employee_code);
CREATE INDEX IF NOT EXISTS idx_assets_vendor_name ON public.assets(vendor_name);

-- Verify columns added
SELECT '✅ New columns added to assets table:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name IN ('purchase_bill_no', 'grn_no', 'vendor_name', 'employee_code', 'employee_name', 'department_name', 'receiver_date', 'import_notes')
ORDER BY ordinal_position;

-- Show all columns
SELECT 'All asset columns:' as info;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'assets' AND table_schema = 'public'
ORDER BY ordinal_position;
