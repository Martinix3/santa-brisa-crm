
'use server';

import { askMarketingAssistant, type MarketingAssistantInput, type MarketingAssistantOutput } from '@/ai/flows/marketing-assistant-flow';

export async function askMarketingAssistantAction(input: MarketingAssistantInput): Promise<MarketingAssistantOutput> {
  return askMarketingAssistant(input);
}
