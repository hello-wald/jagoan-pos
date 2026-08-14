"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  TestimonialsColumn,
  type TestimonialItem,
} from "@/components/ui/testimonials-columns-1";

const testimonials: TestimonialItem[] = [
  {
    text: "Pas toko ramai, kasir tetap fokus. Transaksi masuk dan stok langsung ikut berubah.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
    name: "Ratih Permata",
    role: "Owner, Kopi Arunika",
  },
  {
    text: "Sekarang saya bisa cek produk laris tanpa menunggu rekap manual dari kasir.",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80",
    name: "Dimas Prakoso",
    role: "Owner, Warung Sore",
  },
  {
    text: "Laporan harian lebih mudah dibaca. Saya tahu kapan harus tambah stok dan staf.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&h=96&q=80",
    name: "Nabila Fajri",
    role: "Manajer, Dapur Kayu",
  },
  {
    text: "Pembagian aksesnya jelas. Kasir bekerja cepat, saya tetap pegang kontrol toko.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96&q=80",
    name: "Reza Mahendra",
    role: "Owner, Toko Nusa",
  },
  {
    text: "Pertanyaan soal omzet bisa langsung saya lanjutkan lewat chat AI dari data toko.",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&h=96&q=80",
    name: "Ayu Larasati",
    role: "Operasional, Bumi Rasa",
  },
  {
    text: "Riwayat transaksi dan stok ada di satu tempat. Tutup toko jadi lebih tenang.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&h=96&q=80",
    name: "Galang Wicaksono",
    role: "Owner, Kedai Tumbuh",
  },
];

const firstColumn = testimonials.slice(0, 2);
const secondColumn = testimonials.slice(2, 4);
const thirdColumn = testimonials.slice(4, 6);

export function LandingTestimonials() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="testimoni" className="mt-20 scroll-mt-24 sm:mt-28">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-indigo-100 bg-indigo-50/70 px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[60%] -translate-x-1/2 rounded-full bg-indigo-200/45 blur-3xl" />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Operasional lebih tenang karena semua tercatat.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            Begini pengalaman pemilik dan pengelola toko saat transaksi, stok, dan laporan berada dalam satu alur.
          </p>
        </motion.div>

        <div className="relative mx-auto mt-12 flex max-h-[590px] max-w-6xl justify-center gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] sm:mt-14">
          <TestimonialsColumn
            testimonials={firstColumn}
            duration={15}
            className="w-full sm:w-1/2 lg:w-1/3"
          />
          <TestimonialsColumn
            testimonials={secondColumn}
            duration={19}
            className="hidden w-1/2 sm:block lg:w-1/3"
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            duration={17}
            className="hidden w-1/3 lg:block"
          />
        </div>
      </div>
    </section>
  );
}
