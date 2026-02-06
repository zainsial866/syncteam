import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const dompurify = createDOMPurify(window);

/**
 * SyncTeam Sanitization Utility
 * Strips HTML and malicious tags from strings.
 */
export const sanitize = (value, ctx = null) => {
    if (typeof value !== 'string') return value;
    const clean = dompurify.sanitize(value);

    if (clean !== value && ctx) {
        ctx.logger.warn('Sanitization triggered: potentially malicious content removed', {
            originalLength: value.length,
            cleanedLength: clean.length,
            traceId: ctx.traceId
        });
    }

    return clean;
};

/**
 * Recursive sanitizer for objects
 */
export const sanitizeObject = (obj, ctx = null) => {
    if (Array.isArray(obj)) {
        return obj.map(v => sanitizeObject(v, ctx));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v, ctx)])
        );
    }
    return sanitize(obj, ctx);
};

/**
 * Motia Middleware for global sanitization
 */
export const sanitizationMiddleware = async (req, ctx, next) => {
    if (req.body) {
        req.body = sanitizeObject(req.body, ctx);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query, ctx);
    }
    return next();
};
