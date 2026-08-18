'use server';

import type {
  LoginInput,
  LoginResult,
  RegisterOwnerInput,
  UserRole,
} from '@jagoan-pos/contracts';
import { FIELD_ERROR_CODES, messageFor } from '../i18n/messages';
import { normalizeError } from '../api/errors';
import { clearSessionCookie, setSessionCookie } from './session';

export type ActionResult =
  | { ok: true; role: UserRole }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

function gatewayUrl(path: string): string {
  return `${process.env.GATEWAY_URL ?? 'http://localhost:3000'}/api${path}`;
}

async function postJson(path: string, body: unknown): Promise<{ status: number; data: unknown }> {
  const response = await fetch(gatewayUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

/** Routes a failure to a field when it belongs on one, otherwise to a banner. */
function toFailure(status: number, data: unknown): ActionResult {
  const error = normalizeError(status, data);
  const field = FIELD_ERROR_CODES[error.code];
  return field
    ? { ok: false, fieldErrors: { [field]: messageFor(error.code) } }
    : { ok: false, formError: messageFor(error.code) };
}

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const { status, data } = await postJson('/auth/login', input);
  if (status >= 400) return toFailure(status, data);

  const result = data as LoginResult;
  await setSessionCookie(result.accessToken);
  return { ok: true, role: result.user.role };
}

export async function registerAction(input: RegisterOwnerInput): Promise<ActionResult> {
  const registration = await postJson('/auth/register', input);
  if (registration.status >= 400) return toFailure(registration.status, registration.data);

  // GAP G-4: auth.register responds with a UserSummary and no token, so we
  // exchange the same credentials for one. Remove this once register returns
  // a LoginResult.
  return loginAction({ email: input.email, password: input.password });
}

export async function logoutAction(): Promise<void> {
  // GAP G-5: no server-side revocation exists, so the token stays valid until
  // it expires. Clearing the cookie is all the client can do today.
  await clearSessionCookie();
}
