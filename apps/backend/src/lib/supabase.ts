import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load from .env or .env.local
dotenv.config();
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase keys not found in backend environment variables. Mocking or falling back to local simulation.');
}

export const supabase = createClient(SUPABASE_URL || 'https://mock.supabase.co', SUPABASE_SERVICE_KEY || 'mock-key', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
