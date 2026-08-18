export interface LlmFunctionCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
  [key: string]: unknown;
}

export interface LlmPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: LlmFunctionCall;
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
    id?: string;
  };
  [key: string]: unknown;
}

export interface LlmContent {
  role: 'user' | 'model';
  parts: LlmPart[];
}

export interface LlmResponse {
  text: string | null;
  functionCalls: LlmFunctionCall[];
  modelContent?: LlmContent;
}

export interface LlmInput {
  contents: LlmContent[];
}

export interface LlmToolParameterProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  description?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface LlmToolParameters {
  type: 'object';
  properties: Record<string, LlmToolParameterProperty>;
  required?: string[];
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters?: LlmToolParameters;
}
