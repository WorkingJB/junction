/**
 * HTTP client utilities for making API requests to external providers
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';
import type { OAuthTokens, RateLimitInfo } from '../types/common';

/**
 * API request error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApiError {
  constructor(
    message: string,
    public resetAt: Date,
    public limit: number,
    public remaining: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Create an authenticated HTTP client for a provider
 */
export function createHttpClient(params: {
  baseUrl: string;
  tokens?: OAuthTokens;
  userAgent?: string;
  timeout?: number;
}): AxiosInstance {
  const { baseUrl, tokens, userAgent = 'Orqestr/1.0', timeout = 30000 } = params;

  const client = axios.create({
    baseURL: baseUrl,
    timeout,
    headers: {
      'User-Agent': userAgent,
      'Content-Type': 'application/json',
    },
  });

  // Add authorization header if tokens are provided
  if (tokens?.accessToken) {
    client.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  // Add request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[HTTP] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      return Promise.reject(handleApiError(error));
    }
  );

  return client;
}

/**
 * Handle API errors and convert to ApiError
 */
function handleApiError(error: AxiosError): ApiError {
  if (error.response) {
    const { status, data } = error.response;

    // Check for rate limiting
    if (status === 429) {
      const resetHeader = error.response.headers['x-ratelimit-reset'];
      const limitHeader = error.response.headers['x-ratelimit-limit'];
      const remainingHeader = error.response.headers['x-ratelimit-remaining'];

      const resetAt = resetHeader
        ? new Date(parseInt(resetHeader, 10) * 1000)
        : new Date(Date.now() + 60000); // Default to 1 minute

      const limit = limitHeader ? parseInt(limitHeader, 10) : 0;
      const remaining = remainingHeader ? parseInt(remainingHeader, 10) : 0;

      return new RateLimitError(
        'Rate limit exceeded',
        resetAt,
        limit,
        remaining
      );
    }

    // Extract error message from response
    let message = 'API request failed';
    let code: string | undefined;

    if (typeof data === 'object' && data !== null) {
      const errorData = data as Record<string, unknown>;
      message = (errorData.message || errorData.error || message) as string;
      code = errorData.code as string | undefined;
    }

    return new ApiError(message, status, code, data);
  }

  if (error.request) {
    return new ApiError('No response received from server', undefined, 'NO_RESPONSE');
  }

  return new ApiError(error.message || 'Unknown error occurred');
}

/**
 * Extract rate limit info from response headers
 */
export function extractRateLimitInfo(headers: Record<string, string>): RateLimitInfo | null {
  const limit = headers['x-ratelimit-limit'];
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    resetAt: new Date(parseInt(reset, 10) * 1000),
  };
}

/**
 * Retry a request with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx except 429)
      if (error instanceof ApiError && error.statusCode) {
        if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      // For rate limit errors, use the reset time
      if (error instanceof RateLimitError) {
        const resetDelay = error.resetAt.getTime() - Date.now();
        await sleep(Math.max(resetDelay, delay));
      } else {
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Paginate through API results
 */
export async function paginateResults<T>(
  fetchPage: (cursor?: string) => Promise<{ data: T[]; nextCursor?: string }>,
  options: {
    maxPages?: number;
  } = {}
): Promise<T[]> {
  const { maxPages = 100 } = options;
  const results: T[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const { data, nextCursor } = await fetchPage(cursor);
    results.push(...data);

    if (!nextCursor) {
      break;
    }

    cursor = nextCursor;
    pageCount++;
  }

  return results;
}
