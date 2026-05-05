-- ============================================================
-- ASSET HARMONY - DATABASE SECURITY UPDATES
-- Run this script in Supabase SQL Editor
-- ============================================================

-- 1. FIX RLS WRITE POLICIES (if not already applied)
-- ============================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'locations', 'companies', 'departments',
    'categories', 'vendors', 'licenses',
    'asset_transactions', 'import_runs'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Authenticated users can insert ' || t || '" ON ' || t || ';
      DROP POLICY IF EXISTS "Authenticated users can update ' || t || '" ON ' || t || ';
      
      CREATE POLICY "Authenticated users can insert ' || t || '" ON ' || t || '
        FOR INSERT TO authenticated
        WITH CHECK (true);
      
      CREATE POLICY "Authenticated users can update ' || t || '" ON ' || t || '
        FOR UPDATE TO authenticated
        USING (true)
        WITH CHECK (true);
    ');
  END LOOP;
END $$;

-- 2. ENSURE ASSETS TABLE HAS CORRECT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert assets" ON assets;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON assets;

CREATE POLICY "Authenticated users can insert assets" ON assets
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets" ON assets
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. ENSURE EMPLOYEES TABLE HAS CORRECT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;

CREATE POLICY "Authenticated users can insert employees" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees" ON employees
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. UPDATE PROFILES TABLE WITH NEW FIELDS (if needed)
-- ============================================================

DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE profiles ADD COLUMN username TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approved_at') THEN
    ALTER TABLE profiles ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approved_by') THEN
    ALTER TABLE profiles ADD COLUMN approved_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- 5. CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_is_deleted ON assets(is_deleted);

-- Only create indexes for columns that exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_active') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'is_active') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_active') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'is_active') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'is_active') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approval_status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status)';
  END IF;
END $$;

-- 6. ADD SECURITY FUNCTIONS (if they don't exist)
-- ============================================================

-- Use CASCADE to drop all dependencies at once
DROP FUNCTION IF EXISTS has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_approved(UUID) CASCADE;

CREATE FUNCTION has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = has_role.user_id 
    AND user_roles.role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION is_approved(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = is_approved.user_id 
    AND profiles.approval_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. UPDATE ROW LEVEL SECURITY FOR PROFILES
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 8. CREATE AUDIT TRIGGER FOR ASSET TRANSACTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION audit_asset_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the transaction for audit purposes
  IF TG_OP = 'INSERT' THEN
    RAISE NOTICE 'Asset transaction created: % for asset % by %', 
      NEW.transaction_type, NEW.asset_id, NEW.performed_by;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    RAISE NOTICE 'Asset transaction updated: % for asset %', 
      NEW.transaction_type, NEW.asset_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asset_transactions_audit ON asset_transactions;
CREATE TRIGGER asset_transactions_audit
  AFTER INSERT OR UPDATE ON asset_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_asset_transactions();

-- 9. VALIDATION CONSTRAINTS
-- ============================================================

ALTER TABLE assets 
  ADD CONSTRAINT chk_asset_status 
  CHECK (status IN ('available', 'allocated', 'under_maintenance', 'lost', 'damaged', 'scrapped'));

-- Only add constraints for columns that exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_active') THEN
    EXECUTE 'ALTER TABLE employees ADD CONSTRAINT chk_employee_active CHECK (is_active IN (true, false))';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approval_status') THEN
    EXECUTE 'ALTER TABLE profiles ADD CONSTRAINT chk_approval_status CHECK (approval_status IN (''pending'', ''approved'', ''rejected''))';
  END IF;
END $$;

-- 10. GRANT PERMISSIONS
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Asset Harmony database security updates completed successfully!';
  RAISE NOTICE 'Updated tables: assets, employees, locations, companies, departments, categories, vendors, licenses, profiles';
  RAISE NOTICE 'Security features: RLS policies, audit triggers, validation constraints, performance indexes';
END $$;
