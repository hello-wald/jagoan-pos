"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";

export type TestimonialItem = {
  text: string;
  image: string;
  name: string;
  role: string;
};

type TestimonialsColumnProps = {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
};

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 16,
}: TestimonialsColumnProps) {
  const reduceMotion = useReducedMotion();
  const items = reduceMotion ? testimonials : [...testimonials, ...testimonials];

  return (
    <div className={className}>
      <motion.div
        initial={{ y: "0%" }}
        animate={{ y: reduceMotion ? "0%" : ["0%", "-50%"] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
              }
        }
        className="flex flex-col gap-4 pb-4"
      >
        {items.map(({ text, image, name, role }, index) => (
          <figure
            key={`${name}-${index}`}
            className="w-full rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-30px_rgba(79,70,229,0.45)]"
          >
            <blockquote className="text-sm font-medium leading-6 text-slate-700">
              “{text}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <img
                src={image}
                alt={`Foto ${name}`}
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-100"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-950">
                  {name}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {role}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </motion.div>
    </div>
  );
}
