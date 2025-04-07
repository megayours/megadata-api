import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { megadataRoutes } from './routes/megadata';
import { accountRoutes } from './routes/account';
import { moduleRoutes } from './routes/module';
import { megahubRoutes } from './routes/megahub';
import { authMiddleware } from './middleware/auth';

export function createApp() {
  const app = new OpenAPIHono();

  // Middleware
  app.use('*', cors());
  
  // Apply auth middleware to all routes except docs
  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/docs')) {
      return next();
    }
    return authMiddleware(c, next);
  });

  // Routes
  app.route('/megadata', megadataRoutes);
  app.route('/accounts', accountRoutes);
  app.route('/modules', moduleRoutes);
  app.route('/megahub', megahubRoutes);

  // Swagger UI
  app.doc('/docs/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'Megadata API',
      version: '1.0.0',
      description: 'API for managing Megadata collections and tokens'
    },
    servers: [
      {
        url: 'https://megadata-api.testnet.megayours.com',
        description: 'Testnet server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      }
    ]
  });
  app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));

  return app;
}

// Create default app instance
const app = createApp();
export default app;