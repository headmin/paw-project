import { Context } from 'hono'
import { TokenCreateSchema } from '../types/token'
import { generateSecureToken, calculateExpiration } from '../utils/token'

// List all tokens
export const listTokens = async (c: Context) => {
  try {
    // Get the current token from context
    const currentToken = c.get('token')

    // Check if the token has token_management permission
    if (!currentToken.permissions.token_management) {
      return c.json({ error: 'Insufficient permissions to list tokens' }, 403)
    }

    // Query the database for all tokens
    const { results } = await c.env.DB.prepare(`
      SELECT
        id, name, description, created_at, last_used_at,
        expires_at, is_active, permissions, is_service_token
      FROM api_keys
      ORDER BY created_at DESC
    `).all()

    // Parse the permissions JSON for each token
    const tokens = results.map((token: any) => ({
      ...token,
      is_active: token.is_active === 1,
      is_service_token: token.is_service_token === 1,
      permissions: JSON.parse(token.permissions)
    }))

    return c.json({ tokens })
  } catch (error) {
    console.error('Error listing tokens:', error)
    return c.json({ error: 'Server error listing tokens' }, 500)
  }
}

// Get a specific token
export const getToken = async (c: Context) => {
  try {
    const id = c.req.param('id')

    // Get the current token from context
    const currentToken = c.get('token')

    // Check if the token has token_management permission
    if (!currentToken.permissions.token_management) {
      return c.json({ error: 'Insufficient permissions to view token details' }, 403)
    }

    // Query the database for the token
    const token = await c.env.DB.prepare(`
      SELECT
        id, name, description, created_at, last_used_at,
        expires_at, is_active, permissions, is_service_token
      FROM api_keys
      WHERE id = ?
    `).bind(id).first()

    if (!token) {
      return c.json({ error: 'Token not found' }, 404)
    }

    // Parse the permissions JSON
    return c.json({
      ...token,
      is_active: token.is_active === 1,
      is_service_token: token.is_service_token === 1,
      permissions: JSON.parse(token.permissions)
    })
  } catch (error) {
    console.error('Error getting token:', error)
    return c.json({ error: 'Server error getting token' }, 500)
  }
}

// Create a new token
export const createToken = async (c: Context) => {
  try {
    const body = await c.req.json()

    // Get the current token from context
    const currentToken = c.get('token')

    // Check if the token has token_management permission
    if (!currentToken.permissions.token_management) {
      return c.json({ error: 'Insufficient permissions to create tokens' }, 403)
    }

    // Validate the request body
    const validatedData = TokenCreateSchema.parse(body)

    // Generate a new token key
    const key = generateSecureToken()

    // Generate a UUID for the token
    const id = crypto.randomUUID()

    // Set default permissions - read-only
    const permissions = {
      read: true,
      write: false,
      delete: false,
      token_management: false
    }

    // Current timestamp
    const now = Math.floor(Date.now() / 1000)

    // Calculate expiration timestamp
    let expiresAt = null;
    if (validatedData.expires_in !== 'never') {
      expiresAt = calculateExpiration(validatedData.expires_in);
    }

    console.log(`Calculated expiration: ${expiresAt}`);

    // Validate that the expiration is in the future if provided
    if (expiresAt !== null) {
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt <= now) {
        return c.json({
          error: 'Invalid expiration time',
          message: 'Expiration time must be in the future'
        }, 400);
      }
    }

    // Insert the token into the database
    await c.env.DB.prepare(`
      INSERT INTO api_keys (
        id, name, key, description, created_at,
        expires_at, is_active, permissions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      validatedData.name,
      key,
      validatedData.description || null,
      now,
      expiresAt,
      1, // is_active
      JSON.stringify(permissions)
    ).run()

    // Create a simplified response
    return c.json({
      token: key,
      id: id,
      name: validatedData.name,
      description: validatedData.description || null,
      created_at: now,
      expires_at: expiresAt,
      expires_in: validatedData.expires_in
    }, 201)
  } catch (error: any) {
    console.error('Error creating token:', error)

    // Handle validation errors
    if (error && error.name === 'ZodError') {
      return c.json({
        error: 'Invalid token data',
        details: error.errors || 'Validation failed'
      }, 400)
    }

    // Handle database errors
    if (error && error.message && error.message.includes('D1_ERROR')) {
      return c.json({
        error: 'Database error',
        message: 'Error storing token in database'
      }, 500)
    }

    // Handle any other errors
    return c.json({
      error: 'Server error creating token',
      message: error?.message || 'Unknown error occurred'
    }, 500)
  }
}

// Revoke or delete a token
export const revokeToken = async (c: Context) => {
  try {
    const id = c.req.param('id')
    const action = c.req.query('action') || 'revoke'

    console.log(`Token action request - ID: ${id}, Action: ${action}`);

    // Get the current token from context
    const currentToken = c.get('token')

    console.log(`Current token: ${currentToken.id}, Permissions: ${JSON.stringify(currentToken.permissions)}`)

    // Check if the token has token_management permission
    if (!currentToken.permissions.token_management) {
      return c.json({ error: 'Insufficient permissions to manage tokens' }, 403)
    }

    // Check if the token exists
    const token = await c.env.DB.prepare(`
      SELECT id FROM api_keys WHERE id = ?
    `).bind(id).first()

    if (!token) {
      return c.json({ error: 'Token not found' }, 404)
    }

    // Prevent modifying your own token
    if (id === currentToken.id) {
      return c.json({ error: 'Cannot modify your own token' }, 400)
    }

    // Perform the requested action
    console.log(`Performing action: ${action} on token: ${id}`);

    if (action === 'delete') {
      // Permanently delete the token
      console.log(`Deleting token: ${id}`);
      const result = await c.env.DB.prepare(`
        DELETE FROM api_keys WHERE id = ?
      `).bind(id).run();

      console.log(`Delete result:`, result);

      return c.json({
        success: true,
        message: 'Token permanently deleted'
      })
    } else {
      // Default action: revoke (deactivate) the token
      console.log(`Revoking token: ${id}`);
      const result = await c.env.DB.prepare(`
        UPDATE api_keys SET is_active = 0 WHERE id = ?
      `).bind(id).run();

      console.log(`Revoke result:`, result);

      return c.json({
        success: true,
        message: 'Token revoked successfully'
      })
    }
  } catch (error: any) {
    console.error('Error managing token:', error)

    // Log detailed error information
    if (error && error.stack) {
      console.error('Error stack:', error.stack)
    }

    // Handle specific error types
    if (error && error.name === 'TypeError') {
      return c.json({
        error: 'Type error',
        message: error.message || 'Invalid data type in request',
        details: error.stack?.split('\n')[0] || 'Unknown error'
      }, 400)
    }

    // Handle database errors
    if (error && error.message && error.message.includes('D1_ERROR')) {
      return c.json({
        error: 'Database error',
        message: 'Error updating token in database'
      }, 500)
    }

    // Default error response
    return c.json({
      error: 'Server error managing token',
      message: error?.message || 'Unknown error occurred'
    }, 500)
  }
}
