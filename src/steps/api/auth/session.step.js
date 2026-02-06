// src/steps/api/auth/session.step.js
import { supabase } from '../../../lib/supabase.js';

export const config = {
    name: 'GetSession',
    type: 'api',
    path: '/api/auth/session',
    method: 'GET',
    emits: [],
    flows: ['auth']
};

export const handler = async (req, ctx) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return {
            status: 401,
            body: { error: 'No authorization header' }
        };
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const { data, error } = await supabase.auth.getUser(token);

        if (error) {
            return {
                status: 401,
                body: { error: error.message }
            };
        }

        return {
            status: 200,
            body: { user: data.user }
        };
    } catch (err) {
        return {
            status: 500,
            body: { error: 'Internal Server Error' }
        };
    }
}
