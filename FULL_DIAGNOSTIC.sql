-- ============================================================
-- FULL SYSTEM DIAGNOSTIC
-- Run this to check everything - database, data, and issues
-- ============================================================

-- Check 1: Database Tables Exist
SELECT '========================================' as section;
SELECT '1. CHECKING TABLES' as status;
SELECT '========================================' as section;

SELECT 
    table_name,
    EXISTS (SELECT 1 FROM information_schema.tables t2 WHERE t2.table_name = tables.table_name AND t2.table_schema = 'public') as exists
FROM (VALUES 
    ('assets'), ('employees'), ('locations'), ('companies'), 
    ('categories'), ('vendors'), ('departments'), ('licenses'),
    ('asset_transactions'), ('profiles'), ('user_roles'), ('bin_cards')
) AS tables(table_name);

-- Check 2: Assets Table Columns
SELECT '========================================' as section;
SELECT '2. ASSETS TABLE COLUMNS' as status;
SELECT '========================================' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'assets' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check 3: Data Count
SELECT '========================================' as section;
SELECT '3. DATA COUNTS' as status;
SELECT '========================================' as section;

SELECT 'assets' as table_name, COUNT(*) as count FROM public.assets
UNION ALL
SELECT 'employees', COUNT(*) FROM public.employees
UNION ALL
SELECT 'locations', COUNT(*) FROM public.locations
UNION ALL
SELECT 'companies', COUNT(*) FROM public.companies
UNION ALL
SELECT 'categories', COUNT(*) FROM public.categories
UNION ALL
SELECT 'vendors', COUNT(*) FROM public.vendors
UNION ALL
SELECT 'departments', COUNT(*) FROM public.departments
UNION ALL
SELECT 'licenses', COUNT(*) FROM public.licenses
UNION ALL
SELECT 'bin_cards', COUNT(*) FROM public.bin_cards;

-- Check 4: Assets with Missing Bin Card Numbers
SELECT '========================================' as section;
SELECT '4. ASSETS MISSING BIN CARD NUMBERS' as status;
SELECT '========================================' as section;

SELECT asset_code, name, bin_card_no
FROM public.assets
WHERE bin_card_no IS NULL OR bin_card_no = 0
LIMIT 10;

-- Check 5: Generate Missing Bin Card Numbers
SELECT '========================================' as section;
SELECT '5. FIXING MISSING BIN CARD NUMBERS' as status;
SELECT '========================================' as section;

-- Create function to auto-assign bin card numbers
CREATE OR REPLACE FUNCTION assign_missing_bin_cards()
RETURNS INTEGER AS $$
DECLARE
    v_asset RECORD;
    v_next_number INTEGER;
    v_count INTEGER := 0;
BEGIN
    FOR v_asset IN 
        SELECT id, asset_code 
        FROM public.assets 
        WHERE bin_card_no IS NULL OR bin_card_no = 0
        ORDER BY created_at, asset_code
    LOOP
        SELECT COALESCE(MAX(bin_card_no), 0) + 1 INTO v_next_number FROM public.assets;
        
        UPDATE public.assets 
        SET bin_card_no = v_next_number 
        WHERE id = v_asset.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Run the fix
SELECT assign_missing_bin_cards() as fixed_count;

-- Check 6: Verify Bin Card Numbers After Fix
SELECT '========================================' as section;
SELECT '6. VERIFY BIN CARD NUMBERS' as status;
SELECT '========================================' as section;

SELECT 
    asset_code, 
    name, 
    bin_card_no,
    CASE WHEN bin_card_no IS NOT NULL THEN 'OK' ELSE 'MISSING' END as status
FROM public.assets
ORDER BY bin_card_no NULLS LAST
LIMIT 20;

-- Check 7: Check for frontend visibility issues (RLS)
SELECT '========================================' as section;
SELECT '7. RLS POLICIES CHECK' as status;
SELECT '========================================' as section;

SELECT 
    tablename,
    policyname,
    permissive,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('assets', 'employees', 'locations', 'companies')
ORDER BY tablename;

-- Check 8: Foreign Key Issues
SELECT '========================================' as section;
SELECT '8. ORPHANED ASSETS (Missing Relations)' as status;
SELECT '========================================' as section;

SELECT 
    'Location' as issue,
    COUNT(*) as count
FROM public.assets a
WHERE a.location_id IS NULL
UNION ALL
SELECT 
    'Company',
    COUNT(*)
FROM public.assets a
WHERE a.company_id IS NULL
UNION ALL
SELECT 
    'Category',
    COUNT(*)
FROM public.assets a
WHERE a.category_id IS NULL;

-- Check 9: Create Missing Bin Cards Table if not exists
SELECT '========================================' as section;
SELECT '9. ENSURING BIN_CARDS TABLE EXISTS' as status;
SELECT '========================================' as section;

CREATE TABLE IF NOT EXISTS public.bin_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT CHECK (transaction_type IN ('receipt', 'issue', 'adjustment')),
    quantity INTEGER DEFAULT 1,
    balance_quantity INTEGER DEFAULT 0,
    reference_no TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on bin_cards
ALTER TABLE public.bin_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for bin_cards (handle if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bin_cards' 
    AND policyname = 'Allow all on bin_cards'
  ) THEN
    CREATE POLICY "Allow all on bin_cards" 
    ON public.bin_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_bin_cards_asset ON public.bin_cards(asset_id);

-- Check 10: Verify Everything
SELECT '========================================' as section;
SELECT '10. FINAL VERIFICATION' as status;
SELECT '========================================' as section;

SELECT 
    'Total Assets' as metric,
    COUNT(*) as value
FROM public.assets
UNION ALL
SELECT 
    'Assets with Bin Card #',
    COUNT(*) 
FROM public.assets 
WHERE bin_card_no IS NOT NULL
UNION ALL
SELECT 
    'Bin Card Records',
    COUNT(*) 
FROM public.bin_cards;

SELECT '========================================' as section;
SELECT '✅ DIAGNOSTIC COMPLETE' as status;
SELECT '========================================' as section;
SELECT 'Refresh your app and check again' as instruction;
