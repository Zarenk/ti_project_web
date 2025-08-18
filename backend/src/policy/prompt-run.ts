export interface PromptRun {
  id: string;
  status: 'pending' | 'success' | 'failed';
}

export interface ProviderSafetySignal {
  flagged: boolean;
  message: string;
}