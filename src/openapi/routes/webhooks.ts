import { createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { WebhookSchema } from '../../types/webhook'
import { API_TAGS } from '../../constants/tags'

// POST /api/v1/webhooks - Receive webhook
export const receiveWebhookRoute = createRoute({
  method: 'post',
  path: '/api/v1/webhooks',
  tags: [API_TAGS.WEBHOOKS],
  summary: 'Receive webhook event',
  description: 'Endpoint for receiving privilege elevation events',
  request: {
    body: {
      content: {
        'application/json': {
          schema: WebhookSchema.omit({ id: true, received_at: true, created_at: true }),
          example: {
            user: "jappleseed",
            machine: "A7B45C3D-8F12-4E56-9D23-F1A8B7C6D5E4",
            event: "corp.sap.privileges.granted",
            reason: "Installing software",
            admin: true,
            timestamp: "2025-04-25T12:23:30Z",
            expires: "2025-04-25T12:28:30Z",
            custom_data: {
              department: "Developer",
              name: "My awesome Mac",
              os_version: "15.4.1",
              serial: "XYZ1234567"
            },
            client_version: 479,
            platform: "macOS",
            cf_network_version: "3826.500.111.1.1",
            os_version: "24.4.0",
            delayed: false
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Webhook received successfully',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            received_at: z.string().datetime()
          }),
          example: {
            id: "9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9",
            received_at: "2025-04-25T12:23:32.092Z"
          }
        }
      }
    },
    400: {
      description: 'Invalid webhook payload',
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

// GET /api/v1/webhooks - List webhooks
export const listWebhooksRoute = createRoute({
  method: 'get',
  path: '/api/v1/webhooks',
  tags: [API_TAGS.WEBHOOKS],
  security: [{ bearerAuth: [] }],
  summary: 'List webhook events',
  description: 'Retrieve webhook events with filtering and pagination',
  request: {
    query: z.object({
      limit: z.string()
        .optional()
        .openapi({
          description: 'Number of items per page (no maximum limit)',
          example: '50'
        }),
      event: z.enum(['corp.sap.privileges.granted', 'corp.sap.privileges.revoked']).optional().openapi({
        description: 'Filter by event type'
      }),
      delayed: z.enum(['true', 'false']).optional().openapi({
        description: 'Filter by delayed status'
      })
    })
  },
  responses: {
    200: {
      description: 'List of webhook events',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(WebhookSchema),
            pagination: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
              pages: z.number()
            })
          }),
          example: {
            data: [
              {
                id: "9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9",
                user: "henry",
                machine: "A7B45C3D-8F12-4E56-9D23-F1A8B7C6D5E4",
                event: "corp.sap.privileges.granted",
                reason: "Installing software",
                admin: true,
                timestamp: "2025-04-25T12:23:30Z",
                delayed: false,
                expires: "2025-04-25T12:28:30Z",
                received_at: "2025-04-25T12:23:32.092Z",
                custom_data: {
                  department: "Developer",
                  name: "My awesome Mac",
                  os_version: "15.4.1",
                  serial: "XYZ1234567"
                },
                client_version: 479,
                platform: "macOS",
                cf_network_version: "3826.500.111.1.1",
                os_version: "24.4.0",
                created_at: "2025-04-25T12:23:32.092Z"
              }
            ],
            pagination: {
              total: 1,
              page: 1,
              limit: 50,
              pages: 1
            }
          }
        }
      }
    }
  }
})

// GET /api/v1/webhooks/{id} - Get single webhook
export const getWebhookRoute = createRoute({
  method: 'get',
  path: '/api/v1/webhooks/{id}',
  tags: [API_TAGS.WEBHOOKS],
  security: [{ bearerAuth: [] }],
  summary: 'Get webhook event',
  description: 'Retrieve a single webhook event by ID',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Webhook event ID',
        example: '9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9'
      })
    })
  },
  responses: {
    200: {
      description: 'Webhook event details',
      content: {
        'application/json': {
          schema: WebhookSchema,
          example: {
            id: "9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9",
            user: "henry",
            machine: "A7B45C3D-8F12-4E56-9D23-F1A8B7C6D5E4",
            event: "corp.sap.privileges.granted",
            reason: "Installing software",
            admin: true,
            timestamp: "2025-04-25T12:23:30Z",
            delayed: false,
            expires: "2025-04-25T12:28:30Z",
            received_at: "2025-04-25T12:23:32.092Z",
            custom_data: {
              department: "developer",
              name: "Awesome Mac",
              os_version: "15.4.1",
              serial: "XYZ1234567"
            },
            client_version: 479,
            platform: "macOS",
            cf_network_version: "3826.500.111.1.1",
            os_version: "24.4.0",
            created_at: "2025-04-25T12:23:32.092Z"
          }
        }
      }
    },
    404: {
      description: 'Webhook not found',
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

// DELETE /api/v1/webhooks/{id} - Delete webhook
export const deleteWebhookRoute = createRoute({
  method: 'delete',
  path: '/api/v1/webhooks/{id}',
  tags: [API_TAGS.WEBHOOKS],
  security: [{ bearerAuth: [] }],
  summary: 'Delete webhook event',
  description: 'Permanently delete a webhook event',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Webhook event ID',
        example: '9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9'
      })
    })
  },
  responses: {
    200: {
      description: 'Webhook deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string()
          })
        }
      }
    },
    404: {
      description: 'Webhook not found',
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