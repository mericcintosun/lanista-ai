-- Fix: fulfilled_at and item_id must be in Realtime payload for loot drop notifications.
-- Drop and re-add so all columns (including fulfilled_at, item_id, created_at) are published.
ALTER PUBLICATION supabase_realtime DROP TABLE rank_up_loot_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE rank_up_loot_requests;
