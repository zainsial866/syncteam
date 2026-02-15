// api/health.js
import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    let status = 'connected';
    try {
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
    } catch (err) {
        status = 'error: ' + err.message;
    }
    const healthy = status === 'connected';
    return res.status(healthy ? 200 : 500).json({
        status: healthy ? 'healthy' : 'degraded',
        supabase: status,
        service: 'vercel-serverless',
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV || 'development'
    });
}
