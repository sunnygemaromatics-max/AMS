-- ============================================================
-- Alternative: Match CSV column names exactly
-- Run this to create columns with the exact names from your CSV
-- ============================================================

-- Add columns with EXACT CSV header names (with spaces and special chars)
-- Note: Column names with spaces need quotes

-- First, let's see what columns your CSV has
-- Based on your error, these are the columns in your CSV:

-- Instead of changing database, let's create a view or use SQL to import
-- This imports data with a custom mapping

-- Create a function to import with custom mapping
CREATE OR REPLACE FUNCTION import_mumbai_csv()
RETURNS TEXT AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- This is a placeholder - you'll need to provide the actual data
    -- Or we can use COPY command if you upload CSV to a temp table first
    
    RETURN 'Please use Option A: Rename CSV headers, or Option B: Manual SQL insert';
END;
$$ LANGUAGE plpgsql;

-- Show you the exact SQL needed
SELECT 'To import your data, you have 2 options:' as option;
SELECT '' as blank;
SELECT 'OPTION A: Rename these CSV headers (easiest):' as option_a;
SELECT '  1. asset_code → asset_code (keep)' as step;
SELECT '  2. name → name (keep)' as step;
SELECT '  3. serial_number → serial_number (keep)' as step;
SELECT '  4. purchase_date → purchase_date (keep)' as step;
SELECT '  5. Purchase Bill No. & GRN No. → purchase_bill_no' as step;
SELECT '  6. vendor_name → vendor_name (keep)' as step;
SELECT '  7. Location Of Asset → location_name' as step;
SELECT '  8. Employee Code: → employee_code' as step;
SELECT '  9. assigned_to_name → employee_name' as step;
SELECT ' 10. department_code → department_name' as step;
SELECT ' 11. Note → import_notes' as step;
SELECT ' 12. Receiver Date → receiver_date' as step;
SELECT ' 13. Status → status (keep)' as step;
SELECT '' as blank;
SELECT 'OPTION B: Use this exact format in your CSV:' as option_b;
