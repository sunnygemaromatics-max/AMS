-- ============================================================
-- FIX 400 BAD REQUEST ERRORS
-- Add missing columns that frontend expects
-- ============================================================

-- Check 1: Add missing columns to assets table
DO $$
BEGIN
    -- is_deleted (required by frontend filter)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    
    -- asset_subtype (required for filtering laptops/desktops)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS asset_subtype TEXT DEFAULT 'other';
    
    -- system_info (referenced by BinCardsPage)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS system_info TEXT;
    
    -- purchase_bill_no (referenced by BinCardsPage)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS purchase_bill_no TEXT;
    
    -- bin_card_no (if not exists)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS bin_card_no INTEGER;
    
    -- brand
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS brand TEXT;
    
    -- model
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS model TEXT;
    
    -- specifications
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS specifications TEXT;
    
    -- imei
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS imei TEXT;
    
    -- imei2
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS imei2 TEXT;
    
    -- mobile_number
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS mobile_number TEXT;
    
    -- sim_provider
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sim_provider TEXT;
    
    -- license_key
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS license_key TEXT;
    
    -- warranty_start
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS warranty_start DATE;
    
    -- warranty_end
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS warranty_end DATE;
    
    -- notes
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS notes TEXT;
    
    RAISE NOTICE '✅ All missing columns added to assets table';
END $$;

-- Check 2: Add missing columns to locations table
DO $$
BEGIN
    ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
END $$;

-- Check 3: Add missing columns to employees table
DO $$
BEGIN
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_code TEXT;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department TEXT;
END $$;

-- Check 4: Add missing columns to companies table
DO $$
BEGIN
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
END $$;

-- Check 5: Add missing columns to categories table
DO $$
BEGIN
    ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
END $$;

-- Check 6: Add missing columns to vendors table
DO $$
BEGIN
    ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
END $$;

-- Check 7: Add missing columns to departments table
DO $$
BEGIN
    ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
END $$;

-- Check 8: Add missing columns to licenses table
DO $$
BEGIN
    ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
END $$;

-- Check 9: Fix existing data
UPDATE public.assets SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.locations SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.employees SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.companies SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.categories SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.vendors SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.departments SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE public.licenses SET is_deleted = false WHERE is_deleted IS NULL;

-- Check 10: Add unique constraints for code columns (code is now NOT NULL so constraints work)
DO $$
BEGIN
    -- Add unique constraint on locations.code if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'locations_code_key' 
        AND conrelid = 'public.locations'::regclass
    ) THEN
        ALTER TABLE public.locations ADD CONSTRAINT locations_code_key UNIQUE (code);
    END IF;
    
    -- Add unique constraint on companies.code if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'companies_code_key' 
        AND conrelid = 'public.companies'::regclass
    ) THEN
        ALTER TABLE public.companies ADD CONSTRAINT companies_code_key UNIQUE (code);
    END IF;
    
    -- Add unique constraint on categories.code if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_code_key' 
        AND conrelid = 'public.categories'::regclass
    ) THEN
        ALTER TABLE public.categories ADD CONSTRAINT categories_code_key UNIQUE (code);
    END IF;
    
    -- Add unique constraint on departments.code if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'departments_code_key' 
        AND conrelid = 'public.departments'::regclass
    ) THEN
        ALTER TABLE public.departments ADD CONSTRAINT departments_code_key UNIQUE (code);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already exists: %', SQLERRM;
EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Cannot add unique constraint: duplicate code values exist';
END $$;

-- Final verification
SELECT '========================================' as separator;
SELECT '✅ ALL MISSING COLUMNS ADDED' as status;
SELECT '========================================' as separator;
SELECT 'Refresh your app now - 400 errors should be fixed!' as instruction;

-- Show column count
SELECT 'assets table now has:' as info, COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'assets' AND table_schema = 'public';
