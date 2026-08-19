'use client';

import { useMutation } from '@tanstack/react-query';
import type { AiChatMessage, AiChatResponse } from '@jagoan-pos/contracts';
import { bffFetch } from './bff-client';

export function useAiChat() {
  return useMutation({
    mutationFn: (dto: AiChatMessage) =>
      bffFetch<AiChatResponse>('/ai-insight/chat', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  });
}
