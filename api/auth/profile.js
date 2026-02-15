// api/auth/profile.js
import { supabase } from '../../lib/supabase.js';
import { getUser } from '../../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    try {
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (error) throw error;
        return res.status(200).json({ user: { id: user.id, email: user.email, ...profile } });
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
