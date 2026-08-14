"use client";

import React from "react";
import {
  Bot,
  Sparkles,
  Send,
  Trash2,
  TrendingUp,
  Clock,
  Package,
  ShoppingBag,
  ArrowRight,
  Database,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOwnerAiInsight, QUICK_PROMPTS } from "@/hooks/use-owner-ai-insight";

export default function OwnerAiInsightPage() {
  const {
    messages,
    inputMessage,
    setInputMessage,
    isTyping,
    messagesEndRef,
    handleSendMessage,
    resetChat,
  } = useOwnerAiInsight();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <OwnerLayout
      title="AI Insight & Analisis Bisnis"
      subtitle="Konsultasikan data omzet, rekomendasi restock, dan tren jam sibuk toko Anda dengan AI Assistant"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={resetChat}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs"
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
        >
          Bersihkan Obrolan
        </Button>
      }
    >
      <div className="flex flex-col h-[calc(100vh-170px)] max-h-[850px] bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Chatbot Engine Status Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  App K AI Business Advisor
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Terhubung ke Mesin Analitik ClickHouse OLAP Toko
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="success" size="sm">
              <Database className="w-3 h-3 mr-1" /> Real-Time Analytics
            </Badge>
          </div>
        </div>

        {/* Chat Messages Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${
                msg.sender === "USER" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-2xs ${
                  msg.sender === "USER"
                    ? "bg-slate-900 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {msg.sender === "USER" ? (
                  "You"
                ) : (
                  <Bot className="w-5 h-5 text-emerald-700" />
                )}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-2xl space-y-2.5 ${
                  msg.sender === "USER" ? "items-end text-right" : "items-start text-left"
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "USER"
                      ? "bg-emerald-600 text-white rounded-tr-xs font-medium shadow-sm"
                      : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs"
                  }`}
                >
                  <div className="whitespace-pre-line space-y-2">
                    {msg.content.split("\n\n").map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>

                  {/* AI Structured Metrics Pills */}
                  {msg.metrics && msg.metrics.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                      {msg.metrics.map((met, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-0.5"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            {met.label}
                          </span>
                          <p className="font-extrabold text-slate-900 text-xs">
                            {met.value}
                          </p>
                          {met.trend && (
                            <span className="text-[10px] font-bold text-emerald-600 block">
                              {met.trend}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 font-medium px-1 block">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* AI Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-800 shadow-2xs">
                <Bot className="w-5 h-5 text-emerald-700 animate-pulse" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-200/80 shadow-xs flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  AI sedang menganalisis data transaksi toko...
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Suggestions Bar */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Prompt Cepat:
          </span>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isTyping}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 text-xs font-semibold text-slate-700 transition duration-150 whitespace-nowrap shadow-2xs active:scale-95 disabled:opacity-50"
            >
              {qp.title}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={onSubmit}
          className="p-4 bg-white border-t border-border flex items-center gap-3 flex-shrink-0"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Tanyakan analisis omzet, produk terlaris, stok, atau pola jam sibuk toko..."
            disabled={isTyping}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition disabled:opacity-40 flex items-center gap-2 active:scale-95"
          >
            <span>Kirim</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </OwnerLayout>
  );
}
