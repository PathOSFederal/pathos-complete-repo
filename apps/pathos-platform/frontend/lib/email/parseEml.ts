/**
 * ============================================================================
 * EMAIL PARSING UTILITY (Day 21 - Email Ingestion Inbox v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides best-effort parsing of raw email text (.eml format) to extract
 * basic header fields and attachment metadata. Also provides deterministic
 * classification of emails into document categories.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │  UI (upload or  │ --> │   THIS FILE     │ --> │  Store / UI    │
 * │  paste email)   │     │  (parsing util) │     │  (display)     │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *
 * HOUSE RULES COMPLIANCE (Day 21):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 21 - Email Ingestion Inbox v1
 * ============================================================================
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Classification categories for ingested emails.
 * 
 * DESIGN RATIONALE:
 * These categories cover common federal employee document types.
 * 'Other' is the fallback for unrecognized content.
 */
export type EmailClassification =
  | 'PayStub'
  | 'RelocationOrders'
  | 'FEHB'
  | 'JobPosting'
  | 'Other';

/**
 * Represents an attachment detected in an email.
 * 
 * DESIGN RATIONALE:
 * In v1, we do best-effort extraction of attachment metadata.
 * Actual file contents are not extracted (would require MIME decoding).
 */
export interface EmailAttachment {
  /**
   * Filename from Content-Disposition header.
   * Example: "payslip.pdf", "orders.pdf"
   */
  filename: string;

  /**
   * MIME content type if available.
   * Example: "application/pdf", "image/png"
   */
  contentType: string | undefined;

  /**
   * Size in bytes if determinable (v1 may leave undefined).
   */
  sizeBytes: number | undefined;
}

/**
 * Result of parsing raw email text.
 * 
 * DESIGN RATIONALE:
 * All fields are optional/nullable because emails may be malformed
 * or missing headers. The UI should handle missing fields gracefully.
 */
export interface ParsedEmail {
  /**
   * From header value.
   * Example: "john.doe@agency.gov"
   */
  from: string;

  /**
   * To header value.
   * Example: "user@email.com"
   */
  to: string;

  /**
   * Subject header value.
   * Example: "Your Pay Statement for PP 24"
   */
  subject: string;

  /**
   * Date header value (as-is from email, not parsed).
   * Example: "Mon, 15 Dec 2025 10:30:00 -0500"
   */
  date: string;

  /**
   * Array of detected attachments.
   */
  attachments: EmailAttachment[];

  /**
   * Classified category based on content analysis.
   */
  classification: EmailClassification;
}

// ============================================================================
// HEADER PARSING
// ============================================================================

/**
 * Extracts a header value from raw email text.
 * 
 * HOW IT WORKS:
 * 1. Look for "HeaderName:" at start of line (case-insensitive)
 * 2. Capture everything after the colon until the next line break
 * 3. Trim whitespace
 * 
 * LIMITATIONS:
 * - Does not handle multi-line headers (folded headers)
 * - Does not decode MIME-encoded headers
 * 
 * @param raw - Raw email text
 * @param headerName - Header to extract (e.g., "From", "Subject")
 * @returns Header value or empty string if not found
 */
function extractHeader(raw: string, headerName: string): string {
  // Normalize line endings to \n for consistent parsing
  const normalizedRaw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Build regex to match header (case-insensitive)
  // Format: "HeaderName: value" at start of line
  const headerLower = headerName.toLowerCase();
  const lines = normalizedRaw.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    
    if (colonIndex === -1) {
      continue;
    }
    
    const lineHeaderName = line.substring(0, colonIndex).trim().toLowerCase();
    
    if (lineHeaderName === headerLower) {
      // Found the header, extract value after colon
      const value = line.substring(colonIndex + 1).trim();
      return value;
    }
  }
  
  return '';
}

// ============================================================================
// ATTACHMENT DETECTION
// ============================================================================

/**
 * Detects attachments from raw email text.
 * 
 * HOW IT WORKS:
 * 1. Look for "Content-Disposition: attachment" patterns
 * 2. Extract filename from "filename=" parameter
 * 3. Look for nearby Content-Type header
 * 
 * LIMITATIONS (v1):
 * - Does not parse MIME multipart boundaries properly
 * - May miss some attachments in complex emails
 * - Size is not extracted (would require counting base64 bytes)
 * 
 * @param raw - Raw email text
 * @returns Array of detected attachments
 */
function detectAttachments(raw: string): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  const normalizedRaw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Pattern to find Content-Disposition: attachment
  // and extract filename
  // Common formats:
  //   Content-Disposition: attachment; filename="file.pdf"
  //   Content-Disposition: attachment; filename=file.pdf
  const dispositionRegex = /Content-Disposition:\s*attachment[^]*?filename\s*=\s*"?([^"\n\r;]+)"?/gi;
  
  // Reset regex state
  dispositionRegex.lastIndex = 0;
  
  // Use exec to find all matches
  let match = dispositionRegex.exec(normalizedRaw);
  while (match !== null) {
    const filename = match[1].trim();
    
    if (filename !== '') {
      // Try to find Content-Type near this attachment
      // Look backwards from the match position for Content-Type
      const beforeMatch = normalizedRaw.substring(0, match.index);
      const lastBoundaryIndex = beforeMatch.lastIndexOf('--');
      let searchStart = 0;
      if (lastBoundaryIndex !== -1) {
        searchStart = lastBoundaryIndex;
      }
      
      const searchArea = normalizedRaw.substring(searchStart, match.index + match[0].length + 500);
      
      // Look for Content-Type header
      let contentType: string | undefined = undefined;
      const contentTypeMatch = searchArea.match(/Content-Type:\s*([^;\n\r]+)/i);
      if (contentTypeMatch !== null && contentTypeMatch.length > 1) {
        contentType = contentTypeMatch[1].trim();
      }
      
      attachments.push({
        filename: filename,
        contentType: contentType,
        sizeBytes: undefined, // v1: not calculating size
      });
    }
    
    match = dispositionRegex.exec(normalizedRaw);
  }
  
  return attachments;
}

// ============================================================================
// CLASSIFICATION
// ============================================================================

/**
 * Classification keyword sets.
 * 
 * DESIGN RATIONALE:
 * Simple keyword matching provides deterministic classification
 * without requiring ML models. Keywords are lowercase for comparison.
 */
const PAYSTUB_KEYWORDS = ['paystub', 'pay stub', 'earnings', 'les', 'w-2', 'w2', 'leave and earnings'];
const RELOCATION_KEYWORDS = ['pcs', 'orders', 'relocation', 'permanent change of station'];
const FEHB_KEYWORDS = ['fehb', 'plan brochure', 'health benefits', 'bcbs', 'blue cross'];
const JOB_POSTING_KEYWORDS = ['usajobs', 'vacancy', 'announcement', 'job posting', 'position opening', 'hiring'];

/**
 * Checks if text contains any keywords from the given list.
 * 
 * @param text - Text to search (should be lowercase)
 * @param keywords - Array of keywords to look for
 * @returns true if any keyword is found
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  for (let i = 0; i < keywords.length; i++) {
    if (text.indexOf(keywords[i]) !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * Classifies an email based on subject, body, and attachment filenames.
 * 
 * HOW IT WORKS:
 * 1. Combine subject + body text for searching
 * 2. Check attachment filenames
 * 3. Match against keyword sets in priority order
 * 4. Return 'Other' if no match
 * 
 * PRIORITY ORDER:
 * 1. PayStub (most common for federal employees)
 * 2. RelocationOrders (PCS orders are critical documents)
 * 3. FEHB (benefits-related)
 * 4. JobPosting (job announcements)
 * 5. Other (fallback)
 * 
 * @param subject - Email subject
 * @param body - Email body text
 * @param attachmentFilenames - Array of attachment filenames
 * @returns Classification category
 */
export function classifyEmail(
  subject: string,
  body: string,
  attachmentFilenames: string[]
): EmailClassification {
  // Combine all searchable text, lowercase for comparison
  let searchText = '';
  
  if (subject !== null && subject !== undefined) {
    searchText = searchText + subject.toLowerCase() + ' ';
  }
  
  if (body !== null && body !== undefined) {
    searchText = searchText + body.toLowerCase() + ' ';
  }
  
  // Add attachment filenames to search text
  for (let i = 0; i < attachmentFilenames.length; i++) {
    const fname = attachmentFilenames[i];
    if (fname !== null && fname !== undefined) {
      searchText = searchText + fname.toLowerCase() + ' ';
    }
  }
  
  // Check in priority order
  if (containsKeyword(searchText, PAYSTUB_KEYWORDS)) {
    return 'PayStub';
  }
  
  if (containsKeyword(searchText, RELOCATION_KEYWORDS)) {
    return 'RelocationOrders';
  }
  
  if (containsKeyword(searchText, FEHB_KEYWORDS)) {
    return 'FEHB';
  }
  
  if (containsKeyword(searchText, JOB_POSTING_KEYWORDS)) {
    return 'JobPosting';
  }
  
  return 'Other';
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

/**
 * Parses raw email text and extracts structured data.
 * 
 * HOW IT WORKS:
 * 1. Extract standard headers (From, To, Subject, Date)
 * 2. Detect attachments
 * 3. Classify the email
 * 4. Return structured ParsedEmail object
 * 
 * ERROR HANDLING:
 * - Returns empty strings for missing headers
 * - Returns empty array for no attachments
 * - Always returns a classification (defaults to 'Other')
 * 
 * @param raw - Raw email text (.eml format or similar)
 * @returns ParsedEmail with extracted data
 */
export function parseEmailText(raw: string): ParsedEmail {
  // Extract headers
  const from = extractHeader(raw, 'From');
  const to = extractHeader(raw, 'To');
  const subject = extractHeader(raw, 'Subject');
  const date = extractHeader(raw, 'Date');
  
  // Detect attachments
  const attachments = detectAttachments(raw);
  
  // Get attachment filenames for classification
  const attachmentFilenames: string[] = [];
  for (let i = 0; i < attachments.length; i++) {
    attachmentFilenames.push(attachments[i].filename);
  }
  
  // Classify the email
  // For body, we use everything after the headers (after first blank line)
  const normalizedRaw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const headerEndIndex = normalizedRaw.indexOf('\n\n');
  let body = '';
  if (headerEndIndex !== -1) {
    body = normalizedRaw.substring(headerEndIndex + 2);
  }
  
  const classification = classifyEmail(subject, body, attachmentFilenames);
  
  return {
    from: from,
    to: to,
    subject: subject,
    date: date,
    attachments: attachments,
    classification: classification,
  };
}

/**
 * Reads a .eml file and parses its contents.
 * 
 * HOW IT WORKS:
 * 1. Read file as text
 * 2. Pass to parseEmailText
 * 
 * @param file - File object from file input
 * @returns Promise resolving to ParsedEmail
 */
export async function parseEmlFile(file: File): Promise<ParsedEmail> {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    
    reader.onload = function (event) {
      const result = event.target;
      if (result === null || result === undefined) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      const text = result.result;
      if (typeof text !== 'string') {
        reject(new Error('File content is not text'));
        return;
      }
      
      const parsed = parseEmailText(text);
      resolve(parsed);
    };
    
    reader.onerror = function () {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}














