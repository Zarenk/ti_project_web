import { Logger } from '@nestjs/common';
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
  AiStreamChunk,
} from './ai-provider.interface';
import OpenAI from 'openai';

const MODEL = 'gpt-4o-mini';

export class OpenAIProvider implements AiProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly apiKey: string | undefined) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI provider initialized');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(request: AiProviderRequest): Promise<AiProviderResponse> {
    if (!this.client) throw new Error('OpenAI provider not available');

    const response = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: request.maxTokens,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages,
      ],
    });

    return {
      text:
        response.choices[0]?.message?.content ??
        'No pude generar una respuesta.',
      provider: this.name,
    };
  }

  async *chatStream(
    request: AiProviderRequest,
  ): AsyncGenerator<AiStreamChunk> {
    if (!this.client) throw new Error('OpenAI provider not available');

    const stream = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: request.maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages,
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        yield { text: delta, done: false, provider: this.name };
      }
    }
    yield { text: '', done: true, provider: this.name };
  }
}
