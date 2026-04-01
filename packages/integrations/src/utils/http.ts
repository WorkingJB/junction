/**
 * HTTP client utilities for making API requests to external providers
 */

import type { OAuthTokens, RateLimitInfo } from '../types/common';

/**
 * HTTP client interface
 */
export interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
}

interface RequestConfig {
  params?: Record<string, string | number | boolean>;
}

interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

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
}): HttpClient {
  const { baseUrl, tokens, userAgent = 'Orqestr/1.0', timeout = 30000 } = params;

  const defaultHeaders: Record<string, string> = {
    'User-Agent': userAgent,
    'Content-Type': 'application/json',
  };

  if (tokens?.accessToken) {
    defaultHeaders['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  async function request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    let fullUrl = `${baseUrl}${url}`;

    if (config?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(config.params)) {
        searchParams.set(key, String(value));
      }
      fullUrl += `?${searchParams.toString()}`;
    }

    console.log(`[HTTP] ${method.toUpperCase()} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: defaultHeaders,
        body: data != null ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      if (!response.ok) {
        const responseData = await response.text().then((text) => {
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        });

        handleApiError(response.status, headers, responseData);
      }

      const responseData = await response.json() as T;

      return {
        data: responseData,
        status: response.status,
        headers,
      };
    } catch (error) {
      if (error instanceof ApiError || error instanceof RateLimitError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request timeout', undefined, 'TIMEOUT');
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    get<T>(url: string, config?: RequestConfig) {
      return request<T>('GET', url, undefined, config);
    },
    post<T>(url: string, data?: unknown, config?: RequestConfig) {
      return request<T>('POST', url, data, config);
    },
    put<T>(url: string, data?: unknown, config?: RequestConfig) {
      return request<T>('PUT', url, data, config);
    },
    delete<T>(url: string, config?: RequestConfig) {
      return request<T>('DELETE', url, undefined, config);
    },
  };
}

/**
 * Handle API errors and convert to ApiError
 */
function handleApiError(
  status: number,
  headers: Record<string, string>,
  data: unknown
): never {
  // Check for rate limiting
  if (status === 429) {
    const resetHeader = headers['x-ratelimit-reset'];
    const limitHeader = headers['x-ratelimit-limit'];
    const remainingHeader = headers['x-ratelimit-remaining'];

    const resetAt = resetHeader
      ? new Date(parseInt(resetHeader, 10) * 1000)
      : new Date(Date.now() + 60000);

    const limit = limitHeader ? parseInt(limitHeader, 10) : 0;
    const remaining = remainingHeader ? parseInt(remainingHeader, 10) : 0;

    throw new RateLimitError('Rate limit exceeded', resetAt, limit, remaining);
  }

  // Extract error message from response
  let message = 'API request failed';
  let code: string | undefined;

  if (typeof data === 'object' && data !== null) {
    const errorData = data as Record<string, unknown>;
    message = (errorData.message || errorData.error || message) as string;
    code = errorData.code as string | undefined;
  }

  throw new ApiError(message, status, code, data);
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
