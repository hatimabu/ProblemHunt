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

const DEFAULT_AZURE_FUNCTIONS_BASE_URL = 'https://problemhunt-api.azurewebsites.net';

// Determine the API base URL based on environment
export const getApiBaseUrl = () => {
  const configuredBaseUrl =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;

  // Always prefer explicit environment configuration when provided.
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  // Safe default for deployed frontend to avoid falling back to static site origin.
  return DEFAULT_AZURE_FUNCTIONS_BASE_URL;
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

console.log(`API Base URL: ${API_BASE_URL}`);
