-- Enable Realtime for spark_balances table
-- This allows any component using useSparkBalance hook to receive instant updates 
-- when Sparks are added or spent in the database.

ALTER PUBLICATION supabase_realtime ADD TABLE spark_balances;
