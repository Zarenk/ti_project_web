export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiProviderRequest {
  systemPrompt: string;
  messages: AiChatMessage[];
  maxTokens: number;
}

export interface AiProviderResponse {
  text: string;
  provider: string;
}

export interface AiStreamChunk {
  text: string;
  done: boolean;
  provider: string;
}

export interface AiProvider {
  readonly name: string;
  isAvailable(): boolean;
  chat(request: AiProviderRequest): Promise<AiProviderResponse>;
  chatStream(request: AiProviderRequest): AsyncGenerator<AiStreamChunk>;
}
