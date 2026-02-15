// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client;

if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'production') {
        console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
    }
    client = {
        auth: {
            signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
            signUp: async () => ({ error: { message: 'Supabase not configured' } }),
            getUser: async () => ({ error: { message: 'Supabase not configured' } })
        },
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ error: { message: 'Supabase not configured' } }) }) }) })
    };
} else {
    client = createClient(supabaseUrl, supabaseKey);
}

export const supabase = client;
