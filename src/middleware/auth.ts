import { Context, Next } from 'hono'
import { isTokenExpired } from '../utils/token'

export const authMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path;
  const method = c.req.method;

  // Skip auth for Swagger UI, documentation, and static assets
  if (path === '/' ||
      path === '/ui' ||
      path === '/api/v1/ui' ||
      path === '/api/docs' ||
      path === '/api/v1/openapi' ||
      path.startsWith('/swagger-ui') ||
      path.startsWith('/static/') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.png') ||
      path.endsWith('.ico')) {
    return next();
  }

  // Skip auth for webhook POST endpoint
  if (path === '/api/v1/webhooks' && method === 'POST') {
    return next();
  }

  // Skip auth for OPTIONS requests (CORS preflight)
  if (method === 'OPTIONS') {
    return next();
  }

  // For all other paths, require authentication
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized - Bearer token required' }, 401)
  }

  const tokenKey = authHeader.replace('Bearer ', '')

  // Get the API_TOKEN from environment
  const envToken = c.env.API_TOKEN;

  // Check if this is a token-related endpoint
  const isTokenEndpoint = path.startsWith('/api/v1/tokens');

  // Force string comparison to handle any type issues
  const isMatch = String(tokenKey) === String(envToken);

  // Check if token matches the API_TOKEN environment variable
  // This is the primary authentication method and doesn't require database access
  if (isMatch) {
    // Set a default admin token in context with full permissions
    c.set('token', {
      id: 'env-default',
      name: 'Environment Token',
      key: tokenKey,
      is_active: true,
      is_service_token: false,
      permissions: {
        read: true,
        write: true,
        delete: true,
        token_management: true
      }
    });
    return next();
  }

  // If not the environment token, check the database
  try {
    // Query the database for the token
    const tokenRecord = await c.env.DB.prepare(`
      SELECT
        id, name, key, description, created_at, last_used_at,
        expires_at, is_active, permissions, is_service_token
      FROM api_keys
      WHERE key = ?
    `).bind(tokenKey).first();

    // If token not found, return unauthorized
    if (!tokenRecord) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Check if token is active
    if (tokenRecord.is_active !== 1) {
      return c.json({ error: 'Unauthorized - Token is inactive' }, 401);
    }

    // Check if token is expired
    if (isTokenExpired(tokenRecord.expires_at)) {
      return c.json({ error: 'Unauthorized - Token is expired' }, 401);
    }

    // Parse permissions
    const permissions = JSON.parse(tokenRecord.permissions);

    // Check if this is a service token
    const isServiceToken = tokenRecord.is_service_token === 1;

    // If this is a service token trying to access token endpoints, block access
    if (isServiceToken && isTokenEndpoint) {
      return c.json({
        error: 'Forbidden - Service tokens cannot access token management endpoints'
      }, 403);
    }

    // Update last_used_at
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB.prepare(`
      UPDATE api_keys SET last_used_at = ? WHERE id = ?
    `).bind(now, tokenRecord.id).run();

    // Set token in context for use in controllers
    c.set('token', {
      id: tokenRecord.id,
      name: tokenRecord.name,
      key: tokenRecord.key,
      description: tokenRecord.description,
      created_at: tokenRecord.created_at,
      last_used_at: now,
      expires_at: tokenRecord.expires_at,
      is_active: true,
      is_service_token: isServiceToken,
      permissions
    });

    return next();
  } catch (error) {
    console.error('Error validating token:', error);
    return c.json({ error: 'Server error during authentication' }, 500);
  }
}
