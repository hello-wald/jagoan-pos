import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

const { StatusToggle } = await import('./status-toggle');

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('StatusToggle', () => {
  it('toasts when the server rejects the change', async () => {
    const onToggle = vi.fn().mockRejectedValue({ code: 'INTERNAL_ERROR', status: 500 });

    wrap(<StatusToggle id="p1" isActive={true} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }));
    // Deactivation is platform-wide, so it must be confirmed first.
    await userEvent.click(screen.getByRole('button', { name: 'Ya, nonaktifkan' }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it('activates without a confirmation dialog', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);

    wrap(<StatusToggle id="p1" isActive={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Aktifkan' }));

    await waitFor(() => expect(onToggle).toHaveBeenCalledWith({ id: 'p1', isActive: true }));
  });
});
