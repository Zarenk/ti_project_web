import { Logger } from '@nestjs/common';
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
  AiStreamChunk,
} from './ai-provider.interface';

const MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly apiKey: string | undefined) {
    if (apiKey) {
      this.logger.log('Anthropic provider initialized');
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: AiProviderRequest): Promise<AiProviderResponse> {
    if (!this.apiKey) throw new Error('Anthropic provider not available');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: request.maxTokens,
        system: request.systemPrompt,
        messages: request.messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Anthropic API error: ${response.status} ${errorText}`);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    return {
      text:
        data.content?.find((c) => c.type === 'text')?.text ??
        'No pude generar una respuesta.',
      provider: this.name,
    };
  }

  async *chatStream(
    request: AiProviderRequest,
  ): AsyncGenerator<AiStreamChunk> {
    if (!this.apiKey) throw new Error('Anthropic provider not available');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: request.maxTokens,
        stream: true,
        system: request.systemPrompt,
        messages: request.messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Anthropic stream error: ${response.status} ${errorText}`,
      );
      throw new Error(`Anthropic stream error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body for Anthropic stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const eventMatch = block.match(/^event:\s*(.+)$/m);
          const dataMatch = block.match(/^data:\s*(.+)$/m);

          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1].trim();
          if (eventType === 'content_block_delta') {
            try {
              const parsed = JSON.parse(dataMatch[1]);
              const text = parsed?.delta?.text ?? '';
              if (text) {
                yield { text, done: false, provider: this.name };
              }
            } catch {
              /* skip malformed JSON */
            }
          } else if (eventType === 'message_stop') {
            break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { text: '', done: true, provider: this.name };
  }
}
