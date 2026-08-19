import type { Metadata } from 'next';
import { AiInsightView } from '@/components/owner/insights/ai-insight-view';

export const metadata: Metadata = {
  title: 'AI Insight Assistant | Jagoan POS',
  description: 'Asisten AI cerdas untuk menganalisis performa toko, tren penjualan, dan rekomendasi bisnis.',
};

export default function InsightsPage() {
  return <AiInsightView />;
}
