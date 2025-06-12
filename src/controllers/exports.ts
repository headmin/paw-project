import { Context } from 'hono'

// Parse period parameter to SQL time parameter
function getPeriodParam(period: string): string {
  switch (period) {
    case '7d':
      return '-7 days'
    case '14d':
      return '-14 days'
    case '30d':
      return '-30 days'
    case '90d':
      return '-90 days'
    case '180d':
      return '-180 days'
    case 'all':
      return '-100 years' // Effectively all records
    default:
      return '-7 days' // Default to 7 days
  }
}

// Export webhooks as CSV
export const exportCsv = async (c: Context) => {
  try {
    // Get query parameters for filtering
    const period = c.req.query('period') || '7d'
    const event = c.req.query('event')

    // Get time parameter based on period
    const timeParam = getPeriodParam(period)

    // Build query
    let query = 'SELECT * FROM webhooks WHERE timestamp >= datetime("now", ?)'
    const params: any[] = [timeParam]

    if (event) {
      query += ' AND event = ?'
      params.push(event)
    }

    query += ' ORDER BY timestamp DESC'

    const stmt = c.env.DB.prepare(query)
    const result = await stmt.bind(...params).all()

    // Generate CSV header
    let csv = 'id,user,machine,event,reason,admin,timestamp,expires,received_at,client_version,platform,cf_network_version,os_version,delayed,created_at,custom_data\n'

    // Generate CSV rows
    for (const row of result.results) {
      const customData = row.custom_data ? JSON.parse(row.custom_data) : {}
      const csvRow = [
        row.id,
        row.user,
        row.machine,
        row.event,
        `"${row.reason.replace(/"/g, '""')}"`, // Escape quotes in reason
        row.admin === 1 ? 'true' : 'false',
        row.timestamp,
        row.expires || '',
        row.received_at,
        row.client_version,
        row.platform,
        row.cf_network_version || '',
        row.os_version || '',
        row.delayed === 1 ? 'true' : 'false',
        row.created_at,
        `"${JSON.stringify(customData).replace(/"/g, '""')}"`
      ].join(',')

      csv += csvRow + '\n'
    }

    // Set response headers
    c.header('Content-Type', 'text/csv')
    c.header('Content-Disposition', 'attachment; filename="webhooks-export.csv"')

    return c.body(csv)
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return c.json({ error: 'Failed to export data as CSV' }, 500)
  }
}

// Export webhooks as JSON
export const exportJson = async (c: Context) => {
  try {
    // Get query parameters for filtering
    const period = c.req.query('period') || '7d'
    const event = c.req.query('event')

    // Get time parameter based on period
    const timeParam = getPeriodParam(period)

    // Build query
    let query = 'SELECT * FROM webhooks WHERE timestamp >= datetime("now", ?)'
    const params: any[] = [timeParam]

    if (event) {
      query += ' AND event = ?'
      params.push(event)
    }

    query += ' ORDER BY timestamp DESC'

    const stmt = c.env.DB.prepare(query)
    const result = await stmt.bind(...params).all()

    // Transform results
    const webhooks = result.results.map((row: any) => ({
      ...row,
      admin: row.admin === 1,
      delayed: row.delayed === 1,
      custom_data: row.custom_data ? JSON.parse(row.custom_data) : {}
    }))

    // Set response headers
    c.header('Content-Type', 'application/json')
    c.header('Content-Disposition', 'attachment; filename="webhooks-export.json"')

    return c.json(webhooks)
  } catch (error) {
    console.error('Error exporting JSON:', error)
    return c.json({ error: 'Failed to export data as JSON' }, 500)
  }
}
