-- ============================================================
-- FIX: Make update_updated_at_column() safe for tables without updated_at
-- ERROR: record "new" has no field "updated_at"
-- ============================================================

-- Drop and recreate the trigger function with safety check
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the column exists on this table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
    AND table_name = TG_TABLE_NAME 
    AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Verify the fix
SELECT 'Trigger function updated with safety check' as status;

-- Optional: Find which tables are missing updated_at
SELECT 
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns c2 
    WHERE c2.table_schema = c1.table_schema 
    AND c2.table_name = c1.table_name 
    AND c2.column_name = 'updated_at'
  ) as has_updated_at
FROM information_schema.tables c1
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY has_updated_at, table_name;
