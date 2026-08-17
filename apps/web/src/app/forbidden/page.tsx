import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-ink-3">Error 403</p>
      <h1 className="mt-3 text-3xl tracking-[-0.015em]">Halaman ini bukan untuk peran Anda</h1>
      <p className="mt-3 max-w-[52ch] leading-relaxed text-ink-2">
        Akun Anda tidak punya akses ke halaman tersebut. Kembali ke beranda Anda untuk melanjutkan.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 w-fit items-center rounded-[--radius-control] bg-accent px-5 font-medium text-ink transition-transform duration-150 active:scale-[0.98]"
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
