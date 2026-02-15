// api/auth/signup.js
import { supabase } from '../../lib/supabase.js';
import { sanitizeObject } from '../../lib/sanitize.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    const { name, email, password, role } = sanitizeObject(body);
    if (!email || !password || !name) return res.status(400).json({ error: 'Name, email, and password are required' });
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, role: role || 'user' }, emailRedirectTo: req.headers.origin || req.headers.referer || 'http://localhost:3000' }
        });
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ user: data.user, session: data.session });
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
