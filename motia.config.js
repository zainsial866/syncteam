import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

export default {
  entry: './src/index.js',
  steps: './src/steps',

  // Use a higher port to avoid common conflicts (3000, 3001, etc.)
  port: process.env.PORT || 3005,

  // HMR and WebSocket configuration
  hmr: {
    port: 24681 // Explicitly set to avoid collisions with other dev servers (standard is 24678)
  },

  // State management (Key-Value storage across steps)
  state: {
    adapter: 'memory',
  },

  // Redis configuration (External for production/Windows)
  redis: {
    useMemoryServer: false,
    host: process.env.MOTIA_REDIS_HOST || '127.0.0.1',
    port: process.env.MOTIA_REDIS_PORT || 6379
  },

  // Observability & Logging
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty'
  },

  // Cross-Origin Resource Sharing
  cors: {
    origin: '*',
    credentials: true
  },

  // Workbench Plugins
  plugins: [],

  // Express Customization (Security Hardening)
  app: (app) => {
    // 1. Security Headers via Helmet
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://www.motia.dev"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        }
      }
    }));

    // 2. Rate Limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per `window`
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
    app.use('/api/', limiter);
  }
};
