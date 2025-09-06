
'use server';

import { getTraceabilityReport, type TraceabilityReportInput, type TraceabilityReportOutput } from '@/ai/flows/traceability-report-flow';

export async function getTraceabilityReportAction(input: TraceabilityReportInput): Promise<TraceabilityReportOutput> {
  return getTraceabilityReport(input);
}
