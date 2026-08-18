import { DM_Mono, Instrument_Sans } from 'next/font/google';

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

// DM Mono is not variable; weights must be enumerated.
export const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-dm-mono',
  display: 'swap',
});
