import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://bxlmmvunfyvsbqakgxed.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
