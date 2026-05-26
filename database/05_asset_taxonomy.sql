-- ============================================================
-- ASSET TAXONOMY — Phase 5
-- Aligns the system with the official asset classification:
--   1. Fixed Asset → Intangible Asset (Licenses)
--   2. Tangible Asset
--   3. Allied Asset
--   4. Equipment
--
-- Run in the Supabase SQL Editor. SAFE & idempotent:
--   - ALTER TYPE ... ADD VALUE IF NOT EXISTS  (additive, non-destructive,
--     never removes/renames existing values, never touches existing rows)
--   - Category seed uses INSERT ... WHERE NOT EXISTS (re-runnable)
--   - USER triggers disabled around the seed so any legacy/broken audit
--     trigger (see SETUP_MULTI_TENANT.sql notes) can't abort it
--
-- ⚠ RUN PART 1 FIRST, then PART 2 as a SEPARATE run.
--    Postgres will not let a brand-new enum value be *used* in the same
--    transaction it was *added*. Running Part 1, waiting for success,
--    then running Part 2 avoids that entirely.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART 1 — add the missing asset_subtype enum values
-- (Run this block on its own first.)
-- ════════════════════════════════════════════════════════════

-- Intangible / Licenses
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'ms_office_license';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'gmail_license';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'rdp_license';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'cosec_license';

-- Tangible
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'qnap';

-- Allied
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'backup_drive';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'firewall';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'pen_drive';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'cctv';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'video_conferencing';

-- Equipment
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'television';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'air_conditioner';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'water_purifier';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'pressure_pump';

-- (Existing values kept as-is: laptop, desktop, printer, scanner, server,
--  mobile_device, tablet, antivirus, email_account, sap_license,
--  software_license, networking, ups, other)


-- ════════════════════════════════════════════════════════════
-- PART 2 — seed the categories table with the full 2-level
-- taxonomy (parent class → child item). Run AFTER Part 1 succeeds.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
    has_tbl BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'categories'
    ) INTO has_tbl;
    IF NOT has_tbl THEN
        RAISE NOTICE 'categories table not found — skipping seed.';
        RETURN;
    END IF;

    -- Suspend user triggers so a broken legacy audit trigger can't abort us
    EXECUTE 'ALTER TABLE public.categories DISABLE TRIGGER USER';

    BEGIN
        -- ── Parent classes ──────────────────────────────────────────
        INSERT INTO public.categories (name, code, asset_type, is_consumable)
        SELECT 'Fixed Asset — Intangible', 'CLS-INTANGIBLE', 'intangible', false
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE code = 'CLS-INTANGIBLE');

        INSERT INTO public.categories (name, code, asset_type, is_consumable)
        SELECT 'Tangible Asset', 'CLS-TANGIBLE', 'tangible', false
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE code = 'CLS-TANGIBLE');

        INSERT INTO public.categories (name, code, asset_type, is_consumable)
        SELECT 'Allied Asset', 'CLS-ALLIED', 'tangible', false
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE code = 'CLS-ALLIED');

        INSERT INTO public.categories (name, code, asset_type, is_consumable)
        SELECT 'Equipment', 'CLS-EQUIPMENT', 'tangible', false
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE code = 'CLS-EQUIPMENT');

        -- ── Children: Intangible / Licenses ─────────────────────────
        INSERT INTO public.categories (name, code, asset_type, is_consumable, parent_id)
        SELECT v.name, v.code, 'intangible', false,
               (SELECT id FROM public.categories WHERE code = 'CLS-INTANGIBLE')
        FROM (VALUES
            ('Microsoft Office License', 'LIC-MSOFFICE'),
            ('SAP License (with Authorisation)', 'LIC-SAP'),
            ('Gmail License', 'LIC-GMAIL'),
            ('Antivirus License', 'LIC-ANTIVIRUS'),
            ('RDP License', 'LIC-RDP'),
            ('Cosec License (Biometric)', 'LIC-COSEC')
        ) AS v(name, code)
        WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.code = v.code);

        -- ── Children: Tangible ──────────────────────────────────────
        INSERT INTO public.categories (name, code, asset_type, is_consumable, parent_id)
        SELECT v.name, v.code, 'tangible', false,
               (SELECT id FROM public.categories WHERE code = 'CLS-TANGIBLE')
        FROM (VALUES
            ('Server Asset', 'TNG-SERVER'),
            ('Q-NAP Asset', 'TNG-QNAP'),
            ('Laptop', 'TNG-LAPTOP'),
            ('Desktop', 'TNG-DESKTOP'),
            ('Printer', 'TNG-PRINTER')
        ) AS v(name, code)
        WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.code = v.code);

        -- ── Children: Allied ────────────────────────────────────────
        INSERT INTO public.categories (name, code, asset_type, is_consumable, parent_id)
        SELECT v.name, v.code, 'tangible', false,
               (SELECT id FROM public.categories WHERE code = 'CLS-ALLIED')
        FROM (VALUES
            ('Backup & Additional Drives', 'ALD-BACKUP'),
            ('Firewall', 'ALD-FIREWALL'),
            ('Pen Drives', 'ALD-PENDRIVE'),
            ('CCTV Setup', 'ALD-CCTV'),
            ('Video Conferencing Device', 'ALD-VIDEOCONF')
        ) AS v(name, code)
        WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.code = v.code);

        -- ── Children: Equipment ─────────────────────────────────────
        INSERT INTO public.categories (name, code, asset_type, is_consumable, parent_id)
        SELECT v.name, v.code, 'tangible', false,
               (SELECT id FROM public.categories WHERE code = 'CLS-EQUIPMENT')
        FROM (VALUES
            ('Television', 'EQP-TV'),
            ('Air Conditioner', 'EQP-AC'),
            ('Water Purifier', 'EQP-WATER'),
            ('Pressure Pump', 'EQP-PUMP')
        ) AS v(name, code)
        WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.code = v.code);

    EXCEPTION WHEN OTHERS THEN
        EXECUTE 'ALTER TABLE public.categories ENABLE TRIGGER USER';
        RAISE;
    END;

    EXECUTE 'ALTER TABLE public.categories ENABLE TRIGGER USER';
END $$;

-- ════════════════════════════════════════════════════════════
-- PART 3 — EXTENDED IT TAXONOMY (standard ITAM coverage)
-- Researched against common IT Asset Management taxonomies
-- (hardware / software / cloud / digital / infrastructure).
-- Run this block ON ITS OWN, AFTER Part 1 succeeds (same
-- "enum value can't be used in the txn it was added" rule).
-- 100% additive — nothing existing is touched.
-- ════════════════════════════════════════════════════════════

-- ── Hardware / Infrastructure ──
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'monitor';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'router';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'switch';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'access_point';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'modem';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'docking_station';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'projector';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'peripheral';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'biometric_device';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'ip_phone';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'rack';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'inverter';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'sim_card';

-- ── Software / Cloud / Digital ──
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'os_license';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'database_license';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'cloud_subscription';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'saas_subscription';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'ssl_certificate';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'domain';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'vpn_license';
ALTER TYPE public.asset_subtype ADD VALUE IF NOT EXISTS 'internet_connection';


-- ════════════════════════════════════════════════════════════
-- PART 4 — seed categories for the extended IT taxonomy.
-- Run AFTER Part 3 succeeds. Idempotent, trigger-safe.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
    has_tbl BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'categories'
    ) INTO has_tbl;
    IF NOT has_tbl THEN
        RAISE NOTICE 'categories table not found — skipping extended seed.';
        RETURN;
    END IF;

    EXECUTE 'ALTER TABLE public.categories DISABLE TRIGGER USER';

    BEGIN
        -- New parent class for everything that isn't in the 4 core PDF classes
        INSERT INTO public.categories (name, code, asset_type, is_consumable)
        SELECT 'Additional IT & Infrastructure', 'CLS-IT-EXT', 'tangible', false
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE code = 'CLS-IT-EXT');

        -- Hardware / Infrastructure children
        INSERT INTO public.categories (name, code, asset_type, is_consumable, parent_id)
        SELECT v.name, v.code, 'tangible', false,
               (SELECT id FROM public.categories WHERE code = 'CLS-IT-EXT')
        FROM (VALUES
            ('Monitor / Display', 'EXT-MONITOR'),
            ('Router', 'EXT-ROUTER'),
            ('Network Switch', 'EXT-SWITCH'),
            ('Access Point / WiFi', 'EXT-AP'),
            ('Modem', 'EXT-MODEM'),
            ('Docking Station', 'EXT-DOCK'),
            ('Projector', 'EXT-PROJECTOR'),
            ('Peripheral (KB/Mouse/Webcam)', 'EXT-PERIPHERAL'),
            ('Biometric Device', 'EXT-BIOMETRIC'),
            ('IP Phone / EPABX / Intercom', 'EXT-IPPHONE'),
            ('Rack / Network Cabinet', 'EXT-RACK'),
            ('Inverter / Power Backup', 'EXT-INVERTER'),
            ('SIM / Data Card / Dongle', 'EXT-SIM')
        ) AS v(name, code)
        WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.code = v.code);

        -- Software / Cloud / Digital children
        INSERT INTO public.categories (name, code, asset_type, is_consumable, parent_id)
        SELECT v.name, v.code, 'intangible', false,
               (SELECT id FROM public.categories WHERE code = 'CLS-IT-EXT')
        FROM (VALUES
            ('Operating System License', 'EXT-OS'),
            ('Database License', 'EXT-DB'),
            ('Cloud Subscription', 'EXT-CLOUD'),
            ('SaaS Subscription', 'EXT-SAAS'),
            ('SSL Certificate', 'EXT-SSL'),
            ('Domain Name', 'EXT-DOMAIN'),
            ('VPN License', 'EXT-VPN'),
            ('Internet / ISP Connection', 'EXT-INTERNET')
        ) AS v(name, code)
        WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.code = v.code);

    EXCEPTION WHEN OTHERS THEN
        EXECUTE 'ALTER TABLE public.categories ENABLE TRIGGER USER';
        RAISE;
    END;

    EXECUTE 'ALTER TABLE public.categories ENABLE TRIGGER USER';
END $$;

-- ============================================================
-- VERIFY
--   SELECT unnest(enum_range(NULL::public.asset_subtype));   -- new types present
--   SELECT c.name AS class, ch.name AS item, ch.code
--     FROM public.categories ch
--     JOIN public.categories c ON c.id = ch.parent_id
--    ORDER BY c.name, ch.name;
-- ============================================================
