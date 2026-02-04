// supabaseClient.js
console.log('Supabase client loading...');

// Only run if supabase client doesn't exist yet
if (typeof window.supabaseClientInitialized === 'undefined') {
    const SUPABASE_URL = 'https://qtqvcfdcucwrtetdrtfx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cXZjZmRjdWN3cnRldGRydGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjYwMTgsImV4cCI6MjA4NTcwMjAxOH0.2SnLJvoTmitMMKQ-vtSoaRS0VxynACulkj9E6fYXmew';

    // Check if Supabase SDK is loaded
    const initSupabase = () => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                window.supabaseClientInitialized = true;
                console.log('✅ Supabase initialized');

                // Dispatch event that Supabase is ready
                document.dispatchEvent(new CustomEvent('supabase-ready'));
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

        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.supabaseClientInitialized) {
                console.error('Supabase failed to initialize within 5 seconds');
            }
        }, 5000);
    }
}