-- Run this in Supabase SQL Editor to create the rank_up_loot_requests table.
-- Used to track Chainlink VRF rank-up loot requests so the frontend can show "pending" / "fulfilled" and item_id.

CREATE TABLE IF NOT EXISTS public.rank_up_loot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  wallet_address text NOT NULL,
  new_rank_index smallint NOT NULL CHECK (new_rank_index >= 0 AND new_rank_index <= 6),
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  item_id smallint,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id),
  UNIQUE(bot_id, new_rank_index)
);

CREATE INDEX IF NOT EXISTS idx_rank_up_loot_requests_bot_id ON public.rank_up_loot_requests(bot_id);
CREATE INDEX IF NOT EXISTS idx_rank_up_loot_requests_fulfilled_at ON public.rank_up_loot_requests(fulfilled_at) WHERE fulfilled_at IS NULL;

COMMENT ON TABLE public.rank_up_loot_requests IS 'Tracks Chainlink VRF requests for rank-up NFT loot; fulfilled_at and item_id are updated when VRF callback mints the NFT. One row per (bot_id, new_rank_index) — each bot can receive rank-up reward only once per rank.';

-- If the table already exists without the unique constraint, run:
-- ALTER TABLE public.rank_up_loot_requests ADD CONSTRAINT rank_up_loot_requests_bot_rank_unique UNIQUE (bot_id, new_rank_index);
