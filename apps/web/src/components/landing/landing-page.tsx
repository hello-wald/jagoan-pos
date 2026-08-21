import Link from 'next/link';
import { CtaSection } from './cta-section';
import { RoleShowcase } from './role-showcase';

export function LandingPage() {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-ink text-white">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/15">
        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex h-[72px] max-w-[1800px] items-center justify-between px-5 sm:px-8 lg:px-8 xl:px-12"
        >
          <a
            href="#top"
            className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center bg-accent font-mono text-sm font-semibold text-ink transition-transform duration-200 group-hover:-rotate-3"
            >
              J
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-white">
              POS Jagoan
            </span>
          </a>

          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center border border-white/60 px-5 text-sm font-semibold text-white transition-colors hover:border-accent hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Masuk
          </Link>
        </nav>
      </header>

      <main id="top">
        <section
          className="relative isolate flex min-h-[100dvh] items-start overflow-hidden pt-[116px] sm:pt-[132px] md:items-center md:pt-[72px]"
          aria-labelledby="hero-title"
        >
          <picture className="landing-media-enter absolute inset-0 -z-20 block">
            <source media="(max-width: 767px)" srcSet="/landing/hero-rice-bowl-mobile.png" />
            <img
              src="/landing/hero-rice-bowl.png"
              alt=""
              fetchPriority="high"
              decoding="async"
              className="size-full object-cover object-[58%_center] md:object-[55%_center]"
            />
          </picture>

          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(15,12,11,0.84)_0%,rgba(15,12,11,0.68)_42%,rgba(15,12,11,0.24)_66%,rgba(15,12,11,0)_82%)] md:bg-[linear-gradient(90deg,rgba(15,12,11,0.94)_0%,rgba(15,12,11,0.82)_30%,rgba(15,12,11,0.48)_48%,rgba(15,12,11,0.12)_62%,rgba(15,12,11,0)_76%)]"
          />

          <div className="landing-copy-enter mx-auto w-full max-w-[1800px] px-5 sm:px-8 lg:px-8 xl:px-12">
            <div className="max-w-[580px] md:w-[48%]">
              <p className="mb-5 border-l-2 border-accent pl-4 font-mono text-[10px] font-medium uppercase leading-5 tracking-[0.14em] text-white/75 sm:text-xs">
                POS &amp; Business Insight untuk Bisnis Rice Bowl
              </p>

              <h1
                id="hero-title"
                className="text-[clamp(2.6rem,3.75vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white"
              >
                <span className="lg:block">Kelola Outlet Lebih Jago,</span>{' '}
                <span className="lg:block">Ambil Keputusan Lebih Cepat</span>
              </h1>

              <p className="mt-6 max-w-[560px] text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
                Kelola checkout, stok, transaksi, dan insight penjualan rice bowl dalam satu sistem
                yang rapi.
              </p>

              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center bg-accent px-7 text-sm font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-[0.97] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  Coba Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        <RoleShowcase />
        <CtaSection />
      </main>
    </div>
  );
}
