// api/auth/session.js
import { supabase } from '../../lib/supabase.js';
import { getToken } from '../../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'No authorization header' });
    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error) return res.status(401).json({ error: error.message });
        return res.status(200).json({ user: data.user });
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
