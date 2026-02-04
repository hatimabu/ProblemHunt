const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Supabase client - initialized lazily
let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key || url === 'YOUR_SUPABASE_PROJECT_URL' || url.includes('placeholder')) {
      return null; // Return null if not configured
    }
    
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

/**
 * Create a standardized API response
 */
function createResponse(statusCode, body, headers = {}) {
  return {
    status: statusCode,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers
    }
  };
}

/**
 * Create error response
 */
function errorResponse(statusCode, message) {
  return createResponse(statusCode, {
    error: message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get user ID from request (JWT verification)
 */
async function getUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Fallback to IP-based ID for anonymous users
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return Buffer.from(`${ip}-${userAgent}`).toString('base64').substring(0, 32);
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // Supabase not configured, use fallback
      const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      return Buffer.from(`${ip}-${userAgent}`).toString('base64').substring(0, 32);
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new Error('Invalid token');
    }
    return user.id;
  } catch (error) {
    // Fallback to IP-based ID
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return Buffer.from(`${ip}-${userAgent}`).toString('base64').substring(0, 32);
  }
}

/**
 * Get authenticated user ID (requires valid Supabase JWT)
 */
async function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    return null;
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return uuidv4();
}

/**
 * Validate required fields
 */
function validateRequired(obj, fields) {
  const missing = fields.filter(field => !obj[field]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null;
}

/**
 * Parse budget value from string like "$50/month" or "$10/use"
 */
function parseBudgetValue(budgetString) {
  const match = budgetString.match(/\$?(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Get current timestamp
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Calculate time ago string
 */
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return `${Math.floor(seconds / 604800)} weeks ago`;
}

module.exports = {
  createResponse,
  errorResponse,
  getUserId,
  getAuthenticatedUserId,
  generateId,
  validateRequired,
  parseBudgetValue,
  timestamp,
  timeAgo
};
