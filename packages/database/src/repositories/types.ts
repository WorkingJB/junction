/**
 * Repository pattern types for database operations
 *
 * These types provide a provider-agnostic way to interact with the database.
 * Current implementation: Supabase with RLS
 * Future implementations: Prisma, Drizzle, raw SQL, etc.
 */

/**
 * Standard result type for database operations
 */
export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

/**
 * Standard error type for database operations
 */
export interface DbError {
  message: string;
  code?: string;
  details?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Ordering options
 */
export interface OrderOptions<T = any> {
  column: keyof T;
  ascending?: boolean;
}

/**
 * Base filter interface
 * Implementations can extend this with provider-specific filters
 */
export interface BaseFilter {
  [key: string]: any;
}
