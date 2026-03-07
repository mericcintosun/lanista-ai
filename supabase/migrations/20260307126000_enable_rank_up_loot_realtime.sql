-- Enable Realtime for rank_up_loot_requests so the frontend can show
-- instant notifications when a bot earns an NFT (VRF fulfillment).
ALTER PUBLICATION supabase_realtime ADD TABLE rank_up_loot_requests;
