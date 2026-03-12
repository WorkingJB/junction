/**
 * OAuth utility functions for managing tokens and authorization flows
 */

import type { OAuthTokens } from '../types/common';

/**
 * Check if an access token is expired or about to expire
 */
export function isTokenExpired(expiresAt?: Date, bufferMinutes: number = 5): boolean {
  if (!expiresAt) {
    return false; // If no expiry, assume it's valid
  }

  const now = new Date();
  const bufferMs = bufferMinutes * 60 * 1000;
  const expiryWithBuffer = new Date(expiresAt.getTime() - bufferMs);

  return now >= expiryWithBuffer;
}

/**
 * Build OAuth authorization URL with query parameters
 */
export function buildAuthUrl(params: {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
  responseType?: string;
  additionalParams?: Record<string, string>;
}): string {
  const {
    baseUrl,
    clientId,
    redirectUri,
    state,
    scopes,
    responseType = 'code',
    additionalParams = {},
  } = params;

  const queryParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: responseType,
    ...additionalParams,
  });

  if (scopes && scopes.length > 0) {
    queryParams.set('scope', scopes.join(' '));
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse OAuth tokens from provider response
 */
export function parseTokenResponse(response: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}): OAuthTokens {
  const tokens: OAuthTokens = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    scope: response.scope,
  };

  if (response.expires_in) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + response.expires_in);
    tokens.expiresAt = expiresAt;
  }

  return tokens;
}

/**
 * Safely store tokens (encrypt sensitive data in production)
 */
export function encryptToken(token: string, _encryptionKey?: string): string {
  // In production, this should use proper encryption
  // For now, we'll just return the token as-is
  // TODO: Implement proper encryption using a key management service
  return token;
}

/**
 * Decrypt stored tokens
 */
export function decryptToken(encryptedToken: string, _encryptionKey?: string): string {
  // In production, this should use proper decryption
  // For now, we'll just return the token as-is
  // TODO: Implement proper decryption using a key management service
  return encryptedToken;
}

/**
 * Validate OAuth state parameter to prevent CSRF attacks
 */
export function validateState(receivedState: string, expectedState: string): boolean {
  return receivedState === expectedState;
}

/**
 * Build token exchange request body
 */
export function buildTokenExchangeBody(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  grantType?: string;
}): URLSearchParams {
  const { code, clientId, clientSecret, redirectUri, grantType = 'authorization_code' } = params;

  return new URLSearchParams({
    grant_type: grantType,
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
}

/**
 * Build token refresh request body
 */
export function buildTokenRefreshBody(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  grantType?: string;
}): URLSearchParams {
  const { refreshToken, clientId, clientSecret, grantType = 'refresh_token' } = params;

  return new URLSearchParams({
    grant_type: grantType,
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
}
