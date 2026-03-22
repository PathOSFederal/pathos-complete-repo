/**
 * ============================================================================
 * PATHADVISOR SUGGESTED PROMPTS (Day 43)
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Source-scoped suggested prompts for PathAdvisor Focus Mode. When an anchor
 * exists, Focus Mode displays prompts relevant to the anchor's source type.
 * 
 * WHERE IT FITS IN ARCHITECTURE:
 * - Data Layer: Prompt definitions scoped by anchor source
 * - Used by: Focus Mode component (reads activeAnchor, displays scoped prompts)
 * - Purpose: Provides contextual prompt suggestions based on where user asked
 * 
 * KEY CONCEPTS:
 * - Source-scoped: Prompts are filtered by anchor.source (job, resume, benefits, etc.)
 * - No generic prompts: When anchor exists, only show source-relevant prompts
 * - Short and relevant: Prompts are concise and actionable
 * 
 * HOW IT WORKS (STEP BY STEP):
 * 1. Focus Mode reads activeAnchor from PathAdvisor store
 * 2. If activeAnchor exists, getScopedPrompts(anchor.source) is called
 * 3. Returns array of prompt strings for that source type
 * 4. Focus Mode displays prompts as clickable badges/buttons
 * 5. User clicks prompt → fills input → sends message
 * 
 * DAY 43 REQUIREMENT:
 * Suggested prompts MUST be scoped by anchor.source. No generic prompts
 * while anchor exists. If no anchor, Focus Mode shows neutral empty state.
 */

import type { PathAdvisorAnchorSource } from './anchors';

/**
 * Gets suggested prompts scoped by anchor source.
 * 
 * PURPOSE:
 * Returns an array of prompt strings relevant to the given anchor source.
 * Focus Mode displays these as suggested prompts when an anchor is active.
 * 
 * HOW IT WORKS:
 * 1. Takes anchor source as parameter
 * 2. Returns array of prompt strings for that source type
 * 3. Prompts are short, relevant, and actionable
 * 
 * EXAMPLES:
 * - getScopedPrompts('job') => ["Tell me about this position", "How competitive am I?", ...]
 * - getScopedPrompts('resume') => ["Review my resume", "Suggest improvements", ...]
 * 
 * @param source - The anchor source type to get prompts for
 * @returns Array of prompt strings for the source type
 */
export function getScopedPrompts(source: PathAdvisorAnchorSource): string[] {
  // Prompt arrays for each source type
  // Prompts are short, relevant, and actionable
  const promptsBySource: Record<PathAdvisorAnchorSource, string[]> = {
    job: [
      'Tell me about this position',
      'How competitive am I for this role?',
      'What should I emphasize in my application?',
      'Are there any gaps I should address?',
      'How does this compare to my current situation?',
    ],
    resume: [
      'Review my resume',
      'Suggest improvements',
      'Help me tailor this for a specific job',
      'What strengths should I highlight?',
      'Are there any red flags?',
    ],
    /**
     * Day 43: Resume Review mode specific prompts
     * 
     * These prompts are shown when the user is in the Resume Review modal.
     * They focus on quality, alignment, and USAJOBS compliance — not generic
     * resume editing questions.
     * 
     * GUIDANCE MODEL:
     * PathAdvisor provides guidance while the user edits, not auto-rewrites.
     * These prompts help users ask for specific feedback on their resume.
     */
    'resume-review': [
      'How does my resume align with federal standards?',
      'Are my accomplishments specific enough?',
      'What keywords am I missing for this series?',
      'Help me strengthen this bullet',
      'Is my experience described at the right level?',
      'What would make this section stronger?',
    ],
    benefits: [
      'Explain these benefits',
      'How do these compare to private sector?',
      'What should I prioritize?',
      'Help me understand the trade-offs',
      'What questions should I ask?',
    ],
    import: [
      'Help me organize this information',
      'What should I focus on?',
      'How does this fit into my profile?',
      'Suggest next steps',
    ],
    retirement: [
      'Explain my retirement outlook',
      'How does FERS pension work?',
      'Should I increase my TSP contribution?',
      'When can I retire with full benefits?',
      'What are my options?',
    ],
    dashboard: [
      'Help me understand my career outlook',
      'What should I focus on next?',
      'Suggest opportunities',
      'Review my profile',
    ],
  };

  // Return prompts for the given source, or empty array if source not found (safety)
  return promptsBySource[source] || [];
}
