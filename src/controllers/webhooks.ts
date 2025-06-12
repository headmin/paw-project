import { Context } from 'hono'
import { WebhookSchema } from '../types/webhook'

// Receive webhook (no auth required)
export const receiveWebhook = async (c: Context) => {
  const requestId = crypto.randomUUID().slice(0, 8); // Short ID for log correlation
  
  try {
    const rawBody = await c.req.text();
    const userAgent = c.req.header('User-Agent') || '';
    
    console.log(`[${requestId}] 📥 Incoming Webhook:`, {
      userAgent,
      contentType: c.req.header('Content-Type'),
      bodyLength: rawBody.length
    });

    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
      console.log(`[${requestId}] ✅ Parsed JSON:`, {
        event: webhookData.event,
        user: webhookData.user,
        machine: webhookData.machine
      });
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown JSON parsing error';
      console.error(`[${requestId}] ❌ JSON Parse Error:`, errorMessage);
      console.error(`[${requestId}] Raw Body:`, rawBody);
      return c.json({ 
        error: 'Invalid JSON payload',
        details: errorMessage,
        requestId
      }, 400);
    }

    // Handle empty string for expires field
    if (webhookData.expires === '') {
      webhookData.expires = undefined;
    }

    // Log validation attempt
    console.log(`[${requestId}] 🔍 Validating Data:`, {
      event: webhookData.event,
      user: webhookData.user,
      machine: webhookData.machine,
      timestamp: webhookData.timestamp
    });

    try {
      const validatedData = WebhookSchema.parse(webhookData);
      console.log(`[${requestId}] ✅ Validation Passed`);
    } catch (validationError) {
      const errors = validationError instanceof Error ? validationError.message : 'Unknown validation error';
      console.error(`[${requestId}] ❌ Validation Failed:`, {
        errors,
        receivedData: webhookData
      });
      return c.json({
        error: 'Validation failed',
        details: errors,
        requestId
      }, 400);
    }

    // Extract client_version, platform, cf_network_version, and os_version from User-Agent if not provided
    console.log('User-Agent:', userAgent);

    // Example User-Agent: PrivilegesAgent/479 CFNetwork/3826.500.111.1.1 Darwin/24.4.0

    // Extract client_version from User-Agent if not provided in payload
    if (!webhookData.client_version) {
      const versionMatch = userAgent.match(/PrivilegesAgent\/(\d+)/);
      if (versionMatch && versionMatch[1]) {
        webhookData.client_version = parseInt(versionMatch[1], 10);
      } else {
        // Default value if we can't extract from User-Agent
        webhookData.client_version = 1;
      }
    }

    // Extract cf_network_version from User-Agent
    if (!webhookData.cf_network_version) {
      const cfNetworkMatch = userAgent.match(/CFNetwork\/([^\s]+)/);
      if (cfNetworkMatch && cfNetworkMatch[1]) {
        webhookData.cf_network_version = cfNetworkMatch[1];
      }
    }
    // Determine the platform of the webhook sender
    // This ensures we always have platform information, even if not provided in the webhook data
    if (!webhookData.platform) {
      if (userAgent.includes('Darwin')) {
        // 'Darwin' in the User-Agent indicates macOS
        webhookData.platform = 'macOS';
      } else {
        // Use existing platform, full User-Agent, or 'Unknown' as fallback
        webhookData.platform = webhookData.platform || userAgent || 'Unknown';
      }
    }


    // Extract os_version from User-Agent
    if (!webhookData.os_version) {
      const osVersionMatch = userAgent.match(/Darwin\/([^\s]+)/);
      if (osVersionMatch && osVersionMatch[1]) {
        webhookData.os_version = osVersionMatch[1];
      } else {
        webhookData.os_version = webhookData.os_version || null;
      }
    }

    // Extract platform from User-Agent if not provided in payload
    if (!webhookData.platform) {
      if (userAgent.includes('Darwin')) {
        webhookData.platform = 'macOS';
      } else {
        webhookData.platform = webhookData.platform || userAgent || 'Unknown';
      }
    }

    // Generate UUID for the webhook
    const id = crypto.randomUUID();
    webhookData.id = id;

    // Add received_at timestamp
    const received_at = new Date().toISOString();
    webhookData.received_at = received_at;

    // Validate with Zod schema
    const validatedData = WebhookSchema.parse(webhookData);
    console.log('Validated webhook data:', validatedData);

    // Store in database
    try {
      const insertData = {
        id,
        user: validatedData.user,
        machine: validatedData.machine,
        event: validatedData.event,
        reason: validatedData.reason,
        admin: validatedData.admin ? 1 : 0,
        timestamp: validatedData.timestamp,
        expires: validatedData.expires || null,
        received_at,
        custom_data: JSON.stringify(validatedData.custom_data || {}),
        client_version: validatedData.client_version,
        platform: validatedData.platform,
        cf_network_version: validatedData.cf_network_version || null,
        os_version: validatedData.os_version || null,
        delayed: validatedData.delayed ? 1 : 0,
        created_at: received_at
      };

      console.log(`[${requestId}] 📝 Attempting DB Insert:`, insertData);

      const stmt = c.env.DB.prepare(`
        INSERT INTO webhooks (
          id, user, machine, event, reason, admin,
          timestamp, expires, received_at, custom_data,
          client_version, platform,
          cf_network_version, os_version, delayed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      await stmt.bind(
        insertData.id,
        insertData.user,
        insertData.machine,
        insertData.event,
        insertData.reason,
        insertData.admin,
        insertData.timestamp,
        insertData.expires,
        insertData.received_at,
        insertData.custom_data,
        insertData.client_version,
        insertData.platform,
        insertData.cf_network_version,
        insertData.os_version,
        insertData.delayed,
        insertData.created_at
      ).run();

      console.log(`[${requestId}] ✅ DB Insert Successful`);
      return c.json({ id, received_at });
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.error(`[${requestId}] ❌ DB Insert Failed:`, dbError);
      return c.json({ 
        error: 'Database operation failed',
        requestId,
        details: errorMessage 
      }, 500);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Server error processing webhook' }, 500);
  }
}

// List webhooks (auth required)
export const listWebhooks = async (c: Context) => {
  try {
    // Get query parameters
    const limit = parseInt(c.req.query('limit') || '50')
    const event = c.req.query('event')
    const delayed = c.req.query('delayed')

    // Always start from the first page
    const page = 1
    const offset = 0

    // Build query
    let query = 'SELECT * FROM webhooks WHERE 1=1'
    const params: any[] = []

    if (event) {
      query += ' AND event = ?'
      params.push(event)
    }

    if (delayed === 'true' || delayed === 'false') {
      query += ' AND delayed = ?'
      params.push(delayed === 'true' ? 1 : 0)
    }

    // Count total matching records
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countStmt = c.env.DB.prepare(countQuery)
    const countResult = await countStmt.bind(...params).first()
    const total = countResult?.total || 0

    // Get paginated results
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const stmt = c.env.DB.prepare(query)
    const result = await stmt.bind(...params).all()

    // Transform results
    const webhooks = result.results.map((row: any) => ({
      ...row,
      admin: row.admin === 1,
      delayed: row.delayed === 1,
      custom_data: row.custom_data ? JSON.parse(row.custom_data) : {}
    }))

    // Calculate pagination info
    const pages = Math.ceil(total / limit)

    return c.json({
      data: webhooks,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    })
  } catch (error) {
    console.error('Error listing webhooks:', error)
    return c.json({ error: 'Failed to retrieve webhooks' }, 500)
  }
}

// Get webhook by ID (auth required)
export const getWebhook = async (c: Context) => {
  try {
    const id = c.req.param('id')

    const stmt = c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?')
    const result = await stmt.bind(id).first()

    if (!result) {
      return c.json({ error: 'Webhook not found' }, 404)
    }

    // Transform result
    const webhook = {
      ...result,
      admin: result.admin === 1,
      delayed: result.delayed === 1,
      custom_data: result.custom_data ? JSON.parse(result.custom_data) : {}
    }

    return c.json(webhook)
  } catch (error) {
    console.error('Error getting webhook:', error)
    return c.json({ error: 'Failed to retrieve webhook' }, 500)
  }
}

// Delete webhook (auth required)
export const deleteWebhook = async (c: Context) => {
  try {
    const id = c.req.param('id')

    // Check if webhook exists
    const checkStmt = c.env.DB.prepare('SELECT id FROM webhooks WHERE id = ?')
    const exists = await checkStmt.bind(id).first()

    if (!exists) {
      return c.json({ error: 'Webhook not found' }, 404)
    }

    // Delete webhook
    const deleteStmt = c.env.DB.prepare('DELETE FROM webhooks WHERE id = ?')
    await deleteStmt.bind(id).run()

    return c.json({ message: 'Webhook deleted successfully' })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return c.json({ error: 'Failed to delete webhook' }, 500)
  }
}
