import { sanitizationMiddleware } from '../../middleware/sanitizer.js';

// Simple test endpoint
export const config = {
  name: 'HelloWorld',
  type: 'api',
  path: '/api/hello',
  method: 'GET',
  emits: [],
  flows: ['system-monitoring'],
  middleware: [sanitizationMiddleware]
};

export const handler = async (req, { logger, traceId }) => {
  logger.info('Hello endpoint called', { traceId });
  return {
    status: 200,
    body: { message: 'Hello from Motia!', timestamp: new Date() }
  };
};

