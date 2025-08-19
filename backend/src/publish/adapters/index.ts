export interface PublishAdapter {
  publish(image: Buffer, caption: string): Promise<string>;
}