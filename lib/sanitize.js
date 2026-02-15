// lib/sanitize.js
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const dompurify = createDOMPurify(window);

function sanitize(value) {
    if (typeof value !== 'string') return value;
    return dompurify.sanitize(value);
}

export function sanitizeObject(obj) {
    if (Array.isArray(obj)) return obj.map(v => sanitizeObject(v));
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v)]));
    }
    return sanitize(obj);
}
