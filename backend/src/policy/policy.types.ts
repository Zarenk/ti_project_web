export interface Policy {
  /** List of terms that should not appear in prompts or variables. */
  blockedTerms: string[];
  /** If true, NSFW content is not allowed. */
  nsfw: boolean;
}

export interface CampaignPolicy extends Policy {
  campaignId: string;
}

export const defaultPolicy: Policy = {
  blockedTerms: [],
  nsfw: false,
};