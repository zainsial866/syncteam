// src/steps/api/auth/login.step.js
import { supabase } from '../../../lib/supabase.js';
import { sanitizationMiddleware } from '../../../middleware/sanitizer.js';

export const config = {
    name: 'Login',
    type: 'api',
    path: '/api/auth/login',
    method: 'POST',
    emits: [],
    flows: ['auth'],
    middleware: [sanitizationMiddleware]
};

export default async function handler(req, ctx) {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return {
            status: 400,
            body: { error: 'Email and password are required' }
        };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            ctx.logger.error('Supabase Login Error', { error: error.message, email });
            return {
                status: 401,
                body: { error: error.message }
            };
        }

        ctx.logger.info('User logged in successfully', { userId: data.user.id });

        return {
            status: 200,
            body: {
                user: data.user,
                session: data.session
            }
        };
    } catch (err) {
        ctx.logger.error('Critical Login Error', { error: err.message });
        return {
            status: 500,
            body: { error: 'Internal Server Error' }
        };
    }
}
