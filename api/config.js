// api/config.js
export default function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) return res.status(404).json({ error: 'Config not available' });
    res.status(200).json({ supabaseUrl: url, supabaseAnonKey: anonKey });
}
