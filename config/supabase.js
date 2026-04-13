import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://bxlmmvunfyvsbqakgxed.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

// Standard client for public/user-authenticated requests
export const supabase = createClient(supabaseUrl, supabaseKey);

// High IQ: Administrative client for system-level recovery and self-healing
export const supabaseService = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;

