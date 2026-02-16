import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  VerticalEventsService,
  type VerticalChangedEvent,
} from './vertical-events.service';

interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}

interface WebhookPayload extends VerticalChangedEvent {
  timestamp: string;
  event: 'vertical.changed';
}

@Injectable()
export class VerticalWebhooksService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(VerticalWebhooksService.name);
  private readonly webhooks = new Map<number, WebhookConfig[]>(); // organizationId -> webhooks[]
  private readonly verticalChangedListener: (
    payload: VerticalChangedEvent,
  ) => void;

  // Configuration
  private readonly defaultTimeout = 5000; // 5 seconds
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(private readonly events: VerticalEventsService) {
    this.verticalChangedListener = this.handleVerticalChanged.bind(this);
  }

  onModuleInit() {
    this.events.onChanged(this.verticalChangedListener);
    this.logger.log('[Webhooks] Service initialized');
  }

  onModuleDestroy() {
    this.events.offChanged(this.verticalChangedListener);
  }

  /**
   * Register a webhook URL for an organization
   */
  registerWebhook(organizationId: number, config: WebhookConfig): void {
    const existing = this.webhooks.get(organizationId) || [];
    existing.push({
      ...config,
      retries: config.retries ?? this.maxRetries,
      timeout: config.timeout ?? this.defaultTimeout,
    });
    this.webhooks.set(organizationId, existing);
    this.logger.log(
      `[Webhooks] Registered webhook for organization ${organizationId}: ${config.url}`,
    );
  }

  /**
   * Unregister a webhook URL for an organization
   */
  unregisterWebhook(organizationId: number, url: string): void {
    const existing = this.webhooks.get(organizationId);
    if (!existing) return;

    const filtered = existing.filter((w) => w.url !== url);
    if (filtered.length === 0) {
      this.webhooks.delete(organizationId);
    } else {
      this.webhooks.set(organizationId, filtered);
    }
    this.logger.log(
      `[Webhooks] Unregistered webhook for organization ${organizationId}: ${url}`,
    );
  }

  /**
   * Get all webhooks for an organization
   */
  getWebhooks(organizationId: number): WebhookConfig[] {
    return this.webhooks.get(organizationId) || [];
  }

  private async handleVerticalChanged(
    payload: VerticalChangedEvent,
  ): Promise<void> {
    if (!payload.organizationId) {
      return;
    }

    const webhooks = this.webhooks.get(payload.organizationId);
    if (!webhooks || webhooks.length === 0) {
      return;
    }

    const webhookPayload: WebhookPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
      event: 'vertical.changed',
    };

    // Fire all webhooks in parallel (don't wait)
    webhooks.forEach((config) => {
      this.sendWebhook(config, webhookPayload).catch((error) => {
        this.logger.error(
          `[Webhooks] Failed to send webhook to ${config.url}: ${error.message}`,
        );
      });
    });
  }

  private async sendWebhook(
    config: WebhookConfig,
    payload: WebhookPayload,
    attempt = 1,
  ): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        config.timeout ?? this.defaultTimeout,
      );

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TI-Projecto-Web/1.0',
          ...config.headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log(
        `[Webhooks] Successfully sent to ${config.url} (attempt ${attempt})`,
      );
    } catch (error) {
      const maxRetries = config.retries ?? this.maxRetries;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[Webhooks] Retrying ${config.url} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWebhook(config, payload, attempt + 1);
      }

      // Max retries exceeded
      throw error;
    }
  }

  /**
   * Test a webhook URL (useful for validation)
   */
  async testWebhook(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const testPayload: WebhookPayload = {
        event: 'vertical.changed',
        timestamp: new Date().toISOString(),
        companyId: 0,
        organizationId: 0,
        previousVertical: 'GENERAL',
        newVertical: 'GENERAL',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.defaultTimeout,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TI-Projecto-Web/1.0 (Test)',
          'X-Webhook-Test': 'true',
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, message: 'Webhook test successful' };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Get webhook statistics
   */
  getStats(): {
    totalOrganizations: number;
    totalWebhooks: number;
    webhooksByOrg: Map<number, number>;
  } {
    const webhooksByOrg = new Map<number, number>();
    let totalWebhooks = 0;

    for (const [orgId, webhooks] of this.webhooks.entries()) {
      webhooksByOrg.set(orgId, webhooks.length);
      totalWebhooks += webhooks.length;
    }

    return {
      totalOrganizations: this.webhooks.size,
      totalWebhooks,
      webhooksByOrg,
    };
  }
}
