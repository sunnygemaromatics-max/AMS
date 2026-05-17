-- ============================================================================
-- DEMO RESET + SEED  —  client demo preparation
-- ============================================================================
-- ⚠⚠⚠  READ THIS FIRST  ⚠⚠⚠
--
-- STEP 1 of this script PERMANENTLY DELETES every business record:
-- assets, employees, licenses, locations, departments, vendors,
-- companies, transactions, bin cards, custom reminders, audit log.
--
-- It does NOT delete login accounts (auth.users / profiles / user_roles)
-- so you will not be locked out.
--
-- STRONGLY RECOMMENDED: do this on a SEPARATE Supabase project (or a
-- Supabase branch) used only for demos — NOT the live production project.
-- If this IS your only project, take an export first:
--   Supabase Dashboard → Database → Backups  (or pg_dump)
--
-- Run the parts in order, each on its own, in the Supabase SQL Editor.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PART 1 — WIPE ALL BUSINESS DATA  (run on its own; irreversible)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    t TEXT;
    -- child → parent order so CASCADE/FK never blocks us
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
            -- legacy/broken audit triggers must not abort the wipe
            EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', t);
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
            EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', t);
            RAISE NOTICE 'Cleared %', t;
        END IF;
    END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PART 2 — SEED REALISTIC DEMO DATA  (run after Part 1)
-- Deterministic UUIDs so child rows can reference parents without lookups.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Companies ──
INSERT INTO public.companies (id, name, code, address, is_active) VALUES
 ('11111111-0000-0000-0000-000000000001','Studio Infinito Pvt Ltd','TSI','Andheri East, Mumbai 400069', true),
 ('11111111-0000-0000-0000-000000000002','Infinito Ventures LLP','IVL','Hinjewadi Phase 2, Pune 411057', true);

-- ── Locations ──
INSERT INTO public.locations (id, name, code, address, company_id, is_active) VALUES
 ('22222222-0000-0000-0000-000000000001','Mumbai HQ — 3rd Floor','MUM-HQ','Andheri East, Mumbai','11111111-0000-0000-0000-000000000001', true),
 ('22222222-0000-0000-0000-000000000002','Mumbai Store Room','MUM-STR','Andheri East, Mumbai','11111111-0000-0000-0000-000000000001', true),
 ('22222222-0000-0000-0000-000000000003','Pune Branch Office','PUN-BR','Hinjewadi, Pune','11111111-0000-0000-0000-000000000002', true),
 ('22222222-0000-0000-0000-000000000004','Remote / WFH Pool','REMOTE','Distributed','11111111-0000-0000-0000-000000000001', true);

-- ── Departments ──
INSERT INTO public.departments (id, name, code, company_id, location_id, is_active) VALUES
 ('33333333-0000-0000-0000-000000000001','Information Technology','IT','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('33333333-0000-0000-0000-000000000002','Finance & Accounts','FIN','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('33333333-0000-0000-0000-000000000003','Human Resources','HR','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('33333333-0000-0000-0000-000000000004','Operations','OPS','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002', true),
 ('33333333-0000-0000-0000-000000000005','Sales & Marketing','SAL','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003', true),
 ('33333333-0000-0000-0000-000000000006','Support Desk','SUP','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003', true);

-- ── Vendors ──
INSERT INTO public.vendors (id, name, code, is_active) VALUES
 ('44444444-0000-0000-0000-000000000001','Dell Technologies','VEN-DELL', true),
 ('44444444-0000-0000-0000-000000000002','HP Enterprise','VEN-HP', true),
 ('44444444-0000-0000-0000-000000000003','Lenovo India','VEN-LNV', true),
 ('44444444-0000-0000-0000-000000000004','Redington (SAP Partner)','VEN-RED', true),
 ('44444444-0000-0000-0000-000000000005','Quick Heal Technologies','VEN-QH', true),
 ('44444444-0000-0000-0000-000000000006','Sify Technologies (ISP)','VEN-SIFY', true);

-- ── Employees ──
INSERT INTO public.employees (id, name, employee_code, department, department_id, designation, email, phone, company_id, location_id, is_active) VALUES
 ('55555555-0000-0000-0000-000000000001','Arjun Mehta','EMP-1001','Information Technology','33333333-0000-0000-0000-000000000001','IT Manager','arjun.mehta@demo.tsi','9820011001','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('55555555-0000-0000-0000-000000000002','Sneha Kulkarni','EMP-1002','Information Technology','33333333-0000-0000-0000-000000000001','System Admin','sneha.k@demo.tsi','9820011002','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('55555555-0000-0000-0000-000000000003','Rahul Verma','EMP-1003','Finance & Accounts','33333333-0000-0000-0000-000000000002','Finance Lead','rahul.v@demo.tsi','9820011003','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('55555555-0000-0000-0000-000000000004','Priya Nair','EMP-1004','Human Resources','33333333-0000-0000-0000-000000000003','HR Manager','priya.n@demo.tsi','9820011004','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('55555555-0000-0000-0000-000000000005','Imran Shaikh','EMP-1005','Operations','33333333-0000-0000-0000-000000000004','Ops Executive','imran.s@demo.tsi','9820011005','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002', true),
 ('55555555-0000-0000-0000-000000000006','Kavya Reddy','EMP-1006','Sales & Marketing','33333333-0000-0000-0000-000000000005','Sales Lead','kavya.r@demo.tsi','9820011006','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003', true),
 ('55555555-0000-0000-0000-000000000007','Deepak Joshi','EMP-1007','Support Desk','33333333-0000-0000-0000-000000000006','Support Engineer','deepak.j@demo.tsi','9820011007','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003', true),
 ('55555555-0000-0000-0000-000000000008','Anjali Gupta','EMP-1008','Information Technology','33333333-0000-0000-0000-000000000001','Network Engineer','anjali.g@demo.tsi','9820011008','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true),
 ('55555555-0000-0000-0000-000000000009','Vivek Sharma','EMP-1009','Operations','33333333-0000-0000-0000-000000000004','Ops Manager','vivek.s@demo.tsi','9820011009','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002', true),
 ('55555555-0000-0000-0000-000000000010','Meera Iyer','EMP-1010','Finance & Accounts','33333333-0000-0000-0000-000000000002','Accountant','meera.i@demo.tsi','9820011010','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', true);

-- ── Assets ──  (sap_code, bin_card_no unique; mix of statuses + types)
INSERT INTO public.assets
 (id, name, sap_code, bin_card_no, asset_type, asset_subtype, status,
  brand, model, serial_number, purchase_date, purchase_cost,
  warranty_start, warranty_end, company_id, current_location_id,
  current_employee_id, department_id, vendor_id, is_deleted, is_consumable) VALUES
 (gen_random_uuid(),'Dell Latitude 5440','TSI-LAP-001',1001,'tangible','laptop','allocated','Dell','Latitude 5440','DL5440-001','2024-06-15',78000,'2024-06-15','2027-06-15','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',false,false),
 (gen_random_uuid(),'Dell Latitude 5440','TSI-LAP-002',1002,'tangible','laptop','allocated','Dell','Latitude 5440','DL5440-002','2024-06-15',78000,'2024-06-15','2027-06-15','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',false,false),
 (gen_random_uuid(),'Lenovo ThinkPad E14','TSI-LAP-003',1003,'tangible','laptop','available','Lenovo','ThinkPad E14','LN-E14-003','2025-01-10',65000,'2025-01-10','2028-01-10','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000004',NULL,NULL,'44444444-0000-0000-0000-000000000003',false,false),
 (gen_random_uuid(),'HP EliteDesk 800 G6','TSI-DSK-001',1004,'tangible','desktop','allocated','HP','EliteDesk 800 G6','HP800-001','2023-11-20',55000,'2023-11-20','2026-11-20','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002',false,false),
 (gen_random_uuid(),'HP EliteDesk 800 G6','TSI-DSK-002',1005,'tangible','desktop','available','HP','EliteDesk 800 G6','HP800-002','2023-11-20',55000,'2023-11-20','2026-11-20','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002',NULL,NULL,'44444444-0000-0000-0000-000000000002',false,false),
 (gen_random_uuid(),'Dell PowerEdge R750','TSI-SRV-001',1006,'tangible','server','allocated','Dell','PowerEdge R750','PE750-001','2023-03-05',420000,'2023-03-05','2028-03-05','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000008','33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',false,false),
 (gen_random_uuid(),'QNAP TS-873A NAS','TSI-NAS-001',1007,'tangible','qnap','allocated','QNAP','TS-873A','QN873-001','2024-02-12',180000,'2024-02-12','2027-02-12','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000008','33333333-0000-0000-0000-000000000001',NULL,false,false),
 (gen_random_uuid(),'Sophos XGS 2300 Firewall','TSI-FW-001',1008,'tangible','firewall','allocated','Sophos','XGS 2300','SPH-2300-01','2024-04-01',210000,'2024-04-01','2027-04-01','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000008','33333333-0000-0000-0000-000000000001',NULL,false,false),
 (gen_random_uuid(),'Hikvision 8-Ch CCTV Setup','TSI-CCTV-001',1009,'tangible','cctv','allocated','Hikvision','DS-7608','HIK-7608-01','2023-08-18',95000,'2023-08-18','2026-08-18','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL,'33333333-0000-0000-0000-000000000004',NULL,false,false),
 (gen_random_uuid(),'Cisco Catalyst 2960 Switch','TSI-SW-001',1010,'tangible','switch','allocated','Cisco','Catalyst 2960','CSC-2960-01','2024-05-22',62000,'2024-05-22','2027-05-22','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000008','33333333-0000-0000-0000-000000000001',NULL,false,false),
 (gen_random_uuid(),'Samsung 27" Monitor','TSI-MON-001',1011,'tangible','monitor','allocated','Samsung','LF27T','SM-27T-001','2024-06-15',14000,'2024-06-15','2027-06-15','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001',NULL,false,false),
 (gen_random_uuid(),'Canon imageRUNNER 2630','TSI-PRN-001',1012,'tangible','printer','under_maintenance','Canon','iR 2630','CN-2630-01','2022-09-30',135000,'2022-09-30','2025-09-30','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL,'33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002',false,false),
 (gen_random_uuid(),'iPhone 14 (Sales)','TSI-MOB-001',1013,'tangible','mobile_device','allocated','Apple','iPhone 14','APL-14-001','2024-07-01',72000,'2024-07-01','2025-07-01','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000006','33333333-0000-0000-0000-000000000005',NULL,false,false),
 (gen_random_uuid(),'Daikin 1.5T Split AC','TSI-AC-001',1014,'tangible','air_conditioner','allocated','Daikin','FTKF50','DK-50-001','2023-04-10',48000,'2023-04-10','2028-04-10','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL,'33333333-0000-0000-0000-000000000004',NULL,false,false),
 (gen_random_uuid(),'APC Smart-UPS 3KVA','TSI-UPS-001',1015,'tangible','ups','allocated','APC','SMT3000I','APC-3K-001','2023-06-20',55000,'2023-06-20','2026-06-20','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL,'33333333-0000-0000-0000-000000000001',NULL,false,false),
 (gen_random_uuid(),'Logitech MeetUp ConfCam','TSI-VC-001',1016,'tangible','video_conferencing','available','Logitech','MeetUp','LG-MU-001','2024-09-05',92000,'2024-09-05','2027-09-05','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL,NULL,NULL,false,false),
 (gen_random_uuid(),'SanDisk 2TB Backup Drive','TSI-BAK-001',1017,'tangible','backup_drive','available','SanDisk','Extreme 2TB','SD-2TB-001','2025-02-01',12000,'2025-02-01','2027-02-01','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002',NULL,NULL,NULL,false,true),
 (gen_random_uuid(),'Old Dell Vostro (scrap)','TSI-LAP-099',1018,'tangible','laptop','scrapped','Dell','Vostro 3400','DL-V34-099','2019-01-15',42000,'2019-01-15','2022-01-15','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002',NULL,NULL,NULL,false,false);

-- ── Licenses ──  (some expiring soon to populate Alerts)
INSERT INTO public.licenses
 (id, license_type, product_name, license_key, status,
  validity_start, validity_end, max_users, current_users,
  company_id, location_id, assigned_employee_id) VALUES
 (gen_random_uuid(),'Microsoft 365 Business','Microsoft 365 Business Premium','M365-XXXX-AAAA','active','2024-04-01', CURRENT_DATE + 40, 25, 18,'11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL),
 (gen_random_uuid(),'SAP Business One','SAP B1 Professional','SAPB1-PROF-001','active','2024-01-01', CURRENT_DATE + 120, 10, 7,'11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL),
 (gen_random_uuid(),'Antivirus','Quick Heal Total Security','QH-TS-2025-001','active','2024-09-15', CURRENT_DATE + 8, 50, 42,'11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL),
 (gen_random_uuid(),'Gmail Workspace','Google Workspace Business','GW-BIZ-001','active','2024-03-01', CURRENT_DATE + 200, 30, 22,'11111111-0000-0000-0000-000000000001',NULL,NULL),
 (gen_random_uuid(),'RDP / TS Plus','TSplus Enterprise 25U','TSPLUS-ENT-25','active','2024-06-01', CURRENT_DATE - 3, 25, 25,'11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003',NULL),
 (gen_random_uuid(),'SSL Certificate','Sectigo Wildcard SSL','SSL-WC-TSI-01','active','2024-05-10', CURRENT_DATE + 25, 1, 1,'11111111-0000-0000-0000-000000000001',NULL,NULL),
 (gen_random_uuid(),'Cosec Biometric','Matrix COSEC License','COSEC-LIC-001','active','2023-12-01', CURRENT_DATE + 300, 5, 4,'11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',NULL),
 (gen_random_uuid(),'Domain','thestudioinfinito.com (GoDaddy)','DOMAIN-TSI-COM','active','2024-08-01', CURRENT_DATE + 60, 1, 1,'11111111-0000-0000-0000-000000000001',NULL,NULL);

-- ── Custom reminders ── (only if SETUP_CUSTOM_REMINDERS.sql was run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='custom_reminders') THEN
    INSERT INTO public.custom_reminders (title, reminder_type, expiry_date, notes, reference_code, is_recurring, recurrence_months) VALUES
     ('Office fire insurance renewal','insurance', CURRENT_DATE + 18,'TATA AIG — contact Mr. Sharma','POL-2025-9821', true, 12),
     ('Annual IT security audit','audit', CURRENT_DATE + 5,'External auditor visit; prep access logs','AUDIT-Q2-2026', true, 12),
     ('AWS account billing review','subscription', CURRENT_DATE + 33,'Check reserved instances before renewal','AWS-TSI-MAIN', true, 1),
     ('Lift / elevator AMC','amc', CURRENT_DATE - 2,'Johnson Lifts — OVERDUE, call vendor','AMC-LIFT-01', true, 12),
     ('Trademark renewal — TSI logo','other', CURRENT_DATE + 240,'IP attorney: Desai & Co.','TM-TSI-LOGO', true, 120);
  END IF;
END $$;

-- ============================================================================
-- PART 3 — DEMO LOGIN ACCOUNTS
-- ============================================================================
-- RECOMMENDED (most reliable): create the users in the Supabase Dashboard
--   → Authentication → Users → "Add user"
--   Tick "Auto Confirm User". Use these:
--
--     demo.admin@tsi.demo     /  Demo@Admin1     (role: admin)
--     demo.it@tsi.demo        /  Demo@IT1234     (role: it)
--     demo.hr@tsi.demo        /  Demo@HR1234     (role: hr)
--     demo.view@tsi.demo      /  Demo@View123    (role: viewer)
--
-- THEN run the block below — it links each to a profile, marks them
-- approved, and assigns the role. Re-runnable.
-- ============================================================================
DO $$
DECLARE
  acct RECORD;
BEGIN
  FOR acct IN SELECT * FROM (VALUES
      ('demo.admin@tsi.demo','Demo Admin','admin'),
      ('demo.it@tsi.demo','Demo IT Staff','it'),
      ('demo.hr@tsi.demo','Demo HR Manager','hr'),
      ('demo.view@tsi.demo','Demo Viewer','viewer')
  ) AS v(email, full_name, role)
  LOOP
    -- Profile (approved so they can use the app immediately)
    INSERT INTO public.profiles (id, full_name, approval_status, approved_at)
    SELECT u.id, acct.full_name, 'approved', now()
    FROM auth.users u WHERE u.email = acct.email
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          approval_status = 'approved',
          approved_at = now();

    -- Role
    INSERT INTO public.user_roles (user_id, role)
    SELECT u.id, acct.role::public.app_role
    FROM auth.users u WHERE u.email = acct.email
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

-- ── ADVANCED (only if you cannot use the Dashboard) ─────────────────────────
-- Creates the 4 auth users purely in SQL. Needs pgcrypto (Supabase has it).
-- If the Dashboard method worked, SKIP this block.
--
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- DO $$
-- DECLARE
--   acct RECORD; uid UUID;
-- BEGIN
--   FOR acct IN SELECT * FROM (VALUES
--       ('demo.admin@tsi.demo','Demo@Admin1'),
--       ('demo.it@tsi.demo','Demo@IT1234'),
--       ('demo.hr@tsi.demo','Demo@HR1234'),
--       ('demo.view@tsi.demo','Demo@View123')
--   ) AS v(email, pw) LOOP
--     IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = acct.email) THEN
--       uid := gen_random_uuid();
--       INSERT INTO auth.users (instance_id, id, aud, role, email,
--         encrypted_password, email_confirmed_at, created_at, updated_at,
--         raw_app_meta_data, raw_user_meta_data)
--       VALUES ('00000000-0000-0000-0000-000000000000', uid,
--         'authenticated','authenticated', acct.email,
--         crypt(acct.pw, gen_salt('bf')), now(), now(), now(),
--         '{"provider":"email","providers":["email"]}', '{}');
--       INSERT INTO auth.identities (id, user_id, identity_data, provider,
--         provider_id, last_sign_in_at, created_at, updated_at)
--       VALUES (gen_random_uuid(), uid,
--         jsonb_build_object('sub', uid::text, 'email', acct.email),
--         'email', uid::text, now(), now(), now());
--     END IF;
--   END LOOP;
-- END $$;
-- -- then re-run the PART 3 profile/role block above.

-- ============================================================================
-- VERIFY
--   SELECT (SELECT count(*) FROM assets)    AS assets,
--          (SELECT count(*) FROM employees) AS employees,
--          (SELECT count(*) FROM licenses)  AS licenses;
--   SELECT u.email, p.approval_status, r.role
--     FROM auth.users u
--     LEFT JOIN public.profiles p ON p.id = u.id
--     LEFT JOIN public.user_roles r ON r.user_id = u.id
--    WHERE u.email LIKE 'demo.%@tsi.demo';
-- ============================================================================
