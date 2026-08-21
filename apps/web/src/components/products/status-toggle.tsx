'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { messageFor } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

type Props = {
  id: string;
  isActive: boolean;
  name?: string;
  onToggle: (input: { id: string; isActive: boolean }) => Promise<unknown>;
};

export function StatusToggle({ id, isActive, name, onToggle }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function run(next: boolean) {
    setSaving(true);
    try {
      await onToggle({ id, isActive: next });
      setConfirming(false);
      toast.success(next ? 'Produk diaktifkan.' : 'Produk dinonaktifkan.');
    } catch (error) {
      const code = (error as { code?: AppErrorCode }).code ?? AppErrorCode.INTERNAL_ERROR;
      toast.error(messageFor(code));
    } finally {
      setSaving(false);
    }
  }

  // Activation is harmless and reversible, so it fires straight away.
  // Deactivation is platform-wide and gets confirmed first.
  if (!isActive) {
    return (
      <Button variant="ghost" size="sm" disabled={saving} onClick={() => void run(true)}>
        Aktifkan
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Nonaktifkan
      </Button>

      <Modal
        open={confirming}
        title="Nonaktifkan produk?"
        maxWidth="max-w-md"
        onClose={() => {
          if (!saving) setConfirming(false);
        }}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-2">
            {name ? (
              <>
                <span className="font-medium text-ink">{name}</span> akan hilang dari semua
                merchant.
              </>
            ) : (
              'Semua merchant akan kehilangan produk ini.'
            )}{' '}
            Anda bisa mengaktifkannya lagi kapan saja.
          </p>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setConfirming(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={saving}
              onClick={() => void run(false)}
            >
              {saving ? 'Menonaktifkan…' : 'Ya, nonaktifkan'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
