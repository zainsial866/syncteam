// src/index.js - Motia Entry Point
import { start } from 'motia';
import { supabase } from './lib/supabase.js';

// Setup Motia with context
const config = {
    steps: './src/steps',
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
    try {
        const { handleRequest } = await import('motia');
        return await handleRequest(req, res, config);
    } catch (err) {
        console.error('SERVERLESS_ERROR:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
}
