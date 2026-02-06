// src/index.js - Motia Entry Point
import { start } from 'motia';
import { supabase } from './lib/supabase.js';

// Setup Motia with context
const config = {
    context: {
        supabase,
        env: process.env.NODE_ENV || 'development'
    }
};

// Start Motia if running directly
if (process.env.VERCEL !== '1') {
    start(config).then(() => {
        console.log('🚀 Motia backend started successfully');
    }).catch(err => {
        console.error('❌ Failed to start Motia:', err);
    });
}

// Export for serverless environments (like Vercel)
export default async function handler(req, res) {
    const { handleRequest } = await import('motia');
    return handleRequest(req, res, config);
}
