import { z } from '@hono/zod-openapi'

// Define the permissions schema
export const TokenPermissionsSchema = z.object({
  read: z.boolean().default(true).openapi({
    description: 'Permission to read data (always enabled)',
    example: true
  }),
  write: z.boolean().default(false).openapi({
    description: 'Permission to write data (create new webhooks)',
    example: false
  }),
  delete: z.boolean().default(false).openapi({
    description: 'Permission to delete data (delete webhooks)',
    example: false
  }),
  token_management: z.boolean().default(false).openapi({
    description: 'Permission to manage tokens (create, list, revoke tokens)',
    example: false
  })
}).openapi({
  description: 'Token permissions'
})

// Define the token schema
export const TokenSchema = z.object({
  id: z.string().uuid().openapi({
    description: 'Unique identifier for the token',
    example: '9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9'
  }),
  name: z.string().min(1).openapi({
    description: 'Name of the token',
    example: 'Analytics Service'
  }),
  key: z.string().min(1).openapi({
    description: 'The API token value',
    example: 'sk_1234567890abcdef'
  }),
  description: z.string().optional().openapi({
    description: 'Description of the token',
    example: 'Token for analytics service'
  }),
  created_at: z.number().int().openapi({
    description: 'Unix timestamp when the token was created',
    example: 1619712000
  }),
  last_used_at: z.number().int().nullable().openapi({
    description: 'Unix timestamp when the token was last used',
    example: 1619712000
  }),
  expires_at: z.number().int().nullable().openapi({
    description: 'Unix timestamp when the token expires',
    example: 1651248000
  }),
  is_active: z.boolean().openapi({
    description: 'Whether the token is active',
    example: true
  }),
  is_service_token: z.boolean().openapi({
    description: 'Whether this is a service token',
    example: false
  }),
  permissions: TokenPermissionsSchema.openapi({
    description: 'Token permissions'
  })
})

// Define the token creation schema (without id, created_at, last_used_at)
export const TokenCreateSchema = z.object({
  name: z.string().min(1).openapi({
    description: 'Name of the token',
    example: 'Analytics Token'
  }),
  description: z.string().optional().openapi({
    description: 'Description of the token (optional)',
    example: 'Token for analytics access'
  }),
  expires_in: z.enum(['1d', '7d', '30d', '90d', '365d', 'never']).openapi({
    description: 'Token expiration period (select one)',
    example: '30d',
    enum: ['1d', '7d', '30d', '90d', '365d', 'never']
  })
})

// Define the token response schema (without the key for listing)
export const TokenResponseSchema = TokenSchema.omit({ key: true })

// Define the token creation response schema (includes the key)
export const TokenCreateResponseSchema = z.object({
  token: TokenSchema,
  key: z.string().openapi({
    description: 'The API token value (only shown once)',
    example: 'sk_1234567890abcdef'
  })
})

// Export types
export type Token = z.infer<typeof TokenSchema>
export type TokenCreate = z.infer<typeof TokenCreateSchema>
export type TokenResponse = z.infer<typeof TokenResponseSchema>
export type TokenCreateResponse = z.infer<typeof TokenCreateResponseSchema>
export type TokenPermissions = z.infer<typeof TokenPermissionsSchema>
