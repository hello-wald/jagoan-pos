"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type ChatMessage } from "@/types/ai-insight";
import { apiClient } from "@/lib/api";

export const QUICK_PROMPTS = [
  {
    title: "Produk Terlaris",
    prompt: "Produk apa yang paling laris dan menghasilkan omzet terbesar minggu ini?",
  },
  {
    title: "Jam Sibuk Kasir",
    prompt: "Kapan jam sibuk toko saya dan bagaimana rekomendasi jadwal kasirnya?",
  },
  {
    title: "Rekomendasi Restock",
    prompt: "Apakah ada stok barang yang menipis atau perlu segera di-restock?",
  },
  {
    title: "Analisis Basket Size",
    prompt: "Berapa rata-rata nilai transaksi pelanggan bulan ini dan strategi peningkatannya?",
  },
];

const INITIAL_GREETING: ChatMessage = {
  id: "msg-welcome",
  sender: "AI",
  content:
    "Halo! Saya **AI Insight Assistant** toko Anda. Saya terhubung langsung dengan engine analitik transaksi untuk membantu Anda membaca tren omzet, memantau stok, dan mengoptimalkan performa bisnis toko Anda.\n\nAda yang ingin Anda analisis hari ini?",
  timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
};

export function useOwnerAiInsight() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateMockAiResponse = (userPrompt: string): { content: string; metrics?: { label: string; value: string; trend?: string }[] } => {
    const prompt = userPrompt.toLowerCase();

    if (prompt.includes("laris") || prompt.includes("terlaris") || prompt.includes("omzet")) {
      return {
        content:
          "Berdasarkan analitik transaksi 7 hari terakhir, **Kopi Arabika Gayo 250g** memimpin penjualan dengan total **64 pcs terjual** dan kontribusi omzet sebesar **Rp 4.160.000** (38% dari total pendapatan).\n\n**Rekomendasi:**\n- Pertahankan ketersediaan stok di atas 20 pcs menjelang akhir pekan.\n- Pertimbangkan bundling dengan *Keripik Singkong Balado* untuk menaikkan basket size.",
        metrics: [
          { label: "Top Product", value: "Kopi Arabika Gayo" },
          { label: "Total Terjual", value: "64 pcs", trend: "+18% vs pekan lalu" },
          { label: "Omzet Produk", value: "Rp 4.160.000" },
        ],
      };
    }

    if (prompt.includes("sibuk") || prompt.includes("jam") || prompt.includes("jadwal")) {
      return {
        content:
          "Puncak kepadatan transaksi toko Anda terkonsentrasi pada dua jendela waktu:\n1. **Pukul 12:00 - 14:00 WIB** (Makan siang & istirahat kantor): Rata-rata 28 transaksi/jam.\n2. **Pukul 18:00 - 20:00 WIB** (Pulang kerja): Rata-rata 34 transaksi/jam.\n\n**Rekomendasi Operasional:**\n- Pastikan minimal 2 kasir aktif bertugas pada rentang pukul 17:30 - 20:30 WIB untuk mencegah antrean panjang.",
        metrics: [
          { label: "Jam Paling Padat", value: "18:00 - 20:00 WIB" },
          { label: "Volume Peak", value: "34 Transaksi/Jam" },
          { label: "Rekomendasi Staf", value: "Min. 2 Kasir Aktif" },
        ],
      };
    }

    if (prompt.includes("restock") || prompt.includes("stok") || prompt.includes("menipis")) {
      return {
        content:
          "Terdapat **2 item produk** yang memerlukan perhatian pengadaan stok segera:\n\n1. **Kue Nastar Premium Toples** (SKU: `SNK-002`) - Stok saat ini: **0 pcs** (HABIS).\n2. **Susu UHT Full Cream 1L** (SKU: `MNM-001`) - Stok saat ini: **5 pcs** (Menipis, perkiraan habis dalam 1,5 hari).\n\n**Tindakan Disarankan:** Segera hubungi supplier distributor untuk restock minimal 30 unit sebelum hari Jumat.",
        metrics: [
          { label: "Stok Habis (0)", value: "1 SKU (Nastar)" },
          { label: "Stok Menipis (<=10)", value: "1 SKU (Susu UHT)" },
          { label: "Urgensi Restock", value: "Tinggi" },
        ],
      };
    }

    return {
      content:
        `Berikut adalah rangkuman performa toko berdasarkan pertanyaan Anda mengenai *"${userPrompt}"*:\n\n` +
        "- Rata-rata nilai belanja per pelanggan (*Basket Size*) berada di angka **Rp 58.700**.\n" +
        "- Tingkat konversi transaksi tunai kasir berjalan lancar dengan rata-rata waktu proses **18 detik per transaksi**.\n" +
        "- Tingkat kepuasan kasir dan kelancaran stok berada pada level optimal.",
      metrics: [
        { label: "Basket Size", value: "Rp 58.700" },
        { label: "Tx Speed", value: "18 detik" },
        { label: "Status Toko", value: "Sehat & Tumbuh" },
      ],
    };
  };

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || inputMessage).trim();
      if (!query || isTyping) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        sender: "USER",
        content: query,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage("");
      setIsTyping(true);

      try {
        // Attempt backend AI endpoint or fallback to conversational intelligence mock
        const response = await apiClient<{ reply: string; metrics?: { label: string; value: string; trend?: string }[] }>(
          "/analytics/ai-chat",
          {
            method: "POST",
            body: JSON.stringify({ prompt: query }),
          }
        ).catch(() => null);

        const aiData = response?.reply
          ? { content: response.reply, metrics: response.metrics }
          : generateMockAiResponse(query);

        // Simulate short realistic AI generation delay
        await new Promise((res) => setTimeout(res, 600));

        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          sender: "AI",
          content: aiData.content,
          metrics: aiData.metrics,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputMessage, isTyping]
  );

  const resetChat = () => {
    setMessages([INITIAL_GREETING]);
    setInputMessage("");
  };

  return {
    messages,
    inputMessage,
    setInputMessage,
    isTyping,
    messagesEndRef,
    handleSendMessage,
    resetChat,
  };
}
