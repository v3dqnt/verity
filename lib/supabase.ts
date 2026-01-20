import { createClient } from '@supabase/supabase-js';

// These must be in your .env.local file

// DZFhZYiiv6R9JJNM pass for supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);