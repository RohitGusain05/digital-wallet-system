const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Wallet API',
    version: '1.0.0',
    description: 'REST API for a portfolio digital wallet and transaction system.'
  },
  servers: [{ url: '/api' }],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Create a user account and wallet',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: { 201: { description: 'Account created' }, 400: { description: 'Validation error' }, 409: { description: 'Email already exists' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate a user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: { 200: { description: 'Login successful' }, 401: { description: 'Invalid credentials' } }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User returned' }, 401: { description: 'Authentication required' } }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: { type: 'string', example: 'Rohit Gusain' },
          email: { type: 'string', format: 'email', example: 'rohit@example.com' },
          password: { type: 'string', format: 'password', example: 'SecurePass123' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' }
        }
      }
    }
  }
};

module.exports = openapiDocument;
