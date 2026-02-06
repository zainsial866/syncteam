// src/steps/api/data.step.js
import { supabase } from '../../lib/supabase.js';

export const config = {
    name: 'DataProxy',
    type: 'api',
    path: '/api/data/:table',
    method: 'GET',
    emits: [],
    flows: ['data-management']
};

export const handler = async (req, ctx) => {
    const { table } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return { status: 401, body: { error: 'Unauthorized' } };
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        // Verify user session
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return { status: 401, body: { error: 'Invalid session' } };
        }

        // Fetch data from requested table
        // Note: In a real app, we'd add more validation/filtering here
        const { data, error } = await supabase.from(table).select('*');

        if (error) throw error;

        return {
            status: 200,
            body: { data }
        };
    } catch (err) {
        ctx.logger.error(`Data Proxy Error [${table}]`, { error: err.message });
        return {
            status: 500,
            body: { error: err.message }
        };
    }
}
