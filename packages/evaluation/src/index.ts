import type { IncidentRequest, InvestigationReport } from '@dii/shared-types';

export interface EvaluationCase {
  id: string;
  incident: IncidentRequest;
  expectedRootCauseIds: string[];
  requiredEvidenceIds: string[];
}

export interface EvaluationResult {
  caseId: string;
  report: InvestigationReport;
  rootCauseTop1Correct: boolean;
  rootCauseTop3Recall: number;
  unsupportedClaimCount: number;
  latencyMs: number;
  toolCallCount: number;
}
