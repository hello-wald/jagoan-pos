import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AiInsightView } from './ai-insight-view';
import * as ownerAiApi from '@/lib/api/owner';
import type { AiChatResponse } from '@jagoan-pos/contracts';

vi.mock('@/lib/api/owner');

describe('AiInsightView', () => {
  const mutateAsyncMock = vi.fn();

  beforeEach(() => {
    mutateAsyncMock.mockReset();

    vi.spyOn(ownerAiApi, 'useAiChat').mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof ownerAiApi.useAiChat>);
  });

  it('renders welcome message and starter prompts', () => {
    render(<AiInsightView />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI Insight Assistant');
    expect(screen.getByText(/Halo! Saya adalah AI Insight Assistant Anda/i)).toBeInTheDocument();
    expect(screen.getByText('Berapa total omzet toko hari ini?')).toBeInTheDocument();
  });

  it('rejects blank messages and disables send button when input is whitespace', () => {
    render(<AiInsightView />);

    const sendButton = screen.getByRole('button', { name: 'Kirim pertanyaan' });
    expect(sendButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Tanyakan analisis penjualan toko Anda/i);
    fireEvent.change(textarea, { target: { value: '    ' } });

    expect(sendButton).toBeDisabled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('sends message to backend and renders response.answer with asOf timestamp', async () => {
    const mockResponse: AiChatResponse = {
      answer: 'Total omzet toko Anda hari ini adalah Rp 1.500.000 dari 25 transaksi.',
      asOf: '2026-08-19T08:00:00.000Z',
    };

    mutateAsyncMock.mockResolvedValueOnce(mockResponse);

    render(<AiInsightView />);

    const textarea = screen.getByPlaceholderText(/Tanyakan analisis penjualan toko Anda/i);
    fireEvent.change(textarea, { target: { value: 'Berapa omzet hari ini?' } });

    const sendButton = screen.getByRole('button', { name: 'Kirim pertanyaan' });
    fireEvent.click(sendButton);

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      message: 'Berapa omzet hari ini?',
    });

    await waitFor(() => {
      expect(
        screen.getByText('Total omzet toko Anda hari ini adalah Rp 1.500.000 dari 25 transaksi.'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Data analitik per:/i)).toBeInTheDocument();
    });
  });

  it('sends message when clicking a suggested prompt chip', async () => {
    const mockResponse: AiChatResponse = {
      answer: 'Produk paling laris adalah Kopi Susu Gula Aren dengan 20 cup terjual.',
      asOf: null,
    };

    mutateAsyncMock.mockResolvedValueOnce(mockResponse);

    render(<AiInsightView />);

    const chip = screen.getByRole('button', { name: 'Berapa total omzet toko hari ini?' });
    fireEvent.click(chip);

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      message: 'Berapa total omzet toko hari ini?',
    });

    await waitFor(() => {
      expect(
        screen.getByText('Produk paling laris adalah Kopi Susu Gula Aren dengan 20 cup terjual.'),
      ).toBeInTheDocument();
    });
  });

  it('shows loading indicator when chat mutation is pending', () => {
    vi.spyOn(ownerAiApi, 'useAiChat').mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: true,
      isError: false,
    } as unknown as ReturnType<typeof ownerAiApi.useAiChat>);

    render(<AiInsightView />);

    expect(screen.getByText(/AI sedang menganalisis data toko Anda/i)).toBeInTheDocument();
  });

  it('handles backend failure gracefully and renders error banner', async () => {
    mutateAsyncMock.mockRejectedValueOnce({
      code: 'INTERNAL_ERROR',
      message: 'AI Service currently overloaded',
    });

    render(<AiInsightView />);

    const textarea = screen.getByPlaceholderText(/Tanyakan analisis penjualan toko Anda/i);
    fireEvent.change(textarea, { target: { value: 'Analisa performa toko' } });

    fireEvent.click(screen.getByRole('button', { name: 'Kirim pertanyaan' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Maaf, Terjadi kesalahan\. Coba lagi\./i),
      ).toBeInTheDocument();
      expect(screen.getByText('Terjadi kesalahan. Coba lagi.')).toBeInTheDocument();
    });
  });
});
