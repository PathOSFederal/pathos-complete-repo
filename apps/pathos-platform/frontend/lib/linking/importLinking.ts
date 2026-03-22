/**
 * ============================================================================
 * IMPORT LINKING HELPERS (Day 23 - Workflow Linking v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides helper functions for linking and unlinking imports to workflow
 * entities (Saved Jobs, Target Roles, Job Alerts). These functions wrap
 * the documentImportStore actions and provide additional query capabilities.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────────┐
 * │       UI        │ --> │   THIS FILE     │ --> │ documentImportStore │
 * │  (Link modal,   │     │  (Helpers)      │     │  (State + Persist) │
 * │   Backlinks)    │     │                 │     │                    │
 * └─────────────────┘     └─────────────────┘     └────────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. linkImportToEntity - Create a link between import and entity
 * 2. unlinkImportFromEntity - Remove a link between import and entity
 * 3. getLinkedImports - Get all imports linked to an entity (for backlinks)
 * 4. getLinkedEntities - Get all entities linked from an import
 * 5. hasLink - Check if a specific link exists
 *
 * HOUSE RULES COMPLIANCE (Day 23):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 23 - Import Triage, Search & Linking v1
 * ============================================================================
 */

import { useDocumentImportStore } from '@/store/documentImportStore';
import type {
  ImportedDocument,
  LinkableEntityType,
  LinkedEntity,
} from '@/store/documentImportStore';

// Re-export types for convenience
export type { LinkableEntityType, LinkedEntity };

// ============================================================================
// ENTITY TYPE LABELS (for UI display)
// ============================================================================

/**
 * Human-readable labels for entity types.
 */
export const ENTITY_TYPE_LABELS: Record<LinkableEntityType, string> = {
  savedJob: 'Saved Job',
  targetRole: 'Target Role',
  jobAlert: 'Job Alert',
};

// ============================================================================
// LINKING FUNCTIONS
// ============================================================================

/**
 * Links an import to an entity.
 *
 * HOW IT WORKS:
 * 1. Get the store's linkToEntity action
 * 2. Call it with the import ID, entity type, and entity ID
 * 3. Return success/failure
 *
 * @param importId - ID of the import document
 * @param entityType - Type of entity to link to
 * @param entityId - ID of the entity
 * @returns true if linked successfully, false if already linked or not found
 */
export function linkImportToEntity(
  importId: string,
  entityType: LinkableEntityType,
  entityId: string
): boolean {
  const store = useDocumentImportStore.getState();
  return store.linkToEntity(importId, entityType, entityId);
}

/**
 * Unlinks an import from an entity.
 *
 * @param importId - ID of the import document
 * @param entityType - Type of entity to unlink from
 * @param entityId - ID of the entity
 * @returns true if unlinked successfully, false if not linked or not found
 */
export function unlinkImportFromEntity(
  importId: string,
  entityType: LinkableEntityType,
  entityId: string
): boolean {
  const store = useDocumentImportStore.getState();
  return store.unlinkFromEntity(importId, entityType, entityId);
}

/**
 * Gets all imports linked to a specific entity.
 * Used for displaying backlinks in entity detail views.
 *
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @returns Array of linked ImportedDocument objects
 */
export function getLinkedImports(
  entityType: LinkableEntityType,
  entityId: string
): ImportedDocument[] {
  const store = useDocumentImportStore.getState();
  return store.getLinkedDocuments(entityType, entityId);
}

/**
 * Gets all entities linked from a specific import.
 *
 * @param importId - ID of the import document
 * @returns Array of LinkedEntity objects, or empty array if not found
 */
export function getLinkedEntities(importId: string): LinkedEntity[] {
  const store = useDocumentImportStore.getState();
  const doc = store.getDocument(importId);

  if (doc === null) {
    return [];
  }

  // Return a copy of the linkedEntities array
  const result: LinkedEntity[] = [];
  for (let i = 0; i < doc.linkedEntities.length; i++) {
    result.push(Object.assign({}, doc.linkedEntities[i]));
  }
  return result;
}

/**
 * Checks if a specific link exists between an import and an entity.
 *
 * @param importId - ID of the import document
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @returns true if the link exists, false otherwise
 */
export function hasLink(
  importId: string,
  entityType: LinkableEntityType,
  entityId: string
): boolean {
  const store = useDocumentImportStore.getState();
  const doc = store.getDocument(importId);

  if (doc === null) {
    return false;
  }

  for (let i = 0; i < doc.linkedEntities.length; i++) {
    const link = doc.linkedEntities[i];
    if (link.entityType === entityType && link.entityId === entityId) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the count of imports linked to a specific entity.
 * Useful for displaying badge counts on entity cards.
 *
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @returns Number of linked imports
 */
export function getLinkedImportsCount(
  entityType: LinkableEntityType,
  entityId: string
): number {
  const linked = getLinkedImports(entityType, entityId);
  return linked.length;
}

/**
 * Gets a summary of linked entities for an import.
 * Returns counts by entity type for quick overview.
 *
 * @param importId - ID of the import document
 * @returns Object with counts per entity type
 */
export function getLinkedEntitiesSummary(importId: string): Record<LinkableEntityType, number> {
  const entities = getLinkedEntities(importId);

  const summary: Record<LinkableEntityType, number> = {
    savedJob: 0,
    targetRole: 0,
    jobAlert: 0,
  };

  for (let i = 0; i < entities.length; i++) {
    const entityType = entities[i].entityType;
    summary[entityType] = summary[entityType] + 1;
  }

  return summary;
}
