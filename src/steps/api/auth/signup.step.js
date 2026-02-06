// src/steps/api/auth/signup.step.js
import { supabase } from '../../../lib/supabase.js';
import { sanitizationMiddleware } from '../../../middleware/sanitizer.js';

export const config = {
    name: 'Signup',
    type: 'api',
    path: '/api/auth/signup',
    method: 'POST',
    emits: [],
    flows: ['auth'],
    middleware: [sanitizationMiddleware]
};

export default async function handler(req, ctx) {
    const { name, email, password, role } = req.body || {};

    if (!email || !password || !name) {
        return {
            status: 400,
            body: { error: 'Name, email, and password are required' }
        };
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, role: role || 'user' },
                emailRedirectTo: req.headers.origin || 'http://localhost:3000'
            }
        });

        if (error) {
            ctx.logger.error('Supabase Signup Error', { error: error.message, email });
            return {
                status: 400,
                body: { error: error.message }
            };
        }

        ctx.logger.info('User signed up successfully', { userId: data.user?.id });

        return {
            status: 200,
            body: {
                user: data.user,
                session: data.session
            }
        };
    } catch (err) {
        ctx.logger.error('Critical Signup Error', { error: err.message });
        return {
            status: 500,
            body: { error: 'Internal Server Error' }
        };
    }
}
