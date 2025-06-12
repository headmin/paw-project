import { OpenAPIHono } from '@hono/zod-openapi'
import { Context, Next } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { receiveWebhookRoute, listWebhooksRoute, getWebhookRoute, deleteWebhookRoute } from './openapi/routes/webhooks'
import { receiveWebhook, listWebhooks, getWebhook, deleteWebhook } from './controllers/webhooks'
import { analyticsRoute, analyticsOriginalRoute } from './openapi/routes/analytics'
import { exportCsvRoute, exportJsonRoute } from './openapi/routes/exports'
import { listTokensRoute, getTokenRoute, createTokenRoute, revokeTokenRoute } from './openapi/routes/tokens'
import { analytics, analyticsOriginal } from './controllers/analytics'
import { exportCsv, exportJson } from './controllers/exports'
import { listTokens, getToken, createToken, revokeToken } from './controllers/tokens'
import { authMiddleware } from './middleware/auth'
import { API_TAGS } from './constants/tags'

// Define environment interface
declare global {
  interface Env {
    DB: D1Database
    ENVIRONMENT: string
    API_TOKEN: string
    ENABLE_DELETE_ENDPOINT: string
  }

  // Define token interface for use in request context
  interface Token {
    id: string
    name: string
    key: string
    description?: string
    created_at?: number
    last_used_at?: number
    expires_at?: number | null
    is_active: boolean
    permissions: {
      read: boolean
      write: boolean
      delete: boolean
      token_management: boolean
    }
  }
}

// Create Hono app with OpenAPI support
const app = new OpenAPIHono<{ Bindings: Env }>()

// Register the security scheme for OpenAPI
app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'API Token',
  description: 'Enter your API token here. All endpoints except the webhook POST endpoint require authentication.'
})

// Add CORS headers
app.use('*', async (c: Context, next: Next) => {
  await next()
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
})

// Handle OPTIONS requests for CORS preflight
app.options('*', () => {
  return new Response('', { status: 204 })
})

// Define public paths that don't need authentication
const PUBLIC_PATHS = ['/', '/ui', '/api/v1/ui', '/api/docs', '/api/v1/docs', '/api/v1/openapi']

// Add authentication middleware (except for public paths)
app.use('*', async (c: Context, next: Next) => {
  // Skip authentication for public paths and webhook POST endpoint
  if (PUBLIC_PATHS.includes(c.req.path) ||
      (c.req.path === '/api/v1/webhooks' && c.req.method === 'POST')) {
    return next()
  }

  return authMiddleware(c, next)
})

// Add error handling
app.onError((err: Error, c: Context) => {
  console.error('Application error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Webhook routes
app.openapi(receiveWebhookRoute, receiveWebhook as any)
app.openapi(listWebhooksRoute, listWebhooks as any)
app.openapi(getWebhookRoute, getWebhook as any)

// Register the DELETE endpoint with conditional logic based on environment
app.openapi(deleteWebhookRoute, (async (c: any) => {
  // Check if DELETE endpoint is enabled
  if (c.env.ENABLE_DELETE_ENDPOINT === 'true') {
    // If enabled, process the request normally
    return deleteWebhook(c);
  } else {
    // If disabled, return a 404 Not Found response
    return c.json({
      error: 'The DELETE endpoint is currently disabled'
    }, 404);
  }
}) as any)

// Analytics routes
app.openapi(analyticsRoute, analytics as any)
app.openapi(analyticsOriginalRoute, analyticsOriginal as any)

// Export routes
app.openapi(exportCsvRoute, exportCsv as any)
app.openapi(exportJsonRoute, exportJson as any)

// Token management routes
app.openapi(listTokensRoute, listTokens as any)
app.openapi(getTokenRoute, getToken as any)
app.openapi(createTokenRoute, createToken as any)
app.openapi(revokeTokenRoute, revokeToken as any)

// OpenAPI documentation
app.doc('/api/v1/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'Privileges API',
    version: '1.0.0',
    description: 'API for privilege elevation events'
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Token',
        description: 'Enter your API token here. All endpoints except the webhook POST endpoint require authentication.'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  servers: [
    {
      url: '',
      description: 'API v1'
    }
  ],
  tags: [
    {
      name: API_TAGS.WEBHOOKS,
      description: 'Webhook management endpoints'
    },
    {
      name: API_TAGS.ANALYTICS,
      description: 'Analytics and reporting endpoints'
    },
    {
      name: API_TAGS.EXPORTS,
      description: 'Data export endpoints'
    },
    {
      name: API_TAGS.TOKENS,
      description: 'API token management endpoints'
    }
  ]
} as any)

// Swagger UI implementation with token persistence
app.get('/api/v1/ui', swaggerUI({
  url: '/api/v1/openapi',
  persistAuthorization: true, // Enable token persistence
  swaggerOptions: {
    onComplete: `
      function() {
        // Save token when authorization is completed
        const token = localStorage.getItem('swagger_ui_token');
        if (token) {
          localStorage.setItem('privileges_api_token', token);
        }
      }
    `,
    onAuthorize: `
      function(data) {
        // Save token when user clicks "Authorize"
        if (data.auth && data.auth.schema.type === 'http' && data.auth.schema.scheme === 'bearer') {
          localStorage.setItem('privileges_api_token', data.token);
        }
      }
    `,
    initOAuth: {
      useLocalStorage: true
    }
  }
} as any))

// Redirect root to Swagger UI
app.get('/', (c) => c.redirect('/api/v1/ui'))

// Redirect /ui to Swagger UI for backward compatibility
app.get('/ui', (c) => c.redirect('/api/v1/ui'))

export default app
