import { createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { API_TAGS } from '../../constants/tags'

// Field metadata schema
const FieldMetadataSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string()
})

// Original analytics response schema (for backward compatibility)
const OriginalAnalyticsResponseSchema = z.object({
  timeframe: z.string(),
  total: z.number(),
  events: z.array(z.object({
    event: z.string(),
    count: z.number()
  })),
  topUsers: z.array(z.object({
    user: z.string(),
    count: z.number()
  })),
  topReasons: z.array(z.object({
    reason: z.string(),
    count: z.number()
  }))
})

// New analytics response schema for BI tools
const AnalyticsResponseSchema = z.object({
  metadata: z.object({
    totalRecords: z.number(),
    pageCount: z.number(),
    currentPage: z.number(),
    pageSize: z.number(),
    schema: z.array(FieldMetadataSchema)
  }),
  data: z.array(z.any())
})

// Original analytics route (for backward compatibility)
export const analyticsOriginalRoute = createRoute({
  method: 'get',
  path: '/api/v1/analytics/summary',
  tags: [API_TAGS.ANALYTICS],
  summary: 'Retrieve webhook events summary analytics',
  description: 'Get summary analytics data for webhook events including counts by event type, top users, and top reasons',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      timeframe: z
        .enum(['day', 'week', 'month', 'year'])
        .default('week')
        .openapi({
          description: 'Time period for data retrieval',
          example: 'week'
        })
    })
  },
  responses: {
    200: {
      description: 'Successfully retrieved analytics data',
      content: {
        'application/json': {
          schema: OriginalAnalyticsResponseSchema
        }
      }
    }
  }
})

// New analytics route for BI tools
export const analyticsRoute = createRoute({
  method: 'get',
  path: '/api/v1/analytics/events',
  tags: [API_TAGS.ANALYTICS],
  summary: 'Retrieve webhook events for analytics',
  description: 'Fetch webhook data optimized for BI tools with filtering, pagination, and field selection',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      period: z
        .enum(['1d', '7d', '30d', '90d', 'all'])
        .default('7d')
        .openapi({
          description: 'Time period for data retrieval'
        }),
      fields: z
        .string()
        .optional()
        .openapi({
          description: 'Comma-separated list of fields to include',
          example: 'admin,user,machine,event,reason,timestamp,delayed,custom_data'
        }),
      filter: z
        .string()
        .optional()
        .openapi({
          description: 'Filter expression',
          example: 'event eq "corp.sap.privileges.granted"'
        }),
      page: z
        .string()
        .optional()
        .openapi({
          description: 'Page number',
          example: '1'
        }),
      pageSize: z
        .string()
        .optional()
        .openapi({
          description: 'Number of records per page',
          example: '100'
        }),
      format: z
        .enum(['json', 'csv'])
        .default('json')
        .openapi({
          description: 'Response format'
        }),
      delayed: z
        .enum(['true', 'false'])
        .optional()
        .openapi({
          description: 'Filter by delayed status'
        })
    })
  },
  responses: {
    200: {
      description: 'Successfully retrieved analytics data',
      content: {
        'application/json': {
          schema: AnalyticsResponseSchema
        },
        'text/csv': {
          schema: z.string()
        }
      }
    }
  }
})