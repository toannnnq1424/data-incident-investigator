import type { EntityRef } from '@dii/shared-types';

export interface MetadataChange {
  id: string;
  entity: EntityRef;
  category: 'schema' | 'ownership' | 'tag' | 'domain' | 'pipeline';
  observedAt: string;
  summary: string;
}

export interface LineageResult {
  seed: EntityRef;
  upstream: EntityRef[];
  downstream: EntityRef[];
  truncated: boolean;
}

export interface MetadataAdapter {
  healthCheck(): Promise<void>;
  searchEntities(query: string, limit: number): Promise<EntityRef[]>;
  getLineage(entity: EntityRef, depth: number, entityLimit: number): Promise<LineageResult>;
  getRecentChanges(entities: EntityRef[], since: string): Promise<MetadataChange[]>;
}
