import { Context } from 'hono'

// Field metadata for schema
const fieldMetadata: Record<string, { type: string; description: string }> = {
  id: { type: 'string', description: 'Webhook unique identifier' },
  user: { type: 'string', description: 'User identifier' },
  machine: { type: 'string', description: 'Machine identifier' },
  event: { type: 'string', description: 'Event type' },
  reason: { type: 'string', description: 'Reason for privilege change' },
  admin: { type: 'boolean', description: 'Whether admin privileges were granted' },
  timestamp: { type: 'string', description: 'Event timestamp' },
  expires: { type: 'string', description: 'Expiration timestamp' },
  received_at: { type: 'string', description: 'When webhook was received' },
  custom_data: { type: 'object', description: 'Custom data including machine name, OS version, and serial' },
  client_version: { type: 'number', description: 'Client version' },
  platform: { type: 'string', description: 'Platform (e.g., macOS)' },
  cf_network_version: { type: 'string', description: 'CF Network version' },
  os_version: { type: 'string', description: 'OS version' },
  delayed: { type: 'boolean', description: 'Whether event was delayed' },
  created_at: { type: 'string', description: 'Creation timestamp' }
}

// Parse period parameter to SQL time parameter
function getPeriodParam(period: string): string {
  switch (period) {
    case '1d':
      return '-1 day'
    case '7d':
      return '-7 days'
    case '30d':
      return '-30 days'
    case '90d':
      return '-90 days'
    case 'all':
      return '-100 years' // Effectively all records
    default:
      return '-7 days' // Default to 7 days
  }
}

// Parse filter expression to SQL WHERE clause
function parseFilter(filter: string): { clause: string; params: any[] } {
  if (!filter) {
    return { clause: '', params: [] }
  }

  const params: any[] = []
  let clause = ''

  // Simple filter parser for expressions like "field eq value"
  const parts = filter.match(/(\w+)\s+(eq|ne|gt|lt|ge|le)\s+"([^"]+)"/i)

  if (parts && parts.length === 4) {
    const [_, field, operator, value] = parts

    // Map operator to SQL
    let sqlOperator = '='
    switch (operator.toLowerCase()) {
      case 'eq': sqlOperator = '='; break
      case 'ne': sqlOperator = '!='; break
      case 'gt': sqlOperator = '>'; break
      case 'lt': sqlOperator = '<'; break
      case 'ge': sqlOperator = '>='; break
      case 'le': sqlOperator = '<='; break
    }

    clause = ` AND ${field} ${sqlOperator} ?`
    params.push(value)
  }

  return { clause, params }
}

// Convert DB row to proper types
function transformRow(row: any, requestedFields: string[]): any {
  // Create a new object with only the requested fields
  const result: any = {};

  // Process each field that exists in the row
  for (const field of requestedFields) {
    if (field in row) {
      // Special handling for specific fields
      if (field === 'admin') {
        result.admin = row.admin === 1;
      } else if (field === 'delayed') {
        result.delayed = row.delayed === 1;
      } else if (field === 'custom_data') {
        result.custom_data = row.custom_data ?
          (typeof row.custom_data === 'string' ? JSON.parse(row.custom_data) : row.custom_data) :
          {};
      } else {
        // Copy the field as is
        result[field] = row[field];
      }
    }
  }

  return result;
}

// Generate schema based on selected fields
function generateSchema(fields: string[]): any[] {
  return fields.map(field => ({
    name: field,
    type: fieldMetadata[field]?.type || 'string',
    description: fieldMetadata[field]?.description || field
  }))
}

// Convert data to CSV
function convertToCSV(data: any[], fields: string[]): string {
  // Header row
  let csv = fields.join(',') + '\n'

  // Data rows
  for (const row of data) {
    const values = fields.map(field => {
      let value = row[field]

      // Handle special cases
      if (field === 'custom_data' && typeof value === 'object') {
        value = JSON.stringify(value)
      }

      // Escape and quote strings with commas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = '"' + value.replace(/"/g, '""') + '"'
      }

      return value === null || value === undefined ? '' : value
    })

    csv += values.join(',') + '\n'
  }

  return csv
}

// Original analytics endpoint for backward compatibility
export const analyticsOriginal = async (c: Context) => {
  try {
    const timeframe = c.req.query('timeframe') || 'week'

    // Get counts by event type
    const eventCountsQuery = `
      SELECT event, COUNT(*) as count
      FROM webhooks
      WHERE timestamp >= datetime('now', ?)
      GROUP BY event
    `

    let timeParam: string
    switch (timeframe) {
      case 'day':
        timeParam = '-1 day'
        break
      case 'month':
        timeParam = '-1 month'
        break
      case 'year':
        timeParam = '-1 year'
        break
      case 'week':
      default:
        timeParam = '-7 days'
        break
    }

    const eventCountsStmt = c.env.DB.prepare(eventCountsQuery)
    const eventCountsResult = await eventCountsStmt.bind(timeParam).all()

    // Get top users
    const topUsersQuery = `
      SELECT user, COUNT(*) as count
      FROM webhooks
      WHERE timestamp >= datetime('now', ?)
      GROUP BY user
      ORDER BY count DESC
      LIMIT 5
    `

    const topUsersStmt = c.env.DB.prepare(topUsersQuery)
    const topUsersResult = await topUsersStmt.bind(timeParam).all()

    // Get top reasons
    const topReasonsQuery = `
      SELECT reason, COUNT(*) as count
      FROM webhooks
      WHERE timestamp >= datetime('now', ?)
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 5
    `

    const topReasonsStmt = c.env.DB.prepare(topReasonsQuery)
    const topReasonsResult = await topReasonsStmt.bind(timeParam).all()

    // Get total count
    const totalCountQuery = `
      SELECT COUNT(*) as total
      FROM webhooks
      WHERE timestamp >= datetime('now', ?)
    `

    const totalCountStmt = c.env.DB.prepare(totalCountQuery)
    const totalCountResult = await totalCountStmt.bind(timeParam).first()

    return c.json({
      timeframe,
      total: totalCountResult?.total || 0,
      events: eventCountsResult.results,
      topUsers: topUsersResult.results,
      topReasons: topReasonsResult.results
    })
  } catch (error) {
    console.error('Error generating analytics:', error)
    return c.json({ error: 'Failed to generate analytics' }, 500)
  }
}

// New analytics endpoint for BI tools
export const analytics = async (c: Context) => {
  try {
    // Get query parameters
    const period = c.req.query('period') || '7d'
    const fieldsParam = c.req.query('fields')
    const filter = c.req.query('filter') || ''
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '100')
    const format = c.req.query('format') || 'json'
    const delayed = c.req.query('delayed')

    // Parse fields parameter
    const allFields = [
      'id', 'user', 'machine', 'event', 'reason', 'admin', 'timestamp', 'delayed',
      'expires', 'received_at', 'custom_data', 'client_version', 'platform',
      'cf_network_version', 'os_version', 'created_at'
    ]

    const fields = fieldsParam ?
      fieldsParam.split(',').filter(f => allFields.includes(f)) :
      allFields

    // Ensure we have at least some fields
    if (fields.length === 0) {
      fields.push('id', 'user', 'machine', 'event', 'reason', 'admin', 'timestamp', 'delayed', 'custom_data')
    }

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize

    // Get time parameter based on period
    const timeParam = getPeriodParam(period)

    // Parse filter expression
    const { clause: filterClause, params: filterParams } = parseFilter(filter)

    // Build query
    let query = `
      SELECT ${fields.join(', ')}
      FROM webhooks
      WHERE timestamp >= datetime('now', ?)
      ${filterClause}
    `

    // Add delayed filter if provided
    if (delayed === 'true' || delayed === 'false') {
      query += ` AND delayed = ?`
    }

    // Add order, limit and offset
    query += `
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `

    // Prepare parameters
    let params = [timeParam, ...filterParams]

    // Add delayed parameter if provided
    if (delayed === 'true' || delayed === 'false') {
      params.push(delayed === 'true' ? 1 : 0)
    }

    // Add pagination parameters
    params = [...params, pageSize, offset]

    // Execute query
    const stmt = c.env.DB.prepare(query)
    const result = await stmt.bind(...params).all()

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM webhooks
      WHERE timestamp >= datetime('now', ?)
      ${filterClause}
    `

    // Add delayed filter if provided
    if (delayed === 'true' || delayed === 'false') {
      countQuery += ` AND delayed = ?`
    }

    const countStmt = c.env.DB.prepare(countQuery)

    // Prepare count parameters
    let countParams = [timeParam, ...filterParams]

    // Add delayed parameter if provided
    if (delayed === 'true' || delayed === 'false') {
      countParams.push(delayed === 'true' ? 1 : 0)
    }

    const countResult = await countStmt.bind(...countParams).first()
    const totalRecords = countResult?.total || 0

    // Calculate pagination info
    const pageCount = Math.ceil(totalRecords / pageSize)

    // Transform results
    const data = result.results.map((row: any) => transformRow(row, fields))

    // Generate schema based on selected fields
    const schema = generateSchema(fields)

    // Prepare response
    const response = {
      metadata: {
        totalRecords,
        pageCount,
        currentPage: page,
        pageSize,
        schema
      },
      data
    }

    // Return response in requested format
    if (format === 'csv') {
      const csv = convertToCSV(data, fields)
      c.header('Content-Type', 'text/csv')
      c.header('Content-Disposition', 'attachment; filename="analytics_export.csv"')
      return c.body(csv)
    } else {
      return c.json(response)
    }
  } catch (error) {
    console.error('Error generating analytics:', error)
    return c.json({ error: 'Failed to generate analytics' }, 500)
  }
}
