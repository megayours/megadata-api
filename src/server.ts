import app from './index';
import { initJWKS } from './config/jwt';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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