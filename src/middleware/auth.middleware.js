// src/middleware/auth.middleware.js

const RBAC_MATRIX = {
    admin: ['manage_users', 'sync_all', 'read_all'],
    manager: ['sync_team', 'read_all'],
    user: ['read_own', 'sync_own']
};

/**
 * SyncTeam Authentication & RBAC Middleware
 * Validates request headers and enforces role-based access control.
 */
export const syncAuthMiddleware = async (req, ctx, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        ctx.logger.warn('Unauthorized access attempt', { path: req.path, traceId: ctx.traceId });
        return {
            status: 401,
            body: { error: 'Unauthorized: Missing Auth Header' }
        };
    }

    // Simulating token verification and role extraction
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        // Mock user identification
        const user = {
            id: 'user-' + token.slice(0, 5),
            role: token.includes('admin') ? 'admin' : (token.includes('manager') ? 'manager' : 'user')
        };

        req.user = user;
        req.permissions = RBAC_MATRIX[user.role] || [];

        ctx.logger.info('User authenticated', { userId: user.id, role: user.role, traceId: ctx.traceId });

        return next();
    }

    ctx.logger.warn('Forbidden access attempt: Invalid Token format', {
        path: req.path,
        authHeaderSnippet: authHeader.substring(0, 10),
        traceId: ctx.traceId
    });

    return {
        status: 403,
        body: { error: 'Forbidden: Invalid Token' }
    };
};


/**
 * Helper to check specific permission
 */
export const requirePermission = (permission) => {
    return async (req, ctx, next) => {
        if (!req.permissions || !req.permissions.includes(permission)) {
            ctx.logger.error('Permission denied', { permission, userId: req.user?.id, traceId: ctx.traceId });
            return {
                status: 403,
                body: { error: `Forbidden: Missing permission [${permission}]` }
            };
        }
        return next();
    };
};

