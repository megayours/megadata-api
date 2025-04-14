export const bearerAuth = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your JWT token'
} as const;

export const securitySchemes = {
  bearerAuth
} as const;

// Helper to add security requirement to routes
export const protectedRoute = [
  { bearerAuth: [] }
]; 