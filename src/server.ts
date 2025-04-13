import app from './index';
import { initJWKS } from './config/jwt';
import env from './env';

const port = env.PORT;

// Initialize JWKS before starting the server
initJWKS().catch((error) => {
  console.error('Failed to initialize JWKS:', error);
  process.exit(1);
});

console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
}; 