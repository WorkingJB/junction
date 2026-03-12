/**
 * Webhook utility functions for signature validation and payload processing
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookPayload } from '../types/common';

/**
 * Verify HMAC signature for webhook payload
 */
export function verifyHmacSignature(params: {
  payload: string | Buffer;
  signature: string;
  secret: string;
  algorithm?: string;
}): boolean {
  const { payload, signature, secret, algorithm = 'sha256' } = params;

  try {
    const hmac = createHmac(algorithm, secret);
    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying HMAC signature:', error);
    return false;
  }
}

/**
 * Verify HMAC signature with prefix (e.g., "sha256=...")
 */
export function verifyHmacSignatureWithPrefix(params: {
  payload: string | Buffer;
  signature: string;
  secret: string;
  prefix?: string;
}): boolean {
  const { payload, signature, secret, prefix = 'sha256=' } = params;

  if (!signature.startsWith(prefix)) {
    return false;
  }

  const actualSignature = signature.slice(prefix.length);
  const algorithm = prefix.replace('=', '');

  return verifyHmacSignature({
    payload,
    signature: actualSignature,
    secret,
    algorithm,
  });
}

/**
 * Verify timestamp to prevent replay attacks
 */
export function verifyTimestamp(
  timestamp: number | string,
  maxAgeSeconds: number = 300
): boolean {
  const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

  if (isNaN(timestampNum)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - timestampNum;

  return age >= 0 && age <= maxAgeSeconds;
}

/**
 * Generate HMAC signature for outgoing webhooks
 */
export function generateHmacSignature(params: {
  payload: string | Buffer;
  secret: string;
  algorithm?: string;
}): string {
  const { payload, secret, algorithm = 'sha256' } = params;

  const hmac = createHmac(algorithm, secret);
  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
  hmac.update(payloadString);

  return hmac.digest('hex');
}

/**
 * Parse webhook payload safely
 */
export function parseWebhookPayload<T = Record<string, unknown>>(
  rawPayload: string | Buffer
): T | null {
  try {
    const payloadString = typeof rawPayload === 'string'
      ? rawPayload
      : rawPayload.toString('utf8');
    return JSON.parse(payloadString) as T;
  } catch (error) {
    console.error('Error parsing webhook payload:', error);
    return null;
  }
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: unknown): payload is WebhookPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const p = payload as Partial<WebhookPayload>;

  return (
    typeof p.provider === 'string' &&
    typeof p.eventType === 'string' &&
    typeof p.data === 'object' &&
    p.data !== null
  );
}

/**
 * Sanitize webhook payload to remove sensitive data
 */
export function sanitizeWebhookPayload(payload: WebhookPayload): WebhookPayload {
  const sanitized = { ...payload };

  // Remove signature and other sensitive fields from logging
  delete sanitized.signature;

  // Redact sensitive data in the payload
  if (sanitized.data) {
    sanitized.data = redactSensitiveFields(sanitized.data);
  }

  return sanitized;
}

/**
 * Redact sensitive fields from an object
 */
function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'access_token',
    'refresh_token',
  ];

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Create a webhook response helper
 */
export function createWebhookResponse(params: {
  success: boolean;
  message?: string;
  code?: number;
}): {
  status: number;
  body: { success: boolean; message?: string };
} {
  const { success, message, code } = params;

  return {
    status: code || (success ? 200 : 400),
    body: {
      success,
      message,
    },
  };
}
