import app from './index';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
}; 