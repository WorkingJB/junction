/**
 * Provider-agnostic auth types
 * These interfaces can be implemented by any auth provider (Supabase, NextAuth, etc.)
 */

/**
 * Represents an authenticated user
 */
export interface AuthUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Represents an authentication session
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt?: number;
}

/**
 * Result type for auth operations
 */
export interface AuthResult<T> {
  data: T | null;
  error: AuthError | null;
}

/**
 * Standard auth error
 */
export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Sign in credentials
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Sign up data
 */
export interface SignUpData {
  email: string;
  password: string;
  metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}
