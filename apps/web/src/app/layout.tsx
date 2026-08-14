import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/context/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "App K - POS & Business Intelligence SaaS",
  description: "Platform Point of Sale dan Analitik Penjualan Berbasis SaaS untuk UMKM Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased text-slate-900 flex flex-col">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
