import type { AiChatRequest, AiChatResponse } from "./ai.schema";


export interface AiContract { 
    'ai.chat': {request: AiChatRequest; response: AiChatResponse}
}

export type AiPattern = keyof AiContract;
export type AiRequest<P extends AiPattern> = AiContract[P]['request']
export type AiResponse<P extends AiPattern> = AiContract[P]['response']