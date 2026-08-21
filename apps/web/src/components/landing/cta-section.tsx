import Link from 'next/link';
import { ArrowRight, SignIn, Sparkle } from '@phosphor-icons/react/dist/ssr';

export function CtaSection() {
  return (
    <div className="relative border-t border-white/10 bg-[#0a090b] text-white">
      {/* CTA Section */}
      <section
        id="cta"
        aria-labelledby="cta-title"
        className="relative overflow-hidden px-5 pt-16 pb-14 sm:px-8 sm:pt-20 sm:pb-16 lg:px-10 lg:pt-24 lg:pb-20"
      >
        {/* Subtle Radial Glow */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block opacity-25 [background-image:radial-gradient(circle_at_50%_20%,rgba(232,175,37,0.18),transparent_50%)]"
        />

        <div className="relative mx-auto max-w-[1240px]">
          {/* Dark Glassmorphism Card */}
          <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-gradient-to-b from-[#18161c]/90 via-[#131116]/80 to-[#0e0d11]/90 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-12 lg:p-14">
            {/* Top Glowing Accent Line */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
            />

            <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
              <div className="max-w-[760px]">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  <Sparkle size={13} weight="fill" />
                  <span>Siap Tingkatkan Omzet Outlet</span>
                </div>

                <h2
                  id="cta-title"
                  className="text-[clamp(2.1rem,4.2vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-white"
                >
                  Siap Kelola Banyak Outlet dengan Lebih Rapi?
                </h2>

                <p className="mt-4 max-w-[620px] text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
                  Satukan katalog produk, transaksi, stok, dan performa setiap outlet melalui satu
                  sistem POS yang terstruktur dan scalable.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/register"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-accent px-6 text-sm font-semibold text-ink shadow-[0_10px_28px_rgba(160,98,7,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[0.97] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    Coba Demo POS Jagoan
                    <ArrowRight size={16} weight="bold" aria-hidden />
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-white/20 bg-white/[0.04] px-6 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/[0.08] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    <SignIn size={16} weight="bold" aria-hidden />
                    Masuk ke Dashboard
                  </Link>
                </div>
              </div>

              {/* Decorative Geometric Icon Badge */}
              <div aria-hidden="true" className="hidden lg:block">
                <div className="relative grid size-36 place-items-center rounded-[28px] border border-white/12 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="absolute inset-2.5 rounded-[20px] border border-accent/20" />
                  <span className="font-mono text-6xl font-bold text-accent">J</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern SaaS Footer */}
      <footer className="border-t border-white/8 bg-[#070608] px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded bg-accent font-mono text-xs font-bold text-ink"
            >
              J
            </span>
            <div>
              <p className="text-sm font-semibold text-white">POS Jagoan</p>
              <p className="text-xs text-white/50">
                Sistem POS &amp; Business Intelligence untuk Bisnis Kuliner Modern
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-white/60">
            <Link href="/register" className="transition-colors hover:text-accent">
              Daftar Demo
            </Link>
            <Link href="/login" className="transition-colors hover:text-accent">
              Login Akun
            </Link>
            <a href="#top" className="transition-colors hover:text-white">
              Kembali ke Atas ↑
            </a>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-[1240px] border-t border-white/6 pt-6 text-center text-[11px] text-white/40 sm:text-left">
          <p>© {new Date().getFullYear()} POS Jagoan. Semua hak cipta dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
