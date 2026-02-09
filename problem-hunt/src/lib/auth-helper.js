/**
 * Supabase Authentication Helper for Azure Functions
 *
 * Provides utilities to:
 * - Retrieve the Supabase access token from the current session
 * - Make authenticated HTTP requests to Azure Functions API
 * - Handle token refresh and error cases
 *
 * Usage:
 *   import { authenticatedFetch } from './auth-helper';
 *   const response = await authenticatedFetch('/api/create-post', {
 *     method: 'POST',
 *     body: JSON.stringify({ title: 'My Post', content: 'Content' })
 *   });
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }

    if (!session) {
      console.info('No active session - user may not be authenticated');
      return null;
    }

    return session.access_token;
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
 * Make an authenticated HTTP request to an Azure Functions endpoint.
 *
 * This function automatically retrieves the Supabase access token and
 * includes it in the Authorization header for every request.
 *
 * @param {string} endpoint - The API endpoint (relative or absolute URL)
 *                           Examples: '/api/create-post', 'https://myapi.azurewebsites.net/api/get-posts'
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
 * // Create a new post
 * const response = await authenticatedFetch('/api/create-post', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     title: 'My Problem',
 *     content: 'This is a problem description',
 *     tags: ['urgent', 'bug']
 *   })
 * });
 *
 * if (response.ok) {
 *   const post = await response.json();
 *   console.log('Post created:', post);
 * } else {
 *   console.error('Error:', response.status, await response.text());
 * }
 *
 * @example
 * // Get all user's posts with pagination
 * const response = await authenticatedFetch('/api/get-posts?limit=20&offset=0', {
 *   method: 'GET'
 * });
 *
 * @example
 * // Delete a post
 * const response = await authenticatedFetch('/api/delete-post/post-123', {
 *   method: 'DELETE'
 * });
 *
 * @example
 * // Update a post (custom endpoint)
 * const response = await authenticatedFetch('/api/update-post', {
 *   method: 'PUT',
 *   body: JSON.stringify({
 *     post_id: 'post-123',
 *     title: 'Updated Title'
 *   })
 * });
 */
export async function authenticatedFetch(endpoint, options = {}) {
  try {
    // Get the access token
    const token = await getAccessToken();

    if (!token) {
      throw new Error(
        'Could not retrieve authentication token. Please ensure you are logged in.'
      );
    }

    // Prepare fetch options
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    };

    // Convert body to JSON if it's an object
    if (fetchOptions.body && typeof fetchOptions.body === 'object') {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    // Make the request
    const response = await fetch(endpoint, fetchOptions);

    // Log response details for debugging
    if (!response.ok) {
      console.error(
        `API request failed (${response.status} ${response.statusText}):`,
        endpoint
      );
    }

    return response;
  } catch (error) {
    console.error('Error in authenticatedFetch:', error.message);
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
