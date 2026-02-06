// src/steps/api/auth/register-app.step.js
import { sanitizationMiddleware } from '../../../middleware/sanitizer.js';

export const config = {
    name: 'RegisterApp',
    type: 'api',
    path: '/api/auth/register-app',
    method: 'POST',
    emits: [],
    flows: ['auth'],
    middleware: [sanitizationMiddleware]
};

export default async function handler(req, ctx) {
    const { appName, developerName, email } = req.body || {};

    if (!appName || !developerName || !email) {
        return {
            status: 400,
            body: { error: 'AppName, DeveloperName, and Email are required' }
        };
    }

    try {
        ctx.logger.info('App registration request received', { appName, developerName, email });

        // Implementation for app registration would go here
        // For now, we simulate success

        return {
            status: 200,
            body: {
                success: true,
                message: 'Application registration request submitted successfully.',
                appId: 'app_' + Math.random().toString(36).substr(2, 9)
            }
        };
    } catch (err) {
        ctx.logger.error('App Registration Error', { error: err.message });
        return {
            status: 500,
            body: { error: 'Internal Server Error' }
        };
    }
}
