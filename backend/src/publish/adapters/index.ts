export interface PublishConfig {
  accessToken: string;
  accountId: string;
  metadata?: Record<string, any>;
}

export interface PublishAdapter {
  publish(image: Buffer, caption: string, config?: PublishConfig): Promise<string>;
}
