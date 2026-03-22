/**
 * ============================================================================
 * LINKING LIBRARY EXPORTS (Day 23)
 * ============================================================================
 *
 * Barrel export file for the linking library.
 * Contains helper functions for linking imports to workflow entities.
 *
 * @version Day 23 - Import Triage, Search & Linking v1
 * ============================================================================
 */

export {
  linkImportToEntity,
  unlinkImportFromEntity,
  getLinkedImports,
  getLinkedEntities,
  hasLink,
  getLinkedImportsCount,
  getLinkedEntitiesSummary,
  ENTITY_TYPE_LABELS,
} from './importLinking';

export type {
  LinkableEntityType,
  LinkedEntity,
} from './importLinking';
