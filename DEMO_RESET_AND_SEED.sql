-- ============================================================================
-- DEMO RESET + SEED  —  client demo preparation
-- ============================================================================
-- ⚠⚠⚠  READ THIS FIRST  ⚠⚠⚠
--
-- PART 1 PERMANENTLY DELETES every business record (assets, employees,
-- licenses, locations, departments, vendors, companies, transactions,
-- bin cards, custom reminders, audit log). It does NOT delete login
-- accounts (auth.users / profiles / user_roles) so you won't be locked out.
--
-- STRONGLY RECOMMENDED: run this on a SEPARATE Supabase project/branch
-- used only for demos — NOT live production. If it's your only project,
-- export a backup first (Dashboard → Database → Backups).
--
-- PART 2 is SCHEMA-DEFENSIVE: it inserts only the columns that actually
-- exist in your live DB (your schema has drifted from the generated
-- types — e.g. vendors has no `code` column — so plain INSERTs fail;
-- this approach skips missing columns instead of erroring).
--
-- Run each PART in order, on its own, in the Supabase SQL Editor.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PART 1 — WIPE ALL BUSINESS DATA  (run on its own; irreversible)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'reminder_activity', 'custom_reminders', 'audit_log',
        'bin_card_entries', 'asset_transactions', 'import_runs',
        'assets', 'licenses', 'employees',
        'departments', 'locations', 'vendors', 'categories', 'companies'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name=t) THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', t);
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
            EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', t);
            RAISE NOTICE 'Cleared %', t;
        END IF;
    END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PART 2 — SEED REALISTIC DEMO DATA  (run after Part 1)
-- ════════════════════════════════════════════════════════════════════════════

-- Schema-defensive insert: only writes columns that exist in the live table.
CREATE OR REPLACE FUNCTION pg_temp.si(p_table TEXT, p_data JSONB)
RETURNS VOID AS $func$
DECLARE
  v_cols TEXT := '';
  v_vals TEXT := '';
  v_key  TEXT;
  v_val  JSONB;
BEGIN
  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=p_table AND column_name=v_key
    ) THEN
      IF v_cols <> '' THEN v_cols := v_cols || ', '; v_vals := v_vals || ', '; END IF;
      v_cols := v_cols || quote_ident(v_key);
      IF jsonb_typeof(v_val) = 'null' THEN
        v_vals := v_vals || 'NULL';
      ELSIF jsonb_typeof(v_val) IN ('boolean','number') THEN
        v_vals := v_vals || (v_val #>> '{}');
      ELSE
        v_vals := v_vals || quote_literal(v_val #>> '{}');
      END IF;
    END IF;
  END LOOP;
  IF v_cols = '' THEN RETURN; END IF;
  EXECUTE format('INSERT INTO public.%I (%s) VALUES (%s) ON CONFLICT DO NOTHING',
                 p_table, v_cols, v_vals);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'si(%): % — continuing', p_table, SQLERRM;
END;
$func$ LANGUAGE plpgsql;

DO $$
DECLARE
  -- relative dates so Alerts always has fresh content on demo day
  d_in  TEXT;  -- helper not needed; inline below
BEGIN
  -- ── Companies ──
  PERFORM pg_temp.si('companies', jsonb_build_object('id','11111111-0000-0000-0000-000000000001','name','Studio Infinito Pvt Ltd','code','TSI','address','Andheri East, Mumbai 400069','is_active',true));
  PERFORM pg_temp.si('companies', jsonb_build_object('id','11111111-0000-0000-0000-000000000002','name','Infinito Ventures LLP','code','IVL','address','Hinjewadi Phase 2, Pune 411057','is_active',true));

  -- ── Locations ──
  PERFORM pg_temp.si('locations', jsonb_build_object('id','22222222-0000-0000-0000-000000000001','name','Mumbai HQ — 3rd Floor','code','MUM-HQ','address','Andheri East, Mumbai','company_id','11111111-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('locations', jsonb_build_object('id','22222222-0000-0000-0000-000000000002','name','Mumbai Store Room','code','MUM-STR','address','Andheri East, Mumbai','company_id','11111111-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('locations', jsonb_build_object('id','22222222-0000-0000-0000-000000000003','name','Pune Branch Office','code','PUN-BR','address','Hinjewadi, Pune','company_id','11111111-0000-0000-0000-000000000002','is_active',true));
  PERFORM pg_temp.si('locations', jsonb_build_object('id','22222222-0000-0000-0000-000000000004','name','Remote / WFH Pool','code','REMOTE','address','Distributed','company_id','11111111-0000-0000-0000-000000000001','is_active',true));

  -- ── Departments ──
  PERFORM pg_temp.si('departments', jsonb_build_object('id','33333333-0000-0000-0000-000000000001','name','Information Technology','code','IT','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('departments', jsonb_build_object('id','33333333-0000-0000-0000-000000000002','name','Finance & Accounts','code','FIN','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('departments', jsonb_build_object('id','33333333-0000-0000-0000-000000000003','name','Human Resources','code','HR','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('departments', jsonb_build_object('id','33333333-0000-0000-0000-000000000004','name','Operations','code','OPS','company_id','11111111-0000-0000-0000-000000000002','location_id','22222222-0000-0000-0000-000000000002','is_active',true));
  PERFORM pg_temp.si('departments', jsonb_build_object('id','33333333-0000-0000-0000-000000000005','name','Sales & Marketing','code','SAL','company_id','11111111-0000-0000-0000-000000000002','location_id','22222222-0000-0000-0000-000000000003','is_active',true));
  PERFORM pg_temp.si('departments', jsonb_build_object('id','33333333-0000-0000-0000-000000000006','name','Support Desk','code','SUP','company_id','11111111-0000-0000-0000-000000000002','location_id','22222222-0000-0000-0000-000000000003','is_active',true));

  -- ── Vendors ── (no `code` column in your DB — helper just skips it)
  PERFORM pg_temp.si('vendors', jsonb_build_object('id','44444444-0000-0000-0000-000000000001','name','Dell Technologies','code','VEN-DELL','is_active',true));
  PERFORM pg_temp.si('vendors', jsonb_build_object('id','44444444-0000-0000-0000-000000000002','name','HP Enterprise','code','VEN-HP','is_active',true));
  PERFORM pg_temp.si('vendors', jsonb_build_object('id','44444444-0000-0000-0000-000000000003','name','Lenovo India','code','VEN-LNV','is_active',true));
  PERFORM pg_temp.si('vendors', jsonb_build_object('id','44444444-0000-0000-0000-000000000004','name','Redington (SAP Partner)','code','VEN-RED','is_active',true));
  PERFORM pg_temp.si('vendors', jsonb_build_object('id','44444444-0000-0000-0000-000000000005','name','Quick Heal Technologies','code','VEN-QH','is_active',true));
  PERFORM pg_temp.si('vendors', jsonb_build_object('id','44444444-0000-0000-0000-000000000006','name','Sify Technologies (ISP)','code','VEN-SIFY','is_active',true));

  -- ── Employees ──
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000001','name','Arjun Mehta','employee_code','EMP-1001','department','Information Technology','department_id','33333333-0000-0000-0000-000000000001','designation','IT Manager','email','arjun.mehta@demo.tsi','phone','9820011001','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000002','name','Sneha Kulkarni','employee_code','EMP-1002','department','Information Technology','department_id','33333333-0000-0000-0000-000000000001','designation','System Admin','email','sneha.k@demo.tsi','phone','9820011002','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000003','name','Rahul Verma','employee_code','EMP-1003','department','Finance & Accounts','department_id','33333333-0000-0000-0000-000000000002','designation','Finance Lead','email','rahul.v@demo.tsi','phone','9820011003','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000004','name','Priya Nair','employee_code','EMP-1004','department','Human Resources','department_id','33333333-0000-0000-0000-000000000003','designation','HR Manager','email','priya.n@demo.tsi','phone','9820011004','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000005','name','Imran Shaikh','employee_code','EMP-1005','department','Operations','department_id','33333333-0000-0000-0000-000000000004','designation','Ops Executive','email','imran.s@demo.tsi','phone','9820011005','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000002','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000006','name','Kavya Reddy','employee_code','EMP-1006','department','Sales & Marketing','department_id','33333333-0000-0000-0000-000000000005','designation','Sales Lead','email','kavya.r@demo.tsi','phone','9820011006','company_id','11111111-0000-0000-0000-000000000002','location_id','22222222-0000-0000-0000-000000000003','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000007','name','Deepak Joshi','employee_code','EMP-1007','department','Support Desk','department_id','33333333-0000-0000-0000-000000000006','designation','Support Engineer','email','deepak.j@demo.tsi','phone','9820011007','company_id','11111111-0000-0000-0000-000000000002','location_id','22222222-0000-0000-0000-000000000003','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000008','name','Anjali Gupta','employee_code','EMP-1008','department','Information Technology','department_id','33333333-0000-0000-0000-000000000001','designation','Network Engineer','email','anjali.g@demo.tsi','phone','9820011008','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000009','name','Vivek Sharma','employee_code','EMP-1009','department','Operations','department_id','33333333-0000-0000-0000-000000000004','designation','Ops Manager','email','vivek.s@demo.tsi','phone','9820011009','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000002','is_active',true));
  PERFORM pg_temp.si('employees', jsonb_build_object('id','55555555-0000-0000-0000-000000000010','name','Meera Iyer','employee_code','EMP-1010','department','Finance & Accounts','department_id','33333333-0000-0000-0000-000000000002','designation','Accountant','email','meera.i@demo.tsi','phone','9820011010','company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001','is_active',true));

  -- ── Assets ── (relative warranty dates so Expiry Alerts always has content)
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Dell Latitude 5440','sap_code','TSI-LAP-001','bin_card_no',1001,'asset_type','tangible','asset_subtype','laptop','status','allocated','brand','Dell','model','Latitude 5440','serial_number','DL5440-001','purchase_date','2024-06-15','purchase_cost',78000,'warranty_start','2024-06-15','warranty_end',(CURRENT_DATE + 400)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000001','department_id','33333333-0000-0000-0000-000000000001','vendor_id','44444444-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Dell Latitude 5440','sap_code','TSI-LAP-002','bin_card_no',1002,'asset_type','tangible','asset_subtype','laptop','status','allocated','brand','Dell','model','Latitude 5440','serial_number','DL5440-002','purchase_date','2024-06-15','purchase_cost',78000,'warranty_start','2024-06-15','warranty_end',(CURRENT_DATE + 400)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000002','department_id','33333333-0000-0000-0000-000000000001','vendor_id','44444444-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Lenovo ThinkPad E14','sap_code','TSI-LAP-003','bin_card_no',1003,'asset_type','tangible','asset_subtype','laptop','status','available','brand','Lenovo','model','ThinkPad E14','serial_number','LN-E14-003','purchase_date','2025-01-10','purchase_cost',65000,'warranty_start','2025-01-10','warranty_end',(CURRENT_DATE + 700)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000004','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','HP EliteDesk 800 G6','sap_code','TSI-DSK-001','bin_card_no',1004,'asset_type','tangible','asset_subtype','desktop','status','allocated','brand','HP','model','EliteDesk 800 G6','serial_number','HP800-001','purchase_date','2023-11-20','purchase_cost',55000,'warranty_start','2023-11-20','warranty_end',(CURRENT_DATE + 20)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000003','department_id','33333333-0000-0000-0000-000000000002','vendor_id','44444444-0000-0000-0000-000000000002','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','HP EliteDesk 800 G6','sap_code','TSI-DSK-002','bin_card_no',1005,'asset_type','tangible','asset_subtype','desktop','status','available','brand','HP','model','EliteDesk 800 G6','serial_number','HP800-002','purchase_date','2023-11-20','purchase_cost',55000,'warranty_start','2023-11-20','warranty_end',(CURRENT_DATE + 90)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000002','vendor_id','44444444-0000-0000-0000-000000000002','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Dell PowerEdge R750','sap_code','TSI-SRV-001','bin_card_no',1006,'asset_type','tangible','asset_subtype','server','status','allocated','brand','Dell','model','PowerEdge R750','serial_number','PE750-001','purchase_date','2023-03-05','purchase_cost',420000,'warranty_start','2023-03-05','warranty_end',(CURRENT_DATE + 650)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000008','department_id','33333333-0000-0000-0000-000000000001','vendor_id','44444444-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','QNAP TS-873A NAS','sap_code','TSI-NAS-001','bin_card_no',1007,'asset_type','tangible','asset_subtype','qnap','status','allocated','brand','QNAP','model','TS-873A','serial_number','QN873-001','purchase_date','2024-02-12','purchase_cost',180000,'warranty_start','2024-02-12','warranty_end',(CURRENT_DATE + 300)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000008','department_id','33333333-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Sophos XGS 2300 Firewall','sap_code','TSI-FW-001','bin_card_no',1008,'asset_type','tangible','asset_subtype','firewall','status','allocated','brand','Sophos','model','XGS 2300','serial_number','SPH-2300-01','purchase_date','2024-04-01','purchase_cost',210000,'warranty_start','2024-04-01','warranty_end',(CURRENT_DATE + 250)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000008','department_id','33333333-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Hikvision 8-Ch CCTV Setup','sap_code','TSI-CCTV-001','bin_card_no',1009,'asset_type','tangible','asset_subtype','cctv','status','allocated','brand','Hikvision','model','DS-7608','serial_number','HIK-7608-01','purchase_date','2023-08-18','purchase_cost',95000,'warranty_start','2023-08-18','warranty_end',(CURRENT_DATE + 12)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','department_id','33333333-0000-0000-0000-000000000004','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Cisco Catalyst 2960 Switch','sap_code','TSI-SW-001','bin_card_no',1010,'asset_type','tangible','asset_subtype','switch','status','allocated','brand','Cisco','model','Catalyst 2960','serial_number','CSC-2960-01','purchase_date','2024-05-22','purchase_cost',62000,'warranty_start','2024-05-22','warranty_end',(CURRENT_DATE + 500)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000008','department_id','33333333-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Samsung 27" Monitor','sap_code','TSI-MON-001','bin_card_no',1011,'asset_type','tangible','asset_subtype','monitor','status','allocated','brand','Samsung','model','LF27T','serial_number','SM-27T-001','purchase_date','2024-06-15','purchase_cost',14000,'warranty_start','2024-06-15','warranty_end',(CURRENT_DATE + 400)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','current_employee_id','55555555-0000-0000-0000-000000000001','department_id','33333333-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Canon imageRUNNER 2630','sap_code','TSI-PRN-001','bin_card_no',1012,'asset_type','tangible','asset_subtype','printer','status','under_maintenance','brand','Canon','model','iR 2630','serial_number','CN-2630-01','purchase_date','2022-09-30','purchase_cost',135000,'warranty_start','2022-09-30','warranty_end',(CURRENT_DATE - 30)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','department_id','33333333-0000-0000-0000-000000000002','vendor_id','44444444-0000-0000-0000-000000000002','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','iPhone 14 (Sales)','sap_code','TSI-MOB-001','bin_card_no',1013,'asset_type','tangible','asset_subtype','mobile_device','status','allocated','brand','Apple','model','iPhone 14','serial_number','APL-14-001','purchase_date','2024-07-01','purchase_cost',72000,'warranty_start','2024-07-01','warranty_end',(CURRENT_DATE + 30)::text,'company_id','11111111-0000-0000-0000-000000000002','current_location_id','22222222-0000-0000-0000-000000000003','current_employee_id','55555555-0000-0000-0000-000000000006','department_id','33333333-0000-0000-0000-000000000005','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Daikin 1.5T Split AC','sap_code','TSI-AC-001','bin_card_no',1014,'asset_type','tangible','asset_subtype','air_conditioner','status','allocated','brand','Daikin','model','FTKF50','serial_number','DK-50-001','purchase_date','2023-04-10','purchase_cost',48000,'warranty_start','2023-04-10','warranty_end',(CURRENT_DATE + 800)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','department_id','33333333-0000-0000-0000-000000000004','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','APC Smart-UPS 3KVA','sap_code','TSI-UPS-001','bin_card_no',1015,'asset_type','tangible','asset_subtype','ups','status','allocated','brand','APC','model','SMT3000I','serial_number','APC-3K-001','purchase_date','2023-06-20','purchase_cost',55000,'warranty_start','2023-06-20','warranty_end',(CURRENT_DATE + 60)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','department_id','33333333-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Logitech MeetUp ConfCam','sap_code','TSI-VC-001','bin_card_no',1016,'asset_type','tangible','asset_subtype','video_conferencing','status','available','brand','Logitech','model','MeetUp','serial_number','LG-MU-001','purchase_date','2024-09-05','purchase_cost',92000,'warranty_start','2024-09-05','warranty_end',(CURRENT_DATE + 550)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000001','is_deleted',false,'is_consumable',false));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','SanDisk 2TB Backup Drive','sap_code','TSI-BAK-001','bin_card_no',1017,'asset_type','tangible','asset_subtype','backup_drive','status','available','brand','SanDisk','model','Extreme 2TB','serial_number','SD-2TB-001','purchase_date','2025-02-01','purchase_cost',12000,'warranty_start','2025-02-01','warranty_end',(CURRENT_DATE + 300)::text,'company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000002','is_deleted',false,'is_consumable',true));
  PERFORM pg_temp.si('assets', jsonb_build_object('name','Old Dell Vostro (scrap)','sap_code','TSI-LAP-099','bin_card_no',1018,'asset_type','tangible','asset_subtype','laptop','status','scrapped','brand','Dell','model','Vostro 3400','serial_number','DL-V34-099','purchase_date','2019-01-15','purchase_cost',42000,'warranty_start','2019-01-15','warranty_end','2022-01-15','company_id','11111111-0000-0000-0000-000000000001','current_location_id','22222222-0000-0000-0000-000000000002','is_deleted',false,'is_consumable',false));

  -- ── Licenses ── (some expiring soon → Alerts demo)
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','Microsoft 365 Business','product_name','Microsoft 365 Business Premium','license_key','M365-XXXX-AAAA','status','active','validity_start','2024-04-01','validity_end',(CURRENT_DATE + 40)::text,'max_users',25,'current_users',18,'company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001'));
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','SAP Business One','product_name','SAP B1 Professional','license_key','SAPB1-PROF-001','status','active','validity_start','2024-01-01','validity_end',(CURRENT_DATE + 120)::text,'max_users',10,'current_users',7,'company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001'));
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','Antivirus','product_name','Quick Heal Total Security','license_key','QH-TS-2025-001','status','active','validity_start','2024-09-15','validity_end',(CURRENT_DATE + 8)::text,'max_users',50,'current_users',42,'company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001'));
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','Gmail Workspace','product_name','Google Workspace Business','license_key','GW-BIZ-001','status','active','validity_start','2024-03-01','validity_end',(CURRENT_DATE + 200)::text,'max_users',30,'current_users',22,'company_id','11111111-0000-0000-0000-000000000001'));
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','RDP / TS Plus','product_name','TSplus Enterprise 25U','license_key','TSPLUS-ENT-25','status','active','validity_start','2024-06-01','validity_end',(CURRENT_DATE - 3)::text,'max_users',25,'current_users',25,'company_id','11111111-0000-0000-0000-000000000002','location_id','22222222-0000-0000-0000-000000000003'));
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','SSL Certificate','product_name','Sectigo Wildcard SSL','license_key','SSL-WC-TSI-01','status','active','validity_start','2024-05-10','validity_end',(CURRENT_DATE + 25)::text,'max_users',1,'current_users',1,'company_id','11111111-0000-0000-0000-000000000001'));
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','Cosec Biometric','product_name','Matrix COSEC License','license_key','COSEC-LIC-001','status','active','validity_start','2023-12-01','validity_end',(CURRENT_DATE + 300)::text,'max_users',5,'current_users',4,'company_id','11111111-0000-0000-0000-000000000001','location_id','22222222-0000-0000-0000-000000000001'));
  PERFORM pg_temp.si('licenses', jsonb_build_object('license_type','Domain','product_name','thestudioinfinito.com (GoDaddy)','license_key','DOMAIN-TSI-COM','status','active','validity_start','2024-08-01','validity_end',(CURRENT_DATE + 60)::text,'max_users',1,'current_users',1,'company_id','11111111-0000-0000-0000-000000000001'));

  -- ── Custom reminders ── (only if SETUP_CUSTOM_REMINDERS.sql was run)
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='custom_reminders') THEN
    PERFORM pg_temp.si('custom_reminders', jsonb_build_object('title','Office fire insurance renewal','reminder_type','insurance','expiry_date',(CURRENT_DATE + 18)::text,'notes','TATA AIG — contact Mr. Sharma','reference_code','POL-2025-9821','is_recurring',true,'recurrence_months',12));
    PERFORM pg_temp.si('custom_reminders', jsonb_build_object('title','Annual IT security audit','reminder_type','audit','expiry_date',(CURRENT_DATE + 5)::text,'notes','External auditor visit; prep access logs','reference_code','AUDIT-Q2-2026','is_recurring',true,'recurrence_months',12));
    PERFORM pg_temp.si('custom_reminders', jsonb_build_object('title','AWS account billing review','reminder_type','subscription','expiry_date',(CURRENT_DATE + 33)::text,'notes','Check reserved instances before renewal','reference_code','AWS-TSI-MAIN','is_recurring',true,'recurrence_months',1));
    PERFORM pg_temp.si('custom_reminders', jsonb_build_object('title','Lift / elevator AMC','reminder_type','amc','expiry_date',(CURRENT_DATE - 2)::text,'notes','Johnson Lifts — OVERDUE, call vendor','reference_code','AMC-LIFT-01','is_recurring',true,'recurrence_months',12));
    PERFORM pg_temp.si('custom_reminders', jsonb_build_object('title','Trademark renewal — TSI logo','reminder_type','other','expiry_date',(CURRENT_DATE + 240)::text,'notes','IP attorney: Desai & Co.','reference_code','TM-TSI-LOGO','is_recurring',true,'recurrence_months',120));
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PART 3 — DEMO LOGIN ACCOUNTS
-- ════════════════════════════════════════════════════════════════════════════
-- RECOMMENDED: Supabase Dashboard → Authentication → Users → "Add user"
--   (tick "Auto Confirm User"):
--     demo.admin@tsi.demo  /  Demo@Admin1     (admin)
--     demo.it@tsi.demo     /  Demo@IT1234     (it)
--     demo.hr@tsi.demo     /  Demo@HR1234     (hr)
--     demo.view@tsi.demo   /  Demo@View123    (viewer)
-- THEN run this block to approve them + assign roles. Re-runnable.
DO $$
DECLARE
  acct RECORD;
BEGIN
  FOR acct IN SELECT * FROM (VALUES
      ('demo.admin@tsi.demo','Demo Admin','admin'),
      ('demo.it@tsi.demo','Demo IT Staff','it'),
      ('demo.hr@tsi.demo','Demo HR Manager','hr'),
      ('demo.view@tsi.demo','Demo Viewer','viewer')
  ) AS v(email, full_name, role) LOOP
    INSERT INTO public.profiles (id, full_name, approval_status, approved_at)
    SELECT u.id, acct.full_name, 'approved', now()
    FROM auth.users u WHERE u.email = acct.email
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name, approval_status='approved', approved_at=now();

    INSERT INTO public.user_roles (user_id, role)
    SELECT u.id, acct.role::public.app_role
    FROM auth.users u WHERE u.email = acct.email
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

-- ── ADVANCED (only if you cannot use the Dashboard) ─────────────────────────
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- DO $$
-- DECLARE acct RECORD; uid UUID;
-- BEGIN
--   FOR acct IN SELECT * FROM (VALUES
--       ('demo.admin@tsi.demo','Demo@Admin1'),('demo.it@tsi.demo','Demo@IT1234'),
--       ('demo.hr@tsi.demo','Demo@HR1234'),('demo.view@tsi.demo','Demo@View123')
--   ) AS v(email,pw) LOOP
--     IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email=acct.email) THEN
--       uid := gen_random_uuid();
--       INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,
--         email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)
--       VALUES ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',
--         acct.email,crypt(acct.pw,gen_salt('bf')),now(),now(),now(),
--         '{"provider":"email","providers":["email"]}','{}');
--       INSERT INTO auth.identities (id,user_id,identity_data,provider,provider_id,
--         last_sign_in_at,created_at,updated_at)
--       VALUES (gen_random_uuid(),uid,
--         jsonb_build_object('sub',uid::text,'email',acct.email),
--         'email',uid::text,now(),now(),now());
--     END IF;
--   END LOOP;
-- END $$;
-- -- then re-run the PART 3 profile/role block above.

-- ============================================================================
-- VERIFY
--   SELECT (SELECT count(*) FROM assets) AS assets,
--          (SELECT count(*) FROM employees) AS employees,
--          (SELECT count(*) FROM licenses) AS licenses,
--          (SELECT count(*) FROM companies) AS companies;
--   SELECT u.email, p.approval_status, r.role
--     FROM auth.users u
--     LEFT JOIN public.profiles p ON p.id=u.id
--     LEFT JOIN public.user_roles r ON r.user_id=u.id
--    WHERE u.email LIKE 'demo.%@tsi.demo';
-- ============================================================================
