// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Supabase environment variables for backend use
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client;

if (!supabaseUrl || !supabaseKey) {
    if (process.env.MOTIA_ENV === 'production' || process.env.NODE_ENV === 'production') {
        console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Build may proceed, but runtime will fail.');
    }
    // Provide a dummy client that fails gracefully when called
    client = {
        auth: {
            signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
            signUp: async () => ({ error: { message: 'Supabase not configured' } }),
            getUser: async () => ({ error: { message: 'Supabase not configured' } })
        },
        from: (table) => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ error: { message: 'Supabase not configured' } }),
                    single: async () => ({ error: { message: 'Supabase not configured' } })
                }),
                order: () => ({
                    limit: async () => ({ error: { message: 'Supabase not configured' } })
                })
            }),
            insert: () => ({ select: () => ({ single: async () => ({ error: { message: 'Supabase not configured' } }) }) })
        })
    };
} else {
    client = createClient(supabaseUrl, supabaseKey);
}

export const supabase = client;

