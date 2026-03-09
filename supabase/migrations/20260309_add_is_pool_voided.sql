
-- Add is_pool_voided column to matches table to track if the community support pool was voided
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_pool_voided boolean DEFAULT false;

-- Index for faster filtering if needed
CREATE INDEX IF NOT EXISTS idx_matches_is_pool_voided ON public.matches(is_pool_voided) WHERE is_pool_voided = true;
