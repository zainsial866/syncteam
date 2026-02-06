import { syncAuthMiddleware } from '../../middleware/auth.middleware.js';
import { sanitizationMiddleware } from '../../middleware/sanitizer.js';

export const config = {
    name: 'ListUsers',
    type: 'api',
    path: '/api/users',
    method: 'GET',
    emits: [],
    flows: ['user-management'], // Grouped in Workbench
    middleware: [syncAuthMiddleware, sanitizationMiddleware]
};


export const handler = async (req, { logger, context, state, streams, traceId }) => {
    const { supabase } = context;

    logger.info('Fetching users list', { traceId, path: config.path });

    try {
        // Example of State Management (Caching the last fetch time)
        const lastFetch = await state.get('metadata', 'last_user_fetch');
        if (lastFetch) {
            logger.debug('Previous fetch was at', { lastFetch: lastFetch.timestamp });
        }

        const { data, error } = await supabase.from('profiles').select('id, full_name, email, role');
        if (error) throw error;

        // Update state
        await state.set('metadata', 'last_user_fetch', { timestamp: new Date().toISOString() });

        // Push update to live stream (Real-time update)
        await streams.syncUpdates.set('users', 'last_list', {
            id: 'list-' + Date.now(),
            type: 'USER_LOGGED_IN',
            data: { count: data.length },
            timestamp: new Date().toISOString()
        });

        logger.info('Successfully retrieved users', { count: data.length });

        return {
            status: 200,
            body: {
                success: true,
                users: data
            }
        };
    } catch (error) {
        logger.error('Failed to fetch users', { error: error.message, traceId });
        return {
            status: 500,
            body: {
                success: false,
                message: error.message
            }
        };
    }
};

