import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl tracking-[-0.015em]">Daftarkan merchant Anda</h1>
        <p className="text-sm leading-relaxed text-ink-2">
          Pendaftaran ini membuat merchant baru sekaligus akun pemiliknya. Akun kasir dibuat
          dari dalam aplikasi setelah Anda masuk.
        </p>
      </div>

      <RegisterForm />

      <p className="text-sm text-ink-2">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-medium text-accent-deep underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </div>
  );
}
