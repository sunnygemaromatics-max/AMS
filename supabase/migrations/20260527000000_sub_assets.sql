-- ----------------------------------------------------------------------------
-- Sub-asset hierarchy: parent_asset_id on assets table.
-- Lets a single asset (e.g. a server) own a tree of child assets
-- (e.g. its drives, RAM modules, GPUs). Deleting a parent sets children's
-- parent_asset_id to NULL — children become top-level, never auto-deleted.
-- ----------------------------------------------------------------------------

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS parent_asset_id UUID
    REFERENCES public.assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assets_parent ON public.assets(parent_asset_id);

-- A safety guard against cycles: a parent cannot equal the row's own id.
-- (Full cycle detection across multiple levels is left to the application.)
ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_no_self_parent;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_no_self_parent CHECK (parent_asset_id IS DISTINCT FROM id);
