'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@jagoan-pos/contracts';
import { loginAction } from '@/lib/auth/actions';
import { homeForRole } from '@/lib/auth/roles';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result.ok) {
        // `next` was already restricted to a same-origin path by the page
        // (see the /login route), so this cast is not re-opening the
        // redirect check — it's only working around typedRoutes not being
        // able to see a value it can't statically infer.
        router.replace((next ?? homeForRole(result.role)) as Route);
        router.refresh();
        return;
      }
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof LoginInput, { message });
        }
      }
      if (result.formError) setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {formError ? <Banner tone="danger">{formError}</Banner> : null}

      <Field id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
      </Field>

      <Field id="password" label="Kata sandi" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? 'Memproses…' : 'Masuk'}
      </Button>
    </form>
  );
}
