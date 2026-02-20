/**
 * Supabase Authentication Helper for Python Functions
 *
 * Provides utilities to:
 * - Retrieve the Supabase access token from the current session
 * - Make authenticated HTTP requests to Python/Azure Functions API
 * - Handle token refresh and error cases
 * - Support both local and cloud-deployed endpoints
 *
 * Usage:
 *   import { authenticatedFetch } from './auth-helper';
 *   const response = await authenticatedFetch('/api/problems', {
 *     method: 'POST',
 *     body: { title: 'My Problem', description: 'Description' }
 *   });
 */

import { supabase } from '../../lib/supabaseClient';
import { buildApiUrl } from './api-config';
import {
  createRequestId,
  handleTerminalAuthFailure,
  isAuthStatus,
  refreshAccessToken
} from './auth-session';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase environment variables are not configured');
}

/**
 * Get the current user's access token from Supabase session
 *
 * @returns {Promise<string | null>} The access token or null if user is not authenticated
 *
 * @example
 * const token = await getAccessToken();
 * if (!token) {
 *   console.log('User is not authenticated');
 *   return;
 * }
 */
export async function getAccessToken() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting access token session:', error);
      return null;
    }
    return session?.access_token ?? null;
  } catch (error) {
    console.error('Unexpected error getting access token:', error);
    return null;
  }
}

/**
 * Get the current authenticated user's information
 *
 * @returns {Promise<Object | null>} The user object or null if not authenticated
 *
 * @example
 * const user = await getCurrentUser();
 * console.log('User ID:', user.id);
 */
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting user:', error.message);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return null;
  }
}

/**
 * Make an authenticated HTTP request to Python/Azure Functions endpoint.
 *
 * This function automatically retrieves the Supabase access token and
 * includes it in the Authorization header for every request.
 * Works with both local development (localhost:7071) and Azure deployment.
 *
 * @param {string} endpoint - The API endpoint (relative or absolute URL)
 *                           Examples: '/api/problems', 'https://myapi.azurewebsites.net/api/problems'
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object} options.headers - Additional headers to include
 * @param {*} options.body - Request body (will be JSON stringified if object)
 *
 * @returns {Promise<Response>} The fetch response object
 *
 * @throws {Error} If token retrieval fails before making the request
 *
 * @example
 * // Create a new problem
 * const response = await authenticatedFetch('/api/problems', {
 *   method: 'POST',
 *   body: {
 *     title: 'My Problem',
 *     description: 'This is a problem description',
 *     category: 'AI/ML',
 *     budget: '5000'
 *   }
 * });
 *
 * if (response.ok) {
 *   const problem = await response.json();
 *   console.log('Problem created:', problem);
 * } else {
 *   console.error('Error:', response.status, await response.text());
 * }
 *
 * @example
 * // Get user's problems
 * const response = await authenticatedFetch('/api/user/problems', {
 *   method: 'GET'
 * });
 *
 * @example
 * // Delete a problem
 * const response = await authenticatedFetch('/api/problems/problem-123', {
 *   method: 'DELETE'
 * });
 */
export async function authenticatedFetch(endpoint, options = {}) {
  const requestId = createRequestId('api');
  const startedAt = new Date().toISOString();
  const fullUrl = buildApiUrl(endpoint);

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }
    let token = session?.access_token ?? null;

    if (!token) {
      try {
        token = await refreshAccessToken(`request:${endpoint}`);
      } catch (refreshError) {
        await handleTerminalAuthFailure('missing_session_token', refreshError);
      }
    }

    // Prepare fetch options
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    };

    // Convert body to JSON if it's an object
    if (fetchOptions.body && typeof fetchOptions.body === 'object') {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    let response = await fetch(fullUrl, fetchOptions);

    if (isAuthStatus(response.status)) {
      console.warn('[auth-trace]', {
        event: 'api_auth_retry',
        requestId,
        endpoint: fullUrl,
        timestamp: new Date().toISOString(),
        status: response.status
      });

      try {
        const { data: { session: refreshedSession }, error: refreshedSessionError } = await supabase.auth.getSession();
        if (refreshedSessionError) {
          throw refreshedSessionError;
        }
        const refreshedToken = refreshedSession?.access_token ?? await refreshAccessToken(`retry:${endpoint}`);
        response = await fetch(fullUrl, {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
            Authorization: `Bearer ${refreshedToken}`
          }
        });
      } catch (refreshError) {
        await handleTerminalAuthFailure('api_retry_refresh_failed', refreshError);
      }
    }

    // Log response details for debugging
    if (!response.ok) {
      console.error(
        `API request failed (${response.status} ${response.statusText}):`,
        fullUrl
      );
    }

    console.info('[auth-trace]', {
      event: 'api_request_complete',
      requestId,
      endpoint: fullUrl,
      timestamp: new Date().toISOString(),
      startedAt,
      status: response.status
    });

    return response;
  } catch (error) {
    console.error('Error in authenticatedFetch:', error.message, {
      requestId,
      endpoint: fullUrl,
      startedAt
    });
    throw error;
  }
}

/**
 * Helper function to handle authenticated API responses
 *
 * Automatically handles JSON parsing and common error scenarios.
 *
 * @param {Response} response - The fetch response object
 * @returns {Promise<*>} The parsed JSON response
 *
 * @throws {Error} If the response is not ok (4xx/5xx status)
 *
 * @example
 * try {
 *   const response = await authenticatedFetch('/api/get-posts');
 *   const posts = await handleResponse(response);
 *   console.log('Posts:', posts);
 * } catch (error) {
 *   console.error('Failed to fetch posts:', error.message);
 * }
 */
export async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  let body = null;
  if (isJson) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    // Create a meaningful error message
    const errorMessage =
      (isJson && body.error) || body || response.statusText;
    const error = new Error(
      `API Error ${response.status}: ${errorMessage}`
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

/**
 * Example: Create a new post
 *
 * @param {string} title - Post title
 * @param {string} content - Post content
 * @param {string[]} tags - Array of tags
 * @returns {Promise<Object>} The created post object
 *
 * @example
 * const post = await createPost(
 *   'Bug in login flow',
 *   'The login button is not responding...',
 *   ['bug', 'urgent']
 * );
 */
export async function createPost(title, content, tags = []) {
  try {
    const response = await authenticatedFetch('/api/create-post', {
      method: 'POST',
      body: { title, content, tags }
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Failed to create post:', error);
    throw error;
  }
}

/**
 * Example: Get all user's posts
 *
 * @param {number} limit - Number of posts to retrieve (default: 10)
 * @param {number} offset - Pagination offset (default: 0)
 * @returns {Promise<Array>} Array of post objects
 *
 * @example
 * const posts = await getPosts(20, 0);
 * console.log('Retrieved', posts.length, 'posts');
 */
export async function getPosts(limit = 10, offset = 0) {
  try {
    const endpoint = `/api/get-posts?limit=${limit}&offset=${offset}`;
    const response = await authenticatedFetch(endpoint, { method: 'GET' });
    return await handleResponse(response);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    throw error;
  }
}

/**
 * Example: Delete a post
 *
 * @param {string} postId - The ID of the post to delete
 * @returns {Promise<Object>} Deletion confirmation response
 *
 * @example
 * const result = await deletePost('post-123');
 * console.log('Deleted:', result.post_id);
 */
export async function deletePost(postId) {
  try {
    const response = await authenticatedFetch(`/api/delete-post/${postId}`, {
      method: 'DELETE'
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Failed to delete post:', error);
    throw error;
  }
}

export default {
  getAccessToken,
  getCurrentUser,
  authenticatedFetch,
  handleResponse,
  createPost,
  getPosts,
  deletePost
};
