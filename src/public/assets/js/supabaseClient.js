// supabaseClient.js
console.log('Supabase client loading...');

// Configuration Object
const SUPABASE_CONFIG = {
    url: 'https://qtqvcfdcucwrtetdrtfx.supabase.co',
    // WARNING: This key is exposed in the frontend. Ensure RLS is enabled on all tables.
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cXZjZmRjdWN3cnRldGRydGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjYwMTgsImV4cCI6MjA4NTcwMjAxOH0.2SnLJvoTmitMMKQ-vtSoaRS0VxynACulkj9E6fYXmew'
};

// Global initialization flag
window.supabaseClientInitialized = false;

function initSupabase() {
    if (window.supabaseClientInitialized) return;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            const client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            // Replace the SDK object with the initialized client
            window.supabase = client;
            window.supabaseClientInitialized = true;
            console.log('✅ Supabase initialized');

            // Dispatch event for any listeners already waiting
            document.dispatchEvent(new CustomEvent('supabase-ready', { detail: { supabase: client } }));
        } catch (error) {
            console.error('❌ Supabase init error:', error);
        }
    }
}

// Polling for the SDK to load if it's not already there
const startTime = Date.now();
const checkInterval = setInterval(() => {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        clearInterval(checkInterval);
        initSupabase();
    } else if (Date.now() - startTime > 10000) {
        clearInterval(checkInterval);
        console.error('❌ Supabase SDK failed to load within 10s');
    }
}, 50);

// Try immediately as well
initSupabase();