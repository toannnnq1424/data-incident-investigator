import type { MetadataAdapter } from '@dii/datahub-client';
import type { IncidentRequest, InvestigationReport } from '@dii/shared-types';

export interface InvestigationLimits {
  lineageDepth: number;
  entityCount: number;
  toolCalls: number;
  timeoutMs: number;
}

export interface InvestigationContext {
  metadata: MetadataAdapter;
  limits: InvestigationLimits;
}

export interface InvestigationRunner {
  investigate(
    request: IncidentRequest,
    context: InvestigationContext,
  ): Promise<InvestigationReport>;
}
