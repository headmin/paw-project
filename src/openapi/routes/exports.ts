import { createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { API_TAGS } from '../../constants/tags'

// Predefined periods for the dropdown
const PERIODS = ['7d', '14d', '30d', '90d', '180d', 'all'] as const

// Common query parameters for both export routes
const exportQueryParams = z.object({
  period: z
    .enum(PERIODS)
    .default('7d')
    .openapi({
      description: 'Select time period (all = no filtering)',
      enum: ['7d', '14d', '30d', '90d', '180d', 'all'],
      default: '7d'
    }),
  event: z
    .enum(['corp.sap.privileges.granted', 'corp.sap.privileges.revoked'])
    .optional()
    .openapi({
      description: 'Filter by event type'
    })
})

export const exportCsvRoute = createRoute({
  method: 'get',
  path: '/api/v1/exports/csv',
  tags: [API_TAGS.EXPORTS],
  summary: 'Export webhooks data as CSV',
  description: 'Export webhook events in CSV format. Defaults to last 7 days of data.',
  security: [{ bearerAuth: [] }],
  request: {
    query: exportQueryParams
  },
  responses: {
    200: {
      description: 'CSV file containing webhook events',
      headers: {
        'Content-Disposition': {
          schema: {
            type: 'string',
            example: 'attachment; filename="webhooks-export.csv"'
          },
          description: 'Attachment filename'
        }
      },
      content: {
        'text/csv': {
          schema: z.string()
        }
      }
    }
  }
})

export const exportJsonRoute = createRoute({
  method: 'get',
  path: '/api/v1/exports/json',
  tags: [API_TAGS.EXPORTS],
  summary: 'Export webhooks data as JSON',
  description: 'Export webhook events in JSON format. Defaults to last 7 days of data.',
  security: [{ bearerAuth: [] }],
  request: {
    query: exportQueryParams
  },
  responses: {
    200: {
      description: 'JSON file containing webhook events',
      headers: {
        'Content-Disposition': {
          schema: {
            type: 'string',
            example: 'attachment; filename="webhooks-export.json"'
          },
          description: 'Attachment filename'
        }
      },
      content: {
        'application/json': {
          schema: z.array(z.any())
        }
      }
    }
  }
})