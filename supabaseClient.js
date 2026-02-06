// supabaseClient.js
console.log('Supabase client loading...');

// Configuration Object - Move to Environment Variables in production
const SUPABASE_CONFIG = {
    url: 'https://qtqvcfdcucwrtetdrtfx.supabase.co',
    // WARNING: This key is exposed in the frontend. Ensure RLS is enabled on all tables.
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cXZjZmRjdWN3cnRldGRydGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjYwMTgsImV4cCI6MjA4NTcwMjAxOH0.2SnLJvoTmitMMKQ-vtSoaRS0VxynACulkj9E6fYXmew'
};

// Only run if supabase client doesn't exist yet
if (typeof window.supabaseClientInitialized === 'undefined') {
    // Check if Supabase SDK is loaded
    const initSupabase = () => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                // Initialize client and assign to window.supabase
                const client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
                window.supabase = client;
                window.supabaseClientInitialized = true;
                console.log('✅ Supabase initialized');

                // Dispatch event that Supabase is ready
                document.dispatchEvent(new CustomEvent('supabase-ready', { detail: { supabase: client } }));
            } catch (error) {
                console.error('❌ Supabase init error:', error);
            }
        }
    };

    // Try immediately
    initSupabase();

    // If not ready, wait for it
    if (!window.supabaseClientInitialized) {
        const checkInterval = setInterval(() => {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                clearInterval(checkInterval);
                initSupabase();
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.supabaseClientInitialized) {
                console.error('Supabase failed to initialize within 10 seconds. Check script loading order.');
            }
        }, 10000);
    }
}