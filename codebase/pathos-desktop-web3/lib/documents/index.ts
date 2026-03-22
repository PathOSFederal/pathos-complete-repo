/**
 * ============================================================================
 * DOCUMENTS LIBRARY BARREL EXPORT (Day 24)
 * ============================================================================
 *
 * Re-exports all document-related utilities for convenient imports.
 *
 * @version Day 24 - Import Actions & Extraction v1
 * ============================================================================
 */

// Day 22: Document classification
export {
  classifyDocument,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  ALL_CATEGORIES,
  ALL_SENSITIVITY_LABELS,
} from './classifyDocument';

export type {
  DocumentCategory,
  SensitivityLabel,
  ClassificationResult,
} from './classifyDocument';

// Day 24: Signal extraction
export {
  extractSignals,
  SIGNAL_TYPE_LABELS,
  SIGNAL_TYPE_ICONS,
  SIGNAL_TYPE_COLORS,
  ALL_SIGNAL_TYPES,
} from './extractSignals';

export type {
  SignalType,
  SignalConfidence,
  ExtractedSignal,
  ExtractionResult,
} from './extractSignals';
