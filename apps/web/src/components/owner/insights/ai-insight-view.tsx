'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Lightbulb,
  PaperPlaneRight,
  Sparkle,
  User,
} from '@phosphor-icons/react';
import {
  aiChatMessageSchema,
  type AiChatResponse,
  type AppErrorCode,
} from '@jagoan-pos/contracts';
import { useAiChat } from '@/lib/api/owner';
import { messageFor } from '@/lib/i18n/messages';
import { formatDateTimeWib } from '@/lib/format/date';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { AiMarkdownMessage } from './ai-markdown-message';
import { OwnerPageHeader } from '../owner-page-header';

export type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  asOf?: string | null;
  timestamp: string;
  isError?: boolean;
};

const SUGGESTED_PROMPTS = [
  'Berapa total omzet toko hari ini?',
  'Apa 5 produk paling laris dalam 7 hari terakhir?',
  'Kapan jam paling ramai transaksi di toko saya?',
  'Berikan saran strategi untuk meningkatkan penjualan.',
];

export function AiInsightView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      content:
        'Halo! Saya adalah AI Insight Assistant Anda. Tanyakan apa saja tentang penjualan, produk terlaris, pola jam sibuk, atau rekomendasi strategi bisnis toko Anda.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatMutation = useAiChat();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatMutation.isPending]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawMessage = textToSend ?? inputValue;
    const validation = aiChatMessageSchema.safeParse({ message: rawMessage });

    if (!validation.success) {
      return;
    }

    const cleanMessage = validation.data.message;
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setGeneralError(null);

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      content: cleanMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response: AiChatResponse = await chatMutation.mutateAsync({
        message: cleanMessage,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: response.answer,
        asOf: response.asOf,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errObj = err as { code?: AppErrorCode; message?: string } | null;
      const localizedError =
        (errObj?.code ? messageFor(errObj.code) : null) ??
        errObj?.message ??
        (err instanceof Error ? err.message : 'Gagal memproses pertanyaan AI.');

      setGeneralError(localizedError);

      const errorAiMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        content: `Maaf, ${localizedError}`,
        timestamp: new Date().toISOString(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorAiMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !chatMutation.isPending) {
        void handleSendMessage();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <OwnerPageHeader
        title="AI Insight Assistant"
        subtitle="Analisis performa bisnis, rekomendasi strategi, dan tanya jawab data toko secara cerdas."
      />

      {generalError ? (
        <Banner tone="danger">
          {generalError}
        </Banner>
      ) : null}

      {/* Main Chat Container */}
      <div className="flex flex-col h-[calc(100vh-210px)] min-h-[500px] rounded-panel border border-line bg-surface shadow-xs overflow-hidden">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[88%] sm:max-w-[78%] ${
                  isUser ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isUser
                      ? 'bg-ink text-surface'
                      : 'bg-accent/20 text-accent-deep border border-accent/30'
                  }`}
                  aria-hidden="true"
                >
                  {isUser ? (
                    <User size={16} weight="bold" />
                  ) : (
                    <Sparkle size={16} weight="duotone" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`flex flex-col gap-1.5 rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-accent text-ink rounded-tr-xs font-medium'
                      : msg.isError
                        ? 'bg-danger/10 text-danger border border-danger/20 rounded-tl-xs'
                        : 'bg-paper/70 text-ink border border-line rounded-tl-xs shadow-2xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <AiMarkdownMessage content={msg.content} />
                  )}

                  {/* AsOf timestamp indicator */}
                  {!isUser && msg.asOf ? (
                    <div className="flex items-center gap-1 text-[11px] text-ink-2 pt-1 border-t border-line/60 mt-1">
                      <Sparkle size={12} weight="duotone" className="text-accent-deep" />
                      <span>Data analitik per: {formatDateTimeWib(msg.asOf)} WIB</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {chatMutation.isPending ? (
            <div className="flex gap-3 max-w-[80%] self-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-deep border border-accent/30">
                <Sparkle size={16} weight="duotone" className="animate-spin" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-line bg-paper/70 px-4 py-3 text-xs text-ink-2 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <span>AI sedang menganalisis data toko Anda…</span>
              </div>
            </div>
          ) : null}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts / Chips */}
        {messages.length <= 1 ? (
          <div className="flex flex-wrap gap-2 px-4 sm:px-6 pb-3 pt-1 border-t border-dashed border-line bg-paper/30">
            <span className="flex items-center gap-1 text-xs font-medium text-ink-2 w-full mb-0.5">
              <Lightbulb size={14} className="text-accent-deep" weight="duotone" />
              Saran pertanyaan:
            </span>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void handleSendMessage(prompt)}
                disabled={chatMutation.isPending}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2 transition-colors hover:border-accent hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        {/* Input Bar */}
        <div className="flex items-end gap-2 border-t border-line bg-surface p-3 sm:p-4">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan analisis penjualan toko Anda… (Tekan Enter untuk kirim)"
            rows={1}
            maxLength={2000}
            disabled={chatMutation.isPending}
            className="flex-1 max-h-40 min-h-[44px] overflow-y-auto resize-none rounded-control border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-2 focus:border-accent focus:bg-surface focus:outline-none disabled:opacity-50"
          />

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => void handleSendMessage()}
            disabled={!inputValue.trim() || chatMutation.isPending}
            className="h-[44px] px-4 shadow-xs"
            aria-label="Kirim pertanyaan"
          >
            <PaperPlaneRight size={16} weight="bold" />
            <span className="hidden sm:inline">Kirim</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Alias export for plan spec compatibility
export const AiInsightContent = AiInsightView;
