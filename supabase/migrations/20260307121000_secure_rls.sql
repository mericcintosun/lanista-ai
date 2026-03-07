-- Enable Row Level Security (RLS) on all core tables to prevent unauthorized access
-- This ensures that frontend anon keys cannot freely read/write the entire database
-- The backend uses the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS automatically

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_bind_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Deny all public access by default (no policies added means default-deny for anon/authenticated roles)
-- If the frontend needs direct read access in the future, explicit policies should be added.
-- Right now, all data operations are routed through the secure Node.js backend.
