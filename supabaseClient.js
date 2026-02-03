
// Initialize Supabase Client
// REPLACE THESE WITH YOUR OWN PROJECT DETAILS FROM SUPABASE DASHBOARD
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

let supabase;

if (typeof createClient !== 'undefined') {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
} else {
    console.error('Supabase SDK not loaded. Make sure the script tag is in index.html');
}

// Export for app.js (mechanically, app.js will just use the global 'supabase' variable if loaded before, 
// but since we are in vanilla JS without modules, we rely on script order or global scope)
// We will simply ensure this file is loaded BEFORE app.js in index.html, making 'supabase' available globally.
window.supabaseClient = supabase;
