-- ============================================================
-- SAP B1 Import Setup - Permanent Solution
-- This creates proper columns for SAP B1 data structure
-- ============================================================

-- Step 1: Add SAP B1 specific columns to assets table
-- These columns match your SAP B1 export format

-- Check if columns exist, add if not
DO $$
BEGIN
    -- SAP Bill Number (Purchase Bill No. from SAP)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_bill_no TEXT;
    
    -- GRN Number (Goods Receipt Note from SAP)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS grn_no TEXT;
    
    -- Combined field if you want to keep them together
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS bill_and_grn TEXT;
    
    -- Employee reference fields (temporary until linked)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_employee_code TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_employee_name TEXT;
    
    -- Department reference (temporary until linked)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_department TEXT;
    
    -- Vendor reference (temporary until linked)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_vendor TEXT;
    
    -- Additional SAP fields
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_purchase_order TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_project_code TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_cost_center TEXT;
    
    -- Import metadata
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS import_date TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'SAP B1';
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS import_notes TEXT;
    
    RAISE NOTICE '✅ SAP B1 columns added successfully';
END $$;

-- Step 2: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_assets_sap_bill ON public.assets(sap_bill_no);
CREATE INDEX IF NOT EXISTS idx_assets_grn ON public.assets(grn_no);
CREATE INDEX IF NOT EXISTS idx_assets_sap_emp_code ON public.assets(sap_employee_code);
CREATE INDEX IF NOT EXISTS idx_assets_import_batch ON public.assets(import_batch_id);

-- Step 3: Verify columns
SELECT 'SAP B1 columns in assets table:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND table_schema = 'public'
AND column_name LIKE 'sap_%' OR column_name LIKE 'grn%' OR column_name LIKE 'import%'
ORDER BY ordinal_position;

-- Step 4: Create import batch tracking table
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_name TEXT NOT NULL,
    import_date TIMESTAMPTZ DEFAULT now(),
    source_system TEXT DEFAULT 'SAP B1',
    total_records INTEGER,
    successful_records INTEGER,
    failed_records INTEGER,
    imported_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on import_batches
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view import history
CREATE POLICY IF NOT EXISTS "Admins view import batches"
ON public.import_batches FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 5: Create function to link SAP data to actual records
CREATE OR REPLACE FUNCTION link_sap_data()
RETURNS TEXT AS $$
DECLARE
    v_linked_employees INT := 0;
    v_linked_vendors INT := 0;
    v_linked_departments INT := 0;
BEGIN
    -- Link employees by code
    UPDATE public.assets a
    SET assigned_to = e.id
    FROM public.employees e
    WHERE a.sap_employee_code = e.employee_code
    AND a.assigned_to IS NULL;
    
    GET DIAGNOSTICS v_linked_employees = ROW_COUNT;
    
    -- Link vendors by name (exact match)
    UPDATE public.assets a
    SET vendor_id = v.id
    FROM public.vendors v
    WHERE LOWER(TRIM(a.sap_vendor)) = LOWER(TRIM(v.name))
    AND a.vendor_id IS NULL;
    
    GET DIAGNOSTICS v_linked_vendors = ROW_COUNT;
    
    -- Link departments by name
    UPDATE public.assets a
    SET department_id = d.id
    FROM public.departments d
    WHERE LOWER(TRIM(a.sap_department)) = LOWER(TRIM(d.name))
    AND a.department_id IS NULL;
    
    GET DIAGNOSTICS v_linked_departments = ROW_COUNT;
    
    RETURN format('Linked: %s employees, %s vendors, %s departments', 
                  v_linked_employees, v_linked_vendors, v_linked_departments);
END;
$$ LANGUAGE plpgsql;

-- Step 6: Show summary
SELECT '========================================' as separator;
SELECT '✅ SAP B1 IMPORT SYSTEM READY' as status;
SELECT '========================================' as separator;
SELECT 'New columns added for SAP B1 data:' as info;
SELECT '  • sap_bill_no - Purchase bill number' as column_info;
SELECT '  • grn_no - GRN number' as column_info;
SELECT '  • bill_and_grn - Combined field' as column_info;
SELECT '  • sap_employee_code - Employee code from SAP' as column_info;
SELECT '  • sap_employee_name - Employee name from SAP' as column_info;
SELECT '  • sap_department - Department from SAP' as column_info;
SELECT '  • sap_vendor - Vendor from SAP' as column_info;
SELECT '  • import_batch_id - Track import batches' as column_info;
SELECT '  • import_source - Always "SAP B1"' as column_info;
SELECT '' as blank;
SELECT 'After import, run: SELECT link_sap_data();' as instruction;
SELECT 'This will auto-link employees, vendors, and departments' as instruction;
