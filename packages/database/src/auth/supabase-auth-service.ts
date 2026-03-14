/**
 * Supabase implementation of IAuthService
 *
 * This is the current implementation using Supabase Auth.
 * Future implementations could use NextAuth, Clerk, Auth0, etc.
 */

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import type { IAuthService } from './auth-service';
import type {
  AuthUser,
  AuthSession,
  AuthResult,
  SignInCredentials,
  SignUpData,
  AuthError,
} from './types';

/**
 * Convert Supabase user to AuthUser
 */
function toAuthUser(supabaseUser: any): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    emailVerified: supabaseUser.email_confirmed_at != null,
    metadata: supabaseUser.user_metadata,
  };
}

/**
 * Convert Supabase session to AuthSession
 */
function toAuthSession(supabaseSession: any): AuthSession {
  return {
    user: toAuthUser(supabaseSession.user),
    accessToken: supabaseSession.access_token,
    expiresAt: supabaseSession.expires_at,
  };
}

/**
 * Convert Supabase error to AuthError
 */
function toAuthError(error: any): AuthError {
  return {
    message: error.message || 'An authentication error occurred',
    code: error.code,
    status: error.status,
  };
}

/**
 * Server-side Supabase auth service
 * Used in Next.js API routes and Server Components
 */
export class SupabaseAuthService implements IAuthService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getCurrentUser(): Promise<AuthResult<AuthUser>> {
    const { data, error } = await this.supabase.auth.getUser();

    if (error) {
      return { data: null, error: toAuthError(error) };
    }

    if (!data.user) {
      return { data: null, error: { message: 'No user found' } };
    }

    return { data: toAuthUser(data.user), error: null };
  }

  async getSession(): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      return { data: null, error: toAuthError(error) };
    }

    if (!data.session) {
      return { data: null, error: { message: 'No session found' } };
    }

    return { data: toAuthSession(data.session), error: null };
  }

  async signIn(credentials: SignInCredentials): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { data: null, error: toAuthError(error) };
    }

    if (!data.session) {
      return { data: null, error: { message: 'No session returned' } };
    }

    return { data: toAuthSession(data.session), error: null };
  }

  async signUp(signUpData: SignUpData): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: signUpData.metadata || {},
      },
    });

    if (error) {
      return { data: null, error: toAuthError(error) };
    }

    if (!data.session) {
      return { data: null, error: { message: 'No session returned' } };
    }

    return { data: toAuthSession(data.session), error: null };
  }

  async signOut(): Promise<AuthResult<void>> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return { data: null, error: toAuthError(error) };
    }

    return { data: null, error: null };
  }
}

/**
 * Create a server-side auth service instance
 * This should be called in API routes and Server Components
 *
 * Example usage:
 * ```ts
 * import { createServerAuthService } from '@orqestr/database/auth';
 *
 * const authService = await createServerAuthService();
 * const { data: user, error } = await authService.getCurrentUser();
 * ```
 */
export async function createServerAuthService(): Promise<IAuthService> {
  // This is a simplified version - in practice, you'd want to get cookies
  // from Next.js or your framework. For now, we'll create a basic client.
  // This will be updated when we integrate with actual Next.js server code.
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
      auth: {
        storage: undefined,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  return new SupabaseAuthService(supabase);
}
