-- ============================================================
-- Clean Import for Mumbai Desktops
-- Use this if CSV import fails
-- ============================================================

-- Ensure unique constraints exist on code columns for ON CONFLICT to work
-- These constraints must exist before the INSERT statements below
DO $$
BEGIN
    -- Add UNIQUE constraint on companies.code if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'companies_code_key' 
        AND conrelid = 'public.companies'::regclass
    ) THEN
        ALTER TABLE public.companies ADD CONSTRAINT companies_code_key UNIQUE (code);
    END IF;
    
    -- Add UNIQUE constraint on locations.code if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'locations_code_key' 
        AND conrelid = 'public.locations'::regclass
    ) THEN
        ALTER TABLE public.locations ADD CONSTRAINT locations_code_key UNIQUE (code);
    END IF;
    
    -- Add UNIQUE constraint on categories.code if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_code_key' 
        AND conrelid = 'public.categories'::regclass
    ) THEN
        ALTER TABLE public.categories ADD CONSTRAINT categories_code_key UNIQUE (code);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already exists';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Constraint creation skipped: duplicate values exist';
END $$;

-- Step 1: Setup basics
INSERT INTO public.companies (name, code) 
VALUES ('Gem Aromatics Limited', 'GEM') 
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.locations (name, code) 
VALUES ('Mumbai', 'MUM') 
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.categories (name, code, asset_type) 
VALUES ('Desktop Computer', 'DESKTOP', 'tangible') 
ON CONFLICT (code) DO NOTHING;

-- Step 2: Create a temporary table for raw CSV data
CREATE TEMP TABLE temp_mumbai_assets (
    sap_code TEXT,
    name TEXT,
    serial_number TEXT,
    purchase_date TEXT,
    status TEXT DEFAULT 'allocated'
);

-- Step 3: Import data (copy from your CSV)
-- You'll need to manually insert rows here based on your CSV
-- Example format:
INSERT INTO temp_mumbai_assets VALUES
('MCD-01', 'Dell vostro 3670 I3 8100 / 12GB', '7G118Q2', '2018-12-13', 'allocated'),
('MCD-02', 'Dell OptiPlex 5060 Tower I5 8t', '24TRDv2', '2019-04-22', 'allocated'),
('MCD-03', 'Dell vostro 3670 I3 8100 / 12R', '27G89R2', '2019-04-22', 'allocated'),
('MCD-04', 'Dell OptiPlex 5060 Tower I5 8', '4VDY3W2', '2019-04-22', 'allocated'),
('MCD-06', 'Dell vostro 3471 I3 9100 / 8GB', 'H6W7P23', NULL, 'allocated'),
('MCD-09', 'Dell vostro 3470 I3 9100 / 8GB', '2IKQ9W2', '2019-12-04', 'allocated'),
('MCD-10', 'Dell vostro 3470 I3 9100 / 8GB', 'J8B2C22', '2019-12-04', 'allocated'),
('MCD-11', 'Dell vostro 3470 I3 9100 / 8GB', 'J6Y2C22', '2019-12-04', 'allocated');

-- Step 4: Move data to assets table
INSERT INTO public.assets (
    sap_code, 
    name, 
    description,
    serial_number, 
    purchase_date, 
    status,
    category_id,
    location_id,
    company_id,
    created_at
)
SELECT 
    t.sap_code,
    t.name,
    t.name as description,
    t.serial_number,
    CASE 
        WHEN t.purchase_date IS NOT NULL AND t.purchase_date != '' 
        THEN t.purchase_date::DATE 
        ELSE NULL 
    END,
    COALESCE(t.status, 'allocated'),
    (SELECT id FROM public.categories WHERE code = 'DESKTOP'),
    (SELECT id FROM public.locations WHERE code = 'MUM'),
    (SELECT id FROM public.companies WHERE code = 'GEM'),
    NOW()
FROM temp_mumbai_assets t
ON CONFLICT (sap_code) DO NOTHING;

-- Step 5: Verify
SELECT 'Imported assets:' as info, COUNT(*) as count 
FROM public.assets 
WHERE sap_code LIKE 'MCD-%';

-- Cleanup
DROP TABLE IF EXISTS temp_mumbai_assets;
