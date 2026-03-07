-- Enable authenticated users to send realtime Broadcast messages on the client
-- Supabase requires this policy for clients to be able to send chat messages in the Arena
CREATE POLICY "Allow authenticated users to send broadcast messages" 
ON realtime.messages FOR INSERT 
TO authenticated 
WITH CHECK (true);
