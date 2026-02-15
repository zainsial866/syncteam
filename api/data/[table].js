// api/data/[table].js
import { supabase } from '../../lib/supabase.js';
import { getUser } from '../../lib/auth.js';

const ALLOWED = ['projects', 'tasks', 'clients', 'profiles'];

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const table = req.query?.table ?? (req.url?.match(/\/api\/data\/([^/?#]+)/) || [])[1];
    if (!table || !ALLOWED.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        return res.status(200).json({ data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
