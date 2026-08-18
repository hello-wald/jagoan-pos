'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { registerOwnerSchema, type RegisterOwnerInput } from '@jagoan-pos/contracts';
import { registerAction } from '@/lib/auth/actions';
import { homeForRole } from '@/lib/auth/roles';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterOwnerInput>({ resolver: zodResolver(registerOwnerSchema) });

  function onSubmit(values: RegisterOwnerInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction(values);
      if (result.ok) {
        router.replace(homeForRole(result.role));
        router.refresh();
        return;
      }
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof RegisterOwnerInput, { message });
        }
      }
      if (result.formError) setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {formError ? <Banner tone="danger">{formError}</Banner> : null}

      <Field id="merchantName" label="Nama merchant" error={errors.merchantName?.message}>
        <Input id="merchantName" autoComplete="organization" {...register('merchantName')} />
      </Field>

      <Field id="fullName" label="Nama lengkap" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" {...register('fullName')} />
      </Field>

      <Field id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
      </Field>

      {/* The rule is shown before submission, never discovered through an error. */}
      <Field
        id="password"
        label="Kata sandi"
        hint="Minimal 8 karakter."
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? 'Memproses…' : 'Daftar'}
      </Button>
    </form>
  );
}
