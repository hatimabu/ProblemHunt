/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints
 * Supports both local development and Azure deployment
 * 
 * Usage:
 *   import { API_BASE_URL } from './api-config';
 *   const endpoint = `${API_BASE_URL}/api/problems`;
 */

// Determine the API base URL based on environment
export const getApiBaseUrl = () => {
  // Development: Use local Azure Functions emulator
  if (process.env.NODE_ENV === 'development') {
    return process.env.VITE_API_BASE || 'http://localhost:7071';
  }

  // Production: Use Azure Functions endpoint (if configured in environment)
  if (process.env.VITE_API_BASE) {
    return process.env.VITE_API_BASE;
  }

  // Default: relative path (works for Static Web App scenario)
  return '';
};

// Export the base URL
export const API_BASE_URL = getApiBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Problems
  PROBLEMS: '/api/problems',
  PROBLEM_BY_ID: (id) => `/api/problems/${id}`,
  USER_PROBLEMS: '/api/user/problems',
  SEARCH_PROBLEMS: '/api/problems/search',

  // Upvotes
  UPVOTE_PROBLEM: (id) => `/api/problems/${id}/upvote`,
  REMOVE_UPVOTE: (id) => `/api/problems/${id}/upvote`,

  // Proposals
  PROPOSALS: (problemId) => `/api/problems/${problemId}/proposals`,
  TIP_PROPOSAL: (proposalId) => `/api/proposals/${proposalId}/tip`,
};

// Helper function to build full API URLs (supports both relative and absolute)
export const buildApiUrl = (endpoint) => {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  return `${API_BASE_URL}${endpoint}`;
};

console.log(`🔗 API Base URL: ${API_BASE_URL || '(relative path - same origin)'}`);
