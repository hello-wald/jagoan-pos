'use client';

import { useState } from 'react';
import { Eye, EyeSlash, UserPlus } from '@phosphor-icons/react';
import {
  AppErrorCode,
  createCashierSchema,
  type CreateCashierInput,
} from '@jagoan-pos/contracts';
import { messageFor } from '@/lib/i18n/messages';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export type CreateCashierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateCashierInput) => Promise<void>;
  isSubmitting?: boolean;
};

export function CreateCashierModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateCashierModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFieldErrors({});
    setServerError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const result = createCashierSchema.safeParse({
      fullName,
      email,
      password,
    });

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!formattedErrors[path]) {
          formattedErrors[path] = issue.message;
        }
      }
      setFieldErrors(formattedErrors);
      return;
    }

    try {
      await onSubmit(result.data);
      handleClose();
    } catch (err: unknown) {
      const errObj = err as { code?: AppErrorCode | string; message?: string } | null;
      const code = errObj?.code;
      const msg =
        errObj?.message ??
        (err instanceof Error ? err.message : 'Gagal mendaftarkan kasir baru.');

      if (
        code === AppErrorCode.EMAIL_ALREADY_EXISTS ||
        code === 'EMAIL_ALREADY_EXISTS' ||
        msg.includes(AppErrorCode.EMAIL_ALREADY_EXISTS) ||
        msg.toLowerCase().includes('email already exists') ||
        msg.toLowerCase().includes('email sudah terdaftar')
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          email: messageFor(AppErrorCode.EMAIL_ALREADY_EXISTS),
        }));
      } else {
        setServerError(msg);
      }
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Tambah Kasir Baru"
      description="Daftarkan akun kasir baru untuk mengoperasikan kasir toko Anda."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
        {serverError ? <Banner tone="danger">{serverError}</Banner> : null}

        <Field id="cashier-fullname" label="Nama Lengkap" error={fieldErrors.fullName}>
          <Input
            id="cashier-fullname"
            type="text"
            placeholder="Contoh: Budi Santoso"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            disabled={isSubmitting}
            required
          />
        </Field>

        <Field id="cashier-email" label="Alamat Email" error={fieldErrors.email}>
          <Input
            id="cashier-email"
            type="email"
            placeholder="kasir@toko.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={isSubmitting}
            required
          />
        </Field>

        <Field
          id="cashier-password"
          label="Kata Sandi (Minimal 8 karakter)"
          error={fieldErrors.password}
          hint="Kata sandi akan digunakan oleh kasir untuk login ke POS."
        >
          <div className="relative">
            <Input
              id="cashier-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              disabled={isSubmitting}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink transition-colors"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4 mt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <UserPlus size={16} weight="bold" />
            <span>{isSubmitting ? 'Mendaftarkan…' : 'Daftarkan Kasir'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
