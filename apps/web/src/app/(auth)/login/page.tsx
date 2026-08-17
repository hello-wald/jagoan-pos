import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl tracking-[-0.015em]">Masuk ke Jagoan POS</h1>
        <p className="text-sm leading-relaxed text-ink-2">
          Gunakan akun yang diberikan pemilik merchant Anda.
        </p>
      </div>

      {/* Only forward same-origin paths; an absolute or protocol-relative
          ("//evil.com") URL here would be an open redirect. */}
      <LoginForm next={next?.startsWith('/') && !next.startsWith('//') ? next : null} />

      <p className="text-sm text-ink-2">
        Belum punya merchant?{' '}
        <Link href="/register" className="font-medium text-accent-deep underline underline-offset-4">
          Daftarkan merchant Anda
        </Link>
      </p>
    </div>
  );
}
