import { jwtVerify } from 'jose';
import { jwtPayloadSchema, type JwtPayload } from '@jagoan-pos/contracts';

export const SESSION_COOKIE = 'jps_session';

// Matches JWT_EXPIRES_IN_SECONDS so the cookie and the token die together and
// we never hold a cookie whose token is already dead.
export const SESSION_MAX_AGE_SECONDS = 3600;

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(value);
}

/** Returns the payload when the signature, expiry, and shape all hold. */
export async function verifySessionToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const parsed = jwtPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
