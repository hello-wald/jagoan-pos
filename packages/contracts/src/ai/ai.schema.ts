import { z } from 'zod';
// yg di pake di fe
export const aiChatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
});

// request
export const aiChatRequestSchema = aiChatMessageSchema.extend({
  merchantId: z.string().uuid('Invalid merchant ID format'),
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;
export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;

// format jawaban AI ke frontend
export type AiChatResponse = {
  answer: string; // bhs indonesia
  asOf: string | null; //per tgl brp
};
