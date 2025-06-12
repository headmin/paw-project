import { createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { TokenResponseSchema, TokenCreateSchema } from '../../types/token'
import { API_TAGS } from '../../constants/tags'

// List tokens route
export const listTokensRoute = createRoute({
  method: 'get',
  path: '/api/v1/tokens',
  tags: [API_TAGS.TOKENS],
  security: [{ bearerAuth: [] }],
  summary: 'List API tokens',
  description: 'Returns a list of all API tokens. Requires token_management permission. Service tokens cannot access this endpoint.',
  responses: {
    200: {
      description: 'List of API tokens',
      content: {
        'application/json': {
          schema: z.object({
            tokens: z.array(TokenResponseSchema)
          })
        }
      }
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    },
    403: {
      description: 'Forbidden - Insufficient permissions',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    }
  }
})

// Get token route
export const getTokenRoute = createRoute({
  method: 'get',
  path: '/api/v1/tokens/{id}',
  tags: [API_TAGS.TOKENS],
  security: [{ bearerAuth: [] }],
  summary: 'Get API token details',
  description: 'Returns details for a specific API token. Requires token_management permission. Service tokens cannot access this endpoint.',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Token ID (UUID format)',
        example: '9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9'
      })
    })
  },
  responses: {
    200: {
      description: 'API token details',
      content: {
        'application/json': {
          schema: TokenResponseSchema
        }
      }
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    },
    403: {
      description: 'Forbidden - Insufficient permissions',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    },
    404: {
      description: 'Token not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    }
  }
})

// Create token route
export const createTokenRoute = createRoute({
  method: 'post',
  path: '/api/v1/tokens',
  tags: [API_TAGS.TOKENS],
  security: [{ bearerAuth: [] }],
  summary: 'Create a new API token',
  description: `Creates a new API token. Available expiration periods:
- 1d: One day (temporary access)
- 7d: One week (short term)
- 30d: One month (standard)
- 90d: Three months (recommended)
- 365d: One year (long term)
- never: No expiration (permanent)`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: TokenCreateSchema,
          examples: {
            'Service Token (90 days)': {
              value: {
                name: "Short Term Analytics Service",
                description: "Token for gathering data for short-term analytics",
                expires_in: "90d"
              }
            },
            'Service Token (1 year)': {
              value: {
                name: "Service Access one year",
                description: "Token for continued service access over a year",
                expires_in: "365d"
              }
            },
            'Service Token (never expires)':{
              value: {
                name: "Continued Service Access",
                description: "Token for continued service access forever",
                expires_in: "never"
              }
            },
            'Temporary Token (1 day)': {
              value: {
                name: "Temporary Access",
                description: "One-day operation token",
                expires_in: "1d"
              }
            }
          }
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Token created successfully',
      content: {
        'application/json': {
          schema: TokenResponseSchema
        }
      }
    }
  }
})

// Revoke or delete token route
export const revokeTokenRoute = createRoute({
  method: 'delete',
  path: '/api/v1/tokens/{id}',
  tags: [API_TAGS.TOKENS],
  security: [{ bearerAuth: [] }],
  summary: 'Revoke or delete an API token',
  description: 'Revokes (deactivates) or permanently deletes an API token. Requires token_management permission.',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Token ID (UUID format)',
        example: '9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9'
      })
    }),
    query: z.object({
      action: z.enum(['revoke', 'delete']).default('revoke').openapi({
        description: 'Action to perform: "revoke" (deactivate) or "delete" (permanently remove)',
        example: 'revoke'
      })
    })
  },
  responses: {
    200: {
      description: 'API token revoked or deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string()
          })
        }
      }
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    },
    403: {
      description: 'Forbidden - Insufficient permissions',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    },
    404: {
      description: 'Token not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    }
  }
})
