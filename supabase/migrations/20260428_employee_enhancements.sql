-- ============================================================
-- Employee table enhancements — Phase 3 upgrade
-- Additive only — no breaking changes to existing columns
-- ============================================================

-- Employee type (employment basis)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'full_time'
    CHECK (employee_type IN ('full_time', 'part_time', 'contractor', 'intern', 'temporary'));

-- Reporting manager (name-based, human-readable, no FK to keep it simple)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS reporting_manager TEXT;

-- Access level for system permissions guidance
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'standard'
    CHECK (access_level IN ('standard', 'elevated', 'admin', 'restricted'));

-- Emergency contact
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- Secondary email (e.g. personal email)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS secondary_email TEXT;

-- Date of joining
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS date_of_joining DATE;

-- Office / work location (free text, distinct from location_id warehouse)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS work_location TEXT;

-- Index for reporting manager lookups
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager ON public.employees(reporting_manager);
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON public.employees(employee_type);
