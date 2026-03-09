/**
 * OpenAPI/Swagger Documentation
 *
 * Generates OpenAPI 3.0 spec from route definitions.
 * Serves Swagger UI at /api/docs in non-production environments only.
 * In production the endpoints return 404 to avoid exposing internal API details.
 */

import { Router, Request, Response } from 'express';

const swaggerRouter = Router();

function getServerUrl(): string {
  // Prefer an explicit base URL from environment configuration.
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // Fallback to localhost for development or when no base URL is configured.
  return `http://localhost:${process.env.PORT || 3001}`;
}

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Scholarly API',
    description: 'RESTful API for the Scholarly Unified Learning Nexus - an AI-powered education platform.',
    version: '1.0.0',
    contact: {
      name: 'Scholarly Engineering',
      url: 'https://scholarly.com.au',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: getServerUrl(),
      description: `${process.env.NODE_ENV || 'development'} server`,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'RS256-signed JWT access token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'AUTH_001' },
              message: { type: 'string', example: 'Invalid credentials' },
              details: { type: 'object' },
              requestId: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'number', example: 900 },
          tokenType: { type: 'string', example: 'Bearer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          displayName: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'suspended', 'deleted'] },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          version: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number' },
          dependencies: { type: 'object' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          pageSize: { type: 'number' },
          total: { type: 'number' },
          totalPages: { type: 'number' },
        },
      },
    },
    parameters: {
      TenantId: {
        name: 'X-Tenant-Id',
        in: 'header',
        description: 'Tenant isolation identifier',
        schema: { type: 'string' },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/live': {
      get: {
        summary: 'Liveness probe',
        tags: ['Health'],
        security: [],
        responses: {
          200: { description: 'Process is alive' },
        },
      },
    },
    '/ready': {
      get: {
        summary: 'Readiness probe',
        tags: ['Health'],
        security: [],
        responses: {
          200: { description: 'Service is ready' },
          503: { description: 'Service not ready' },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Detailed health check',
        tags: ['Health'],
        security: [],
        responses: {
          200: {
            description: 'Health status',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'Authenticate user',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  tenantSlug: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } },
          },
          401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          429: { description: 'Too many attempts' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        summary: 'Register new user',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'displayName', 'firstName', 'lastName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  displayName: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  tenantSlug: { type: 'string', default: 'scholarly' },
                  role: { type: 'string', enum: ['learner', 'parent', 'tutor'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Token refreshed' },
          401: { description: 'Invalid refresh token' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        summary: 'Get current user',
        tags: ['Authentication'],
        responses: {
          200: {
            description: 'Current user profile',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/v1/users': {
      get: {
        summary: 'List users',
        tags: ['Users'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'number', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'number', default: 20 } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'List of users' } },
      },
    },
    '/api/v1/tutors': {
      get: {
        summary: 'List tutors',
        tags: ['Tutors'],
        parameters: [
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          { name: 'yearLevel', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'List of tutors' } },
      },
    },
    '/api/v1/bookings': {
      get: {
        summary: 'List bookings',
        tags: ['Bookings'],
        responses: { 200: { description: 'List of bookings' } },
      },
      post: {
        summary: 'Create booking',
        tags: ['Bookings'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Booking created' } },
      },
    },
    '/api/v1/sessions': {
      get: { summary: 'List sessions', tags: ['Sessions'], responses: { 200: { description: 'List of sessions' } } },
    },
    '/api/v1/curriculum': {
      get: { summary: 'Browse curriculum', tags: ['Curriculum'], responses: { 200: { description: 'Curriculum data' } } },
    },
    '/api/v1/content': {
      get: { summary: 'Browse content', tags: ['Content'], responses: { 200: { description: 'Content list' } } },
    },
    '/api/v1/dashboard': {
      get: { summary: 'Get dashboard data', tags: ['Dashboard'], responses: { 200: { description: 'Dashboard data' } } },
    },
    '/api/v1/ask-issy': {
      post: { summary: 'Chat with Ask Issy', tags: ['AI'], responses: { 200: { description: 'AI response' } } },
    },
    '/api/v1/analytics': {
      get: { summary: 'Get analytics', tags: ['Analytics'], responses: { 200: { description: 'Analytics data' } } },
    },
    '/api/v1/portfolio': {
      get: { summary: 'Get portfolio', tags: ['Portfolio'], responses: { 200: { description: 'Portfolio data' } } },
    },
    '/api/v1/marketplace': {
      get: { summary: 'Browse marketplace', tags: ['Marketplace'], responses: { 200: { description: 'Marketplace listings' } } },
    },
    '/api/v1/storybook': {
      get: { summary: 'List storybooks', tags: ['Storybook'], responses: { 200: { description: 'Storybooks' } } },
    },
    '/api/v1/arena': {
      get: { summary: 'Arena competitions', tags: ['Arena'], responses: { 200: { description: 'Arena data' } } },
    },
  },
  tags: [
    { name: 'Health', description: 'Service health and readiness probes' },
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Users', description: 'User management' },
    { name: 'Tutors', description: 'Tutor profiles and availability' },
    { name: 'Bookings', description: 'Tutoring session bookings' },
    { name: 'Sessions', description: 'Live tutoring sessions' },
    { name: 'Curriculum', description: 'Australian curriculum standards' },
    { name: 'Content', description: 'Educational content marketplace' },
    { name: 'Dashboard', description: 'User dashboards' },
    { name: 'AI', description: 'AI-powered features' },
    { name: 'Analytics', description: 'Learning analytics and reporting' },
    { name: 'Portfolio', description: 'Student portfolios and artifacts' },
    { name: 'Marketplace', description: 'Content marketplace' },
    { name: 'Storybook', description: 'Interactive storybook engine' },
    { name: 'Arena', description: 'Competitions and tournaments' },
  ],
};

/**
 * GET /api/docs/openapi.json — Raw OpenAPI spec (non-production only)
 */
swaggerRouter.get('/openapi.json', (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(openApiSpec);
});

/**
 * GET /api/docs — Swagger UI (non-production only)
 */
swaggerRouter.get('/', (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scholarly API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export { swaggerRouter, openApiSpec };
