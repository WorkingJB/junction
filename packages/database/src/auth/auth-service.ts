/**
 * Auth Service Interface
 *
 * This interface defines the contract for authentication services.
 * Any auth provider (Supabase, NextAuth, Clerk, etc.) must implement this interface.
 *
 * Design principles:
 * - Provider-agnostic: No Supabase-specific types in the interface
 * - Type-safe: Full TypeScript support
 * - Error handling: Standardized error format
 * - Flexible: Can be implemented with any backend
 */

import type {
  AuthUser,
  AuthSession,
  AuthResult,
  SignInCredentials,
  SignUpData,
} from './types';

/**
 * Core authentication service interface
 */
export interface IAuthService {
  /**
   * Get the currently authenticated user
   * Used in API routes and server components
   */
  getCurrentUser(): Promise<AuthResult<AuthUser>>;

  /**
   * Get the current session
   * Includes user data and access token
   */
  getSession(): Promise<AuthResult<AuthSession>>;

  /**
   * Sign in with email and password
   */
  signIn(credentials: SignInCredentials): Promise<AuthResult<AuthSession>>;

  /**
   * Sign up with email and password
   */
  signUp(data: SignUpData): Promise<AuthResult<AuthSession>>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<AuthResult<void>>;
}

/**
 * Factory function type for creating auth service instances
 * Different implementations may have different initialization requirements
 */
export type AuthServiceFactory = () => Promise<IAuthService> | IAuthService;
