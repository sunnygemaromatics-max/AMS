-- ============================================================
-- QUICK VISIBILITY CHECK - What's in the database?
-- ============================================================

-- 1. Check if assets table has any data
SELECT 'ASSETS TABLE' as check_type, COUNT(*) as total_count FROM public.assets
UNION ALL
SELECT 'COMPANIES', COUNT(*) FROM public.companies
UNION ALL
SELECT 'LOCATIONS', COUNT(*) FROM public.locations
UNION ALL
SELECT 'EMPLOYEES', COUNT(*) FROM public.employees;

-- 2. Show first 5 assets (if any exist)
SELECT 'FIRST 5 ASSETS:' as info;
SELECT sap_code, name, bin_card_no, status, created_at
FROM public.assets
LIMIT 5;

-- 3. Check RLS is disabled (for testing)
SELECT 'RLS STATUS:' as info;
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('assets', 'companies', 'locations', 'employees')
ORDER BY tablename;

-- 4. Create sample data if tables are empty
DO $$
DECLARE
    v_asset_count INT;
    v_location_id UUID;
    v_company_id UUID;
BEGIN
    SELECT COUNT(*) INTO v_asset_count FROM public.assets;
    
    IF v_asset_count = 0 THEN
        -- Create basic location and company first
        INSERT INTO public.locations (name, code) 
        VALUES ('Mumbai', 'MUM') 
        ON CONFLICT (code) DO NOTHING
        RETURNING id INTO v_location_id;
        
        IF v_location_id IS NULL THEN
            SELECT id INTO v_location_id FROM public.locations WHERE code = 'MUM' LIMIT 1;
        END IF;
        
        INSERT INTO public.companies (name, code) 
        VALUES ('Gem Aromatics Limited', 'GEM') 
        ON CONFLICT (code) DO NOTHING
        RETURNING id INTO v_company_id;
        
        IF v_company_id IS NULL THEN
            SELECT id INTO v_company_id FROM public.companies WHERE code = 'GEM' LIMIT 1;
        END IF;
        
        -- Create sample asset
        INSERT INTO public.assets (
            sap_code, name, description, 
            location_id, company_id, 
            bin_card_no, status, created_at
        ) VALUES (
            'MCD-01', 
            'Sample Desktop', 
            'Dell Desktop Computer',
            v_location_id,
            v_company_id,
            1,
            'allocated',
            NOW()
        );
        
        RAISE NOTICE '✅ Created sample asset - refresh your app!';
    ELSE
        RAISE NOTICE '✅ You have % assets in database', v_asset_count;
    END IF;
END $$;

-- 5. Final verification
SELECT 'FINAL COUNT:' as info;
SELECT COUNT(*) as total_assets FROM public.assets;
