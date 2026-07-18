import { z } from 'zod';

export const EntityKindSchema = z.enum(['dataset', 'dashboard', 'pipeline', 'chart']);

export const EntityRefSchema = z.object({
  urn: z.string().min(1),
  name: z.string().min(1),
  kind: EntityKindSchema,
});

export const IncidentRequestSchema = z.object({
  question: z.string().trim().min(3).max(2_000),
  entityHint: z.string().trim().min(1).max(500).optional(),
  occurredAt: z.iso.datetime().optional(),
  symptom: z.string().trim().min(1).max(2_000).optional(),
});

export const IncidentStatusSchema = z.literal('processing');

export const IncidentAcceptedResponseSchema = z.object({
  incidentId: z.uuid(),
  status: IncidentStatusSchema,
});

export const ApiErrorCodeSchema = z.enum(['VALIDATION_ERROR', 'INTERNAL_ERROR']);

export const ApiErrorIssueSchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    issues: z.array(ApiErrorIssueSchema).optional(),
  }),
});

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['metadata', 'lineage', 'schema-change', 'pipeline', 'ownership']),
  statement: z.string().min(1),
  sourceEntity: EntityRefSchema.optional(),
  observedAt: z.iso.datetime().optional(),
});

export const HypothesisSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

export const InvestigationReportSchema = z.object({
  incidentId: z.string().min(1),
  summary: z.string().min(1),
  entities: z.array(EntityRefSchema),
  evidence: z.array(EvidenceSchema),
  hypotheses: z.array(HypothesisSchema),
  recommendations: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  missingInformation: z.array(z.string().min(1)),
});

export type EntityKind = z.infer<typeof EntityKindSchema>;
export type EntityRef = z.infer<typeof EntityRefSchema>;
export type IncidentRequest = z.infer<typeof IncidentRequestSchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type IncidentAcceptedResponse = z.infer<typeof IncidentAcceptedResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type InvestigationReport = z.infer<typeof InvestigationReportSchema>;
