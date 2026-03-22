/**
 * ============================================================================
 * DOCUMENT CLASSIFICATION HEURISTICS (Day 22 - Universal Document Import v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides rules-based classification for imported documents.
 * Uses lightweight string matching (no heavy parsing) to guess document category.
 *
 * HOW IT WORKS:
 * 1. Check filename for known patterns (e.g., "resume", "offer_letter")
 * 2. Check text content (if available) for keywords
 * 3. Return best-guess category with confidence
 *
 * CATEGORIES:
 * - JobPosting: Job announcements, vacancy notices
 * - Resume: Resumes, CVs
 * - OfferLetter: Job offer letters, tentative/final offers
 * - BenefitsDoc: Benefits guides, FEHB info
 * - PayStub: Pay statements, earnings statements
 * - TaxDoc: W-2, tax forms
 * - Other: Everything else (default)
 *
 * SENSITIVITY LABELS:
 * - Public: Non-sensitive public information
 * - Personal: PII or personal career data
 * - Sensitive: Financial, tax, or highly private
 * - Unknown: Default when uncertain
 *
 * HOUSE RULES COMPLIANCE (Day 22):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses explicit assignments
 * - Over-commented for teaching-level clarity
 *
 * @version Day 22 - Universal Document Import v1
 * ============================================================================
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Document category classifications.
 *
 * DESIGN RATIONALE:
 * These categories cover the most common document types a federal job seeker
 * would need to import. "Other" is the catch-all for anything that doesn't match.
 */
export type DocumentCategory =
  | 'JobPosting'
  | 'Resume'
  | 'OfferLetter'
  | 'BenefitsDoc'
  | 'PayStub'
  | 'TaxDoc'
  | 'Other';

/**
 * Sensitivity labels for privacy controls.
 *
 * DESIGN RATIONALE:
 * These match common data classification schemes. "Unknown" is the safe default
 * that lets users classify manually if the heuristics are uncertain.
 */
export type SensitivityLabel = 'Public' | 'Personal' | 'Sensitive' | 'Unknown';

/**
 * Result of document classification.
 */
export interface ClassificationResult {
  /**
   * Best-guess category for the document.
   */
  category: DocumentCategory;

  /**
   * Suggested sensitivity label.
   */
  sensitivity: SensitivityLabel;

  /**
   * Confidence score from 0 to 1.
   * Higher = more confident in the classification.
   */
  confidence: number;

  /**
   * Keywords that triggered the classification.
   * Useful for debugging/transparency.
   */
  matchedKeywords: string[];
}

// ============================================================================
// CLASSIFICATION KEYWORDS
// ============================================================================

/**
 * Keywords that suggest a job posting.
 * Checked in both filename and text content (case-insensitive).
 */
const JOB_POSTING_KEYWORDS = [
  'job posting',
  'job announcement',
  'vacancy',
  'usajobs',
  'position description',
  'duties include',
  'qualifications required',
  'how to apply',
  'closing date',
  'open period',
  'gs-',
  'grade:',
  'series:',
  'pay range',
  'hiring path',
  'location negotiable',
];

/**
 * Keywords that suggest a resume.
 */
const RESUME_KEYWORDS = [
  'resume',
  'curriculum vitae',
  'cv',
  'work experience',
  'professional experience',
  'education background',
  'skills and abilities',
  'career objective',
  'career summary',
  'employment history',
];

/**
 * Keywords that suggest an offer letter.
 */
const OFFER_LETTER_KEYWORDS = [
  'offer letter',
  'tentative offer',
  'final offer',
  'job offer',
  'employment offer',
  'official offer',
  'start date',
  'report to duty',
  'entrance on duty',
  'eod date',
  'we are pleased to offer',
  'contingent upon',
];

/**
 * Keywords that suggest benefits documentation.
 */
const BENEFITS_DOC_KEYWORDS = [
  'fehb',
  'benefits guide',
  'health benefits',
  'dental benefits',
  'vision benefits',
  'life insurance',
  'fegli',
  'tsp',
  'thrift savings',
  'retirement benefits',
  'fers',
  'csrs',
  'leave balance',
  'annual leave',
  'sick leave',
];

/**
 * Keywords that suggest a pay stub.
 */
const PAY_STUB_KEYWORDS = [
  'pay stub',
  'pay statement',
  'earnings statement',
  'leave and earnings',
  'les',
  'gross pay',
  'net pay',
  'withholdings',
  'deductions',
  'pay period',
  'ppd',
];

/**
 * Keywords that suggest a tax document.
 */
const TAX_DOC_KEYWORDS = [
  'w-2',
  'w2',
  'tax form',
  'tax document',
  '1099',
  'wage and tax',
  'form w-',
  'irs form',
  'tax year',
  'employer identification',
  'ein:',
];

// ============================================================================
// FILENAME PATTERNS
// ============================================================================

/**
 * Filename patterns for quick classification.
 * These are checked first before content analysis.
 */
const FILENAME_PATTERNS: Array<{ pattern: RegExp; category: DocumentCategory }> = [
  { pattern: /resume/i, category: 'Resume' },
  { pattern: /cv[\s_-]/i, category: 'Resume' },
  { pattern: /curriculum[\s_-]?vitae/i, category: 'Resume' },
  { pattern: /offer[\s_-]?letter/i, category: 'OfferLetter' },
  { pattern: /tentative[\s_-]?offer/i, category: 'OfferLetter' },
  { pattern: /final[\s_-]?offer/i, category: 'OfferLetter' },
  { pattern: /job[\s_-]?posting/i, category: 'JobPosting' },
  { pattern: /vacancy/i, category: 'JobPosting' },
  { pattern: /announcement/i, category: 'JobPosting' },
  { pattern: /usajobs/i, category: 'JobPosting' },
  { pattern: /pay[\s_-]?stub/i, category: 'PayStub' },
  { pattern: /les[\s_-]/i, category: 'PayStub' },
  { pattern: /earnings[\s_-]?statement/i, category: 'PayStub' },
  { pattern: /w[\s_-]?2/i, category: 'TaxDoc' },
  { pattern: /1099/i, category: 'TaxDoc' },
  { pattern: /tax[\s_-]?form/i, category: 'TaxDoc' },
  { pattern: /fehb/i, category: 'BenefitsDoc' },
  { pattern: /benefits[\s_-]?guide/i, category: 'BenefitsDoc' },
];

// ============================================================================
// CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classifies a document based on filename and/or text content.
 *
 * HOW IT WORKS:
 * 1. First check filename against known patterns (quick win)
 * 2. If content provided, scan for keywords
 * 3. Count keyword matches per category
 * 4. Return category with most matches, or "Other" if no matches
 *
 * DESIGN DECISION:
 * We use simple string contains checks rather than regex for content.
 * This is fast and works well for v1. Future versions could use NLP.
 *
 * @param filename - Name of the file (can be empty for pasted text)
 * @param textContent - Text content to analyze (optional)
 * @returns ClassificationResult with category, sensitivity, and confidence
 */
export function classifyDocument(
  filename: string,
  textContent: string | null
): ClassificationResult {
  // Initialize result with defaults
  let category: DocumentCategory = 'Other';
  let sensitivity: SensitivityLabel = 'Unknown';
  let confidence = 0;
  const matchedKeywords: string[] = [];

  // Normalize inputs for case-insensitive matching
  const normalizedFilename = filename.toLowerCase().trim();
  const normalizedContent = textContent !== null ? textContent.toLowerCase() : '';

  // =========================================================================
  // STEP 1: CHECK FILENAME PATTERNS
  // =========================================================================

  // Quick classification from filename
  for (let i = 0; i < FILENAME_PATTERNS.length; i++) {
    const entry = FILENAME_PATTERNS[i];
    if (entry.pattern.test(normalizedFilename)) {
      category = entry.category;
      confidence = 0.7; // Filename match gives decent confidence
      matchedKeywords.push('filename:' + normalizedFilename);
      break;
    }
  }

  // =========================================================================
  // STEP 2: SCAN CONTENT FOR KEYWORDS
  // =========================================================================

  // Only analyze content if we have it
  if (normalizedContent !== '') {
    // Count keyword matches per category
    const categoryScores: Record<DocumentCategory, number> = {
      JobPosting: 0,
      Resume: 0,
      OfferLetter: 0,
      BenefitsDoc: 0,
      PayStub: 0,
      TaxDoc: 0,
      Other: 0,
    };

    // Helper to check keywords and update scores
    function checkKeywords(keywords: string[], cat: DocumentCategory): void {
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        if (normalizedContent.indexOf(keyword) !== -1) {
          categoryScores[cat] = categoryScores[cat] + 1;
          matchedKeywords.push(keyword);
        }
      }
    }

    // Check each category's keywords
    checkKeywords(JOB_POSTING_KEYWORDS, 'JobPosting');
    checkKeywords(RESUME_KEYWORDS, 'Resume');
    checkKeywords(OFFER_LETTER_KEYWORDS, 'OfferLetter');
    checkKeywords(BENEFITS_DOC_KEYWORDS, 'BenefitsDoc');
    checkKeywords(PAY_STUB_KEYWORDS, 'PayStub');
    checkKeywords(TAX_DOC_KEYWORDS, 'TaxDoc');

    // Find category with highest score
    let maxScore = 0;
    let maxCategory: DocumentCategory = 'Other';
    const categories: DocumentCategory[] = [
      'JobPosting',
      'Resume',
      'OfferLetter',
      'BenefitsDoc',
      'PayStub',
      'TaxDoc',
    ];

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      if (categoryScores[cat] > maxScore) {
        maxScore = categoryScores[cat];
        maxCategory = cat;
      }
    }

    // If content analysis found a category, use it (may override filename)
    if (maxScore > 0) {
      category = maxCategory;
      // Calculate confidence based on number of keyword matches
      // More matches = higher confidence, capped at 0.95
      const contentConfidence = Math.min(0.95, 0.4 + maxScore * 0.1);
      // If we also had a filename match, boost confidence
      if (confidence > 0) {
        confidence = Math.min(0.98, confidence + contentConfidence * 0.3);
      } else {
        confidence = contentConfidence;
      }
    }
  }

  // =========================================================================
  // STEP 3: ASSIGN SENSITIVITY LABEL
  // =========================================================================

  // Map category to default sensitivity
  // These are suggestions - users can override
  if (category === 'PayStub' || category === 'TaxDoc') {
    sensitivity = 'Sensitive';
  } else if (category === 'Resume' || category === 'OfferLetter' || category === 'BenefitsDoc') {
    sensitivity = 'Personal';
  } else if (category === 'JobPosting') {
    sensitivity = 'Public';
  } else {
    sensitivity = 'Unknown';
  }

  // If no matches at all, low confidence
  if (matchedKeywords.length === 0) {
    confidence = 0;
  }

  return {
    category: category,
    sensitivity: sensitivity,
    confidence: confidence,
    matchedKeywords: matchedKeywords,
  };
}

/**
 * Human-readable labels for document categories.
 */
export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  JobPosting: 'Job Posting',
  Resume: 'Resume',
  OfferLetter: 'Offer Letter',
  BenefitsDoc: 'Benefits Doc',
  PayStub: 'Pay Stub',
  TaxDoc: 'Tax Doc',
  Other: 'Other',
};

/**
 * Badge colors for document categories (Tailwind classes).
 */
export const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  JobPosting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Resume: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  OfferLetter: 'bg-green-500/20 text-green-400 border-green-500/30',
  BenefitsDoc: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PayStub: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  TaxDoc: 'bg-red-500/20 text-red-400 border-red-500/30',
  Other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

/**
 * Human-readable labels for sensitivity levels.
 */
export const SENSITIVITY_LABELS: Record<SensitivityLabel, string> = {
  Public: 'Public',
  Personal: 'Personal',
  Sensitive: 'Sensitive',
  Unknown: 'Unknown',
};

/**
 * Badge colors for sensitivity levels (Tailwind classes).
 */
export const SENSITIVITY_COLORS: Record<SensitivityLabel, string> = {
  Public: 'bg-green-500/20 text-green-400 border-green-500/30',
  Personal: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Sensitive: 'bg-red-500/20 text-red-400 border-red-500/30',
  Unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

/**
 * All available document categories for UI dropdowns.
 */
export const ALL_CATEGORIES: DocumentCategory[] = [
  'JobPosting',
  'Resume',
  'OfferLetter',
  'BenefitsDoc',
  'PayStub',
  'TaxDoc',
  'Other',
];

/**
 * All available sensitivity labels for UI dropdowns.
 */
export const ALL_SENSITIVITY_LABELS: SensitivityLabel[] = [
  'Public',
  'Personal',
  'Sensitive',
  'Unknown',
];
