import { supabase } from '../../lib/supabase.js';
import { sanitizationMiddleware } from '../../middleware/sanitizer.js';

// src/steps/api/health.step.js
export const config = {
  name: 'HealthCheck',
  type: 'api',
  path: '/api/health',
  method: 'GET',
  emits: [],
  flows: ['system-monitoring'],
  middleware: [sanitizationMiddleware]
};

export const handler = async (req, { logger, traceId }) => {
  logger.info('Health check requested', { traceId });

  let supabaseStatus = 'connected';
  try {
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) throw error;
  } catch (err) {
    logger.error('Supabase Connectivity Error', { error: err.message });
    supabaseStatus = 'error: ' + err.message;
  }

  return {
    status: supabaseStatus === 'connected' ? 200 : 500,
    body: {
      status: supabaseStatus === 'connected' ? 'healthy' : 'degraded',
      supabase: supabaseStatus,
      service: 'motia',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || 'development'
    }
  };
};

