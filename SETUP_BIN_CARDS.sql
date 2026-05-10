-- ============================================================
-- BIN CARDS & AUDIT TRAIL SETUP - Phase 2
-- ============================================================

-- ============================================================
-- 1. BIN CARDS TABLE
-- Complete transaction history for each asset
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bin_card_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    
    -- Transaction details
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receipt', 'issue', 'adjustment', 'opening')),
    reference_no TEXT,
    
    -- Quantities (following traditional bin card format)
    receipt_qty INTEGER DEFAULT 0,
    issue_qty INTEGER DEFAULT 0,
    balance_qty INTEGER NOT NULL DEFAULT 0,
    
    -- Value tracking
    unit_cost DECIMAL(15,2),
    total_value DECIMAL(15,2),
    
    -- Who and why
    created_by UUID REFERENCES public.profiles(id),
    created_by_name TEXT,
    remarks TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bin_card_entries ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bin_card_entries_asset ON public.bin_card_entries(asset_id);
CREATE INDEX IF NOT EXISTS idx_bin_card_entries_date ON public.bin_card_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_bin_card_entries_type ON public.bin_card_entries(transaction_type);

-- ============================================================
-- 2. AUDIT LOG TABLE (Enhanced from existing audit_logs)
-- Track all changes to assets
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- What was changed
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Who made the change
    user_id UUID REFERENCES public.profiles(id),
    user_name TEXT,
    user_role TEXT,
    
    -- When and from where
    created_at TIMESTAMPTZ DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    
    -- Additional context
    location_id UUID REFERENCES public.locations(id),
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

-- Function to get bin card balance for an asset
CREATE OR REPLACE FUNCTION get_asset_balance(p_asset_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT COALESCE(balance_qty, 0) 
    INTO v_balance
    FROM public.bin_card_entries
    WHERE asset_id = p_asset_id
    ORDER BY entry_date DESC, created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to add bin card entry and update balance
CREATE OR REPLACE FUNCTION add_bin_card_entry(
    p_asset_id UUID,
    p_entry_date DATE,
    p_transaction_type TEXT,
    p_reference_no TEXT,
    p_quantity INTEGER,
    p_remarks TEXT,
    p_user_id UUID,
    p_user_name TEXT
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance
    v_current_balance := get_asset_balance(p_asset_id);
    
    -- Calculate new balance
    IF p_transaction_type = 'receipt' THEN
        v_new_balance := v_current_balance + p_quantity;
    ELSIF p_transaction_type = 'issue' THEN
        v_new_balance := v_current_balance - p_quantity;
    ELSE
        v_new_balance := p_quantity; -- For adjustment
    END IF;
    
    -- Insert entry
    INSERT INTO public.bin_card_entries (
        asset_id,
        entry_date,
        transaction_type,
        reference_no,
        receipt_qty,
        issue_qty,
        balance_qty,
        created_by,
        created_by_name,
        remarks
    ) VALUES (
        p_asset_id,
        p_entry_date,
        p_transaction_type,
        p_reference_no,
        CASE WHEN p_transaction_type = 'receipt' THEN p_quantity ELSE 0 END,
        CASE WHEN p_transaction_type = 'issue' THEN p_quantity ELSE 0 END,
        v_new_balance,
        p_user_id,
        p_user_name,
        p_remarks
    )
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit(
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_old_values JSONB,
    p_new_values JSONB,
    p_user_id UUID,
    p_user_name TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_changed_fields TEXT[] := ARRAY[]::TEXT[];
    v_key TEXT;
BEGIN
    -- Find changed fields
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        FOR v_key IN SELECT jsonb_object_keys(p_new_values)
        LOOP
            IF p_old_values->v_key IS DISTINCT FROM p_new_values->v_key THEN
                v_changed_fields := array_append(v_changed_fields, v_key);
            END IF;
        END LOOP;
    END IF;
    
    INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        user_id,
        user_name,
        notes
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        p_old_values,
        p_new_values,
        v_changed_fields,
        p_user_id,
        p_user_name,
        p_notes
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. TRIGGERS FOR AUTO-LOGGING
-- ============================================================

-- Trigger function for assets table
CREATE OR REPLACE FUNCTION assets_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Get current user name
    SELECT name INTO v_user_name FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit('assets', NEW.id, 'INSERT', NULL, to_jsonb(NEW), auth.uid(), v_user_name, 'Asset created');
        -- Also create opening bin card entry
        PERFORM add_bin_card_entry(NEW.id, CURRENT_DATE, 'opening', 'INIT-' || NEW.sap_code, 0, 'Opening balance', auth.uid(), v_user_name);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit('assets', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_name, 'Asset updated');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit('assets', OLD.id, 'DELETE', to_jsonb(OLD), NULL, auth.uid(), v_user_name, 'Asset deleted');
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS assets_audit_trigger ON public.assets;

-- Create trigger
CREATE TRIGGER assets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION assets_audit_trigger();

-- ============================================================
-- 5. POLICIES (Allow all for now - RLS is disabled)
-- ============================================================

-- Bin card entries policies
CREATE POLICY "Allow all on bin_card_entries"
ON public.bin_card_entries FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Audit log policies
CREATE POLICY "Allow all on audit_log"
ON public.audit_log FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- ============================================================
-- 6. INITIALIZE EXISTING ASSETS
-- Create opening entries for existing assets
-- ============================================================

DO $$
DECLARE
    v_asset RECORD;
    v_user_name TEXT := 'System';
BEGIN
    FOR v_asset IN SELECT id, sap_code, created_at FROM public.assets
    LOOP
        -- Check if opening entry exists
        IF NOT EXISTS (
            SELECT 1 FROM public.bin_card_entries 
            WHERE asset_id = v_asset.id AND transaction_type = 'opening'
        ) THEN
            INSERT INTO public.bin_card_entries (
                asset_id, entry_date, transaction_type, reference_no,
                receipt_qty, issue_qty, balance_qty,
                created_by_name, remarks
            ) VALUES (
                v_asset.id,
                COALESCE(v_asset.created_at::DATE, CURRENT_DATE),
                'opening',
                'INIT-' || v_asset.sap_code,
                0, 0, 0,
                v_user_name,
                'Opening balance - asset imported'
            );
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 7. VERIFICATION
-- ============================================================

SELECT '========================================' as separator;
SELECT '✅ BIN CARDS & AUDIT TRAIL SETUP COMPLETE' as status;
SELECT '========================================' as separator;

SELECT 'Tables created:' as info;
SELECT '  • bin_card_entries - Transaction history' as detail;
SELECT '  • audit_log - Complete audit trail' as detail;

SELECT 'Functions created:' as info;
SELECT '  • get_asset_balance(p_asset_id) - Get current balance' as detail;
SELECT '  • add_bin_card_entry(...) - Add transaction' as detail;
SELECT '  • log_audit(...) - Log changes' as detail;

SELECT 'Triggers created:' as info;
SELECT '  • assets_audit_trigger - Auto-log asset changes' as detail;

SELECT 'Initial data:' as info;
SELECT (SELECT COUNT(*) FROM public.bin_card_entries) || ' bin card entries created' as detail;
SELECT (SELECT COUNT(*) FROM public.audit_log) || ' audit log entries created' as detail;
