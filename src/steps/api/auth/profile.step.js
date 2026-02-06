// src/steps/api/auth/profile.step.js
import { supabase } from '../../../lib/supabase.js';

export const config = {
    name: 'GetUserProfile',
    type: 'api',
    path: '/api/auth/profile',
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
        // 1. Get user from token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return {
                status: 401,
                body: { error: authError?.message || 'Invalid token' }
            };
        }

        // 2. Fetch profile from DB
        const { data: profile, error: dbError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (dbError) throw dbError;

        return {
            status: 200,
            body: {
                user: {
                    id: user.id,
                    email: user.email,
                    ...profile
                }
            }
        };
    } catch (err) {
        ctx.logger.error('Profile Fetch Error', { error: err.message });
        return {
            status: 500,
            body: { error: 'Internal Server Error' }
        };
    }
}
