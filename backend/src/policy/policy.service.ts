import { ManualReviewQueue } from './manual-review-queue';
import { Policy } from './policy.types';
import { PromptRun, ProviderSafetySignal } from './prompt-run';
import { ReviewNote } from './review-note';

export class PolicyService {
  private orgPolicy: Policy = { blockedTerms: [], nsfw: false };
  private campaignPolicies: Record<string, Policy> = {};

  setOrgPolicy(policy: Policy) {
    this.orgPolicy = policy;
  }

  setCampaignPolicy(campaignId: string, policy: Policy) {
    this.campaignPolicies[campaignId] = policy;
  }

  getPolicyForCampaign(campaignId?: string): Policy {
    if (campaignId && this.campaignPolicies[campaignId]) {
      return this.campaignPolicies[campaignId];
    }
    return this.orgPolicy;
  }

  validatePrompt(
    prompt: string,
    variables: Record<string, string>,
    campaignId?: string,
  ): ReviewNote | null {
    const policy = this.getPolicyForCampaign(campaignId);
    const text = [prompt, ...Object.values(variables)].join(' ').toLowerCase();

    if (policy.nsfw && text.includes('nsfw')) {
      return new ReviewNote('NSFW content detected');
    }

    for (const term of policy.blockedTerms) {
      if (text.includes(term.toLowerCase())) {
        return new ReviewNote(`Blocked term used: ${term}`);
      }
    }

    return null;
  }

  evaluateSafetySignals(
    promptRun: PromptRun,
    signals: ProviderSafetySignal[],
    queue: ManualReviewQueue,
  ): ReviewNote | null {
    const flagged = signals.find((s) => s.flagged);
    if (flagged) {
      promptRun.status = 'failed';
      const note = new ReviewNote(flagged.message);
      queue.enqueue(note);
      return note;
    }
    promptRun.status = 'success';
    return null;
  }
}