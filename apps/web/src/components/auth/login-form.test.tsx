import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginAction = vi.fn();
vi.mock('@/lib/auth/actions', () => ({ loginAction: (i: unknown) => loginAction(i) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { LoginForm } = await import('./login-form');

beforeEach(() => loginAction.mockReset());

describe('LoginForm', () => {
  it('blocks submission and shows an inline error for a malformed email', async () => {
    render(<LoginForm next={null} />);
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText(/Invalid email address/i)).toBeInTheDocument();
    expect(loginAction).not.toHaveBeenCalled();
  });

  it('shows a non-enumerating banner when the server rejects the credentials', async () => {
    loginAction.mockResolvedValue({ ok: false, formError: 'Email atau kata sandi salah.' });

    render(<LoginForm next={null} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email atau kata sandi salah.');
    // Must not disclose which of the two was wrong.
    expect(alert.textContent).not.toMatch(/tidak terdaftar|belum terdaftar/i);
  });
});
