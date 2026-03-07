-- Allow all clients to send broadcast messages (fallback to make sure the chat works)
CREATE POLICY "Allow all to send broadcast messages" 
ON realtime.messages FOR INSERT 
WITH CHECK (true);
