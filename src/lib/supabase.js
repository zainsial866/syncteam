// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qtqvcfdcucwrtetdrtfx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.warn('⚠️ Missing Supabase keys. Backend functionality might be limited.');
}

export const supabase = createClient(supabaseUrl, supabaseKey || '');
