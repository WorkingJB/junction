/**
 * Rate limiting utilities for API endpoints
 * Uses in-memory storage for development, should use Redis in production
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Identifier for the rate limit (e.g., IP address, user ID)
   */
  identifier: string;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Number of requests remaining in the current window
   */
  remaining: number;

  /**
   * Timestamp when the rate limit resets
   */
  resetAt: Date;

  /**
   * Number of seconds until reset
   */
  retryAfter?: number;
}

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { identifier, limit, windowMs } = config;
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitStore.get(identifier);

  // Reset if window has expired
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
  }

  // Increment count
  entry.count++;

  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;
  const resetAt = new Date(entry.resetAt);

  return {
    allowed,
    limit,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Clean up expired entries (should be called periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    rateLimitStore.delete(key);
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
    ...(result.retryAfter
      ? { 'Retry-After': result.retryAfter.toString() }
      : {}),
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  /**
   * Strict rate limit for auth endpoints (5 requests per minute)
   */
  AUTH: {
    limit: 5,
    windowMs: 60 * 1000,
  },

  /**
   * Standard rate limit for API endpoints (100 requests per minute)
   */
  API: {
    limit: 100,
    windowMs: 60 * 1000,
  },

  /**
   * Webhook rate limit (1000 requests per minute per provider)
   */
  WEBHOOK: {
    limit: 1000,
    windowMs: 60 * 1000,
  },

  /**
   * Integration sync rate limit (10 requests per minute per user)
   */
  SYNC: {
    limit: 10,
    windowMs: 60 * 1000,
  },
} as const;

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
