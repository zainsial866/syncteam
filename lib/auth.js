// lib/auth.js
import { supabase } from './supabase.js';

export function getToken(req) {
    const auth = req.headers?.authorization || req.headers?.Authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
}

export async function getUser(req) {
    const token = getToken(req);
    if (!token) return null;
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
}
