
'use server';

import { testFlow, type TestFlowInput, type TestFlowOutput } from '@/ai/flows/test-flow';

export async function testFlowAction(input: TestFlowInput): Promise<TestFlowOutput> {
  return testFlow(input);
}
