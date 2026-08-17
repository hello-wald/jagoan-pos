import { AppErrorCode } from '@jagoan-pos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setSessionCookie = vi.fn();
vi.mock('./session', () => ({
  setSessionCookie: (token: string) => setSessionCookie(token),
  clearSessionCookie: vi.fn(),
}));

const { loginAction, registerAction } = await import('./actions');

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
  setSessionCookie.mockClear();
  process.env.GATEWAY_URL = 'http://gateway.test';
});

describe('loginAction', () => {
  it('stores the token and reports the role on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(200, { accessToken: 'tok', user: { role: 'GLOBAL_ADMIN' } }),
      ),
    );

    const result = await loginAction({ email: 'a@b.co', password: 'secret12' });

    expect(result).toEqual({ ok: true, role: 'GLOBAL_ADMIN' });
    expect(setSessionCookie).toHaveBeenCalledWith('tok');
  });

  it('returns a non-enumerating form error for bad credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(401, { statusCode: 401, code: AppErrorCode.INVALID_CREDENTIALS }),
      ),
    );

    const result = await loginAction({ email: 'a@b.co', password: 'wrong' });

    expect(result).toEqual({ ok: false, formError: 'Email atau kata sandi salah.' });
    expect(setSessionCookie).not.toHaveBeenCalled();
  });
});

describe('registerAction', () => {
  // auth.register returns a UserSummary with no token (gap G-4), so the action
  // has to log in afterwards to land the user authenticated.
  it('registers then logs in, storing the token from the second call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { id: 'u1', role: 'OWNER' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'tok2', user: { role: 'OWNER' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await registerAction({
      merchantName: 'Mie Jagoan',
      fullName: 'Budi',
      email: 'budi@mie.co',
      password: 'rahasia123',
    });

    expect(result).toEqual({ ok: true, role: 'OWNER' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setSessionCookie).toHaveBeenCalledWith('tok2');
  });

  it('puts a duplicate email on the email field, not in a banner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(409, { statusCode: 409, code: AppErrorCode.EMAIL_ALREADY_EXISTS }),
      ),
    );

    const result = await registerAction({
      merchantName: 'Mie Jagoan',
      fullName: 'Budi',
      email: 'taken@mie.co',
      password: 'rahasia123',
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: 'Email ini sudah terdaftar.' },
    });
  });
});
