// supabaseClient.js
console.log('Supabase client loading...');

/**
 * CLIENT-SIDE SUPABASE CONFIGURATION
 * We now only use this for session management. 
 * Real API keys are secured on the backend.
 */
const SUPABASE_CONFIG = {
    url: '',
    anonKey: ''
};

// Global initialization flag
window.supabaseClientInitialized = false;

function initSupabase() {
    if (window.supabaseClientInitialized) return;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            // We initialize with a redacted key to prevent SDK errors, 
            // but real operations go through the backend proxy.
            const client = window.supabase.createClient(SUPABASE_CONFIG.url, 'REDACTED');
            window.supabase = client;
            window.supabaseClientInitialized = true;
            console.log('ℹ️ Supabase client initialized (Proxy Mode)');

            document.dispatchEvent(new CustomEvent('supabase-ready', { detail: { supabase: client } }));
        } catch (error) {
            console.error('❌ Supabase init error:', error);
        }
    }
}

// Polling for the SDK to load
const startTime = Date.now();
const checkInterval = setInterval(() => {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        clearInterval(checkInterval);
        initSupabase();
    } else if (Date.now() - startTime > 10000) {
        clearInterval(checkInterval);
    }
}, 50);

initSupabase();