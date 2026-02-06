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
  return {
    status: 200,
    body: {
      status: 'healthy',
      service: 'motia',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || 'development'
    }
  };
};
