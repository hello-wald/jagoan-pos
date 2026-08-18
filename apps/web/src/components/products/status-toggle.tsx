'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { messageFor } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';

type Props = {
  id: string;
  isActive: boolean;
  onToggle: (input: { id: string; isActive: boolean }) => Promise<unknown>;
};

export function StatusToggle({ id, isActive, onToggle }: Props) {
  const [confirming, setConfirming] = useState(false);

  async function run(next: boolean) {
    setConfirming(false);
    try {
      await onToggle({ id, isActive: next });
      toast.success(next ? 'Produk diaktifkan.' : 'Produk dinonaktifkan.');
    } catch (error) {
      const code = (error as { code?: AppErrorCode }).code ?? AppErrorCode.INTERNAL_ERROR;
      toast.error(messageFor(code));
    }
  }

  if (!isActive) {
    return (
      <Button variant="ghost" size="sm" onClick={() => void run(true)}>
        Aktifkan
      </Button>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-ink-2">Semua merchant akan kehilangan produk ini.</span>
        <Button variant="danger" size="sm" onClick={() => void run(false)}>
          Ya, nonaktifkan
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Batal
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      Nonaktifkan
    </Button>
  );
}
