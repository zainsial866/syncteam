// supabaseClient.js
console.log('Supabase client loading...');

window.supabaseClientInitialized = false;

async function initSupabase() {
    if (window.supabaseClientInitialized) return;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return;

    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Config unavailable');
        const { supabaseUrl, supabaseAnonKey } = await res.json();
        if (!supabaseUrl || !supabaseAnonKey) throw new Error('Invalid config');

        const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        window.supabase = client;
        window.supabaseClientInitialized = true;
        console.log('Supabase client initialized');
        document.dispatchEvent(new CustomEvent('supabase-ready', { detail: { supabase: client } }));
    } catch (error) {
        console.error('Supabase init error:', error);
    }
}

const startTime = Date.now();
const checkInterval = setInterval(() => {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        clearInterval(checkInterval);
        initSupabase();
    } else if (Date.now() - startTime > 10000) {
        clearInterval(checkInterval);
    }
}, 50);
