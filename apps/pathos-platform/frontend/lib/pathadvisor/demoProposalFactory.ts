/**
 * ============================================================================
 * DEMO PROPOSAL FACTORY (Day 43 - Resume Review Workspace)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Generates realistic, SAFE placeholder proposals for demonstration and
 * scaffolding purposes. Used when the Resume Review workspace needs to
 * show example proposals before AI integration is complete.
 *
 * ============================================================================
 * WHY THIS EXISTS
 * ============================================================================
 *
 * The Resume Review workspace needs to demonstrate the guidance model UX
 * before full AI integration. Demo proposals:
 *
 * 1. Show users what the review experience will look like
 * 2. Validate the ChangeProposalCard UI with realistic content
 * 3. Enable testing of Apply/Dismiss/Copy workflows
 * 4. Provide scaffolding for iterative development
 *
 * ============================================================================
 * CONTENT SAFETY RULES (CRITICAL)
 * ============================================================================
 *
 * ABSOLUTELY NO DEV/DEBUG TEXT.
 *
 * All demo content must:
 * - Use realistic federal resume language
 * - Reference real USAJOBS/OPM guidance
 * - Use actual GS-level expectations
 * - Be appropriate for production display
 *
 * BAD: "This is a test proposal for debugging"
 * GOOD: "Federal resumes require quantified accomplishments with scope..."
 *
 * ============================================================================
 * INTEGRATION WITH RESUME DATA
 * ============================================================================
 *
 * When resume data is provided, the factory:
 * - Uses actual resume bullet/summary text as "before"
 * - Generates improved versions as "after"
 * - References the user's actual content for relevance
 *
 * When no resume data is provided:
 * - Falls back to generic but realistic examples
 * - Uses common federal resume improvement patterns
 *
 * @version Day 43 - Guidance Model + Resume Review Workspace
 */

import type { PathAdvisorChangeProposal } from './changeProposals';
import { createProposal } from './changeProposals';

/**
 * Resume content interface for demo proposal generation.
 *
 * PURPOSE:
 * Allows the factory to generate proposals based on actual user resume content.
 * When provided, proposals will reference the user's own text.
 */
export interface ResumeContentForDemo {
  /** Work experience entries with accomplishments */
  workExperience?: Array<{
    id: string;
    title: string;
    employer: string;
    accomplishments?: string;
  }>;
  /** Summary/objective text */
  summary?: string;
  /** KSAs text */
  ksas?: string;
}

/**
 * Options for demo proposal generation.
 */
export interface DemoProposalOptions {
  /** The anchor ID to associate proposals with */
  anchorId: string;
  /** Optional resume content to base proposals on */
  resumeContent?: ResumeContentForDemo;
  /** Number of proposals to generate (default: 2) */
  count?: number;
}

/**
 * Generic improvement patterns for federal resumes.
 *
 * PURPOSE:
 * Provides realistic before/after examples based on common federal resume
 * improvement patterns. These are used when no specific resume content
 * is provided.
 *
 * CONTENT:
 * All content references real USAJOBS guidance and federal resume best practices:
 * - Quantifying accomplishments
 * - Adding scope/authority indicators
 * - Including outcome metrics
 * - Using action verbs appropriate for GS level
 */
const GENERIC_IMPROVEMENT_PATTERNS = [
  {
    targetType: 'resume-bullet' as const,
    beforeText: 'Managed team projects and coordinated with stakeholders',
    afterText: 'Led 8-member cross-functional team on 12 concurrent projects valued at $2.4M, coordinating with 15+ stakeholder groups across 4 agencies to deliver 95% on-time completion rate',
    whyText: 'Federal resumes require quantified accomplishments showing scope, scale, and measurable outcomes. The original bullet lacks specificity about team size, project value, and results.',
    mapsTo: [
      { label: 'USAJOBS: Quantify accomplishments with specific numbers', source: 'usajobs' as const },
      { label: 'GS-13+: Demonstrate scope of responsibility and independent authority', source: 'gs-norm' as const },
    ],
  },
  {
    targetType: 'resume-bullet' as const,
    beforeText: 'Analyzed data and prepared reports for leadership',
    afterText: 'Conducted comprehensive data analysis of 50,000+ records using advanced Excel and Tableau, preparing 24 executive briefings that informed $15M budget allocation decisions and policy recommendations adopted agency-wide',
    whyText: 'Senior-level federal positions require evidence of impact on decisions. The original lacks volume indicators, tools used, and connection to organizational outcomes.',
    mapsTo: [
      { label: 'USAJOBS: Show tools and methods used in analysis', source: 'usajobs' as const },
      { label: 'OPM: Demonstrate impact on organizational decisions', source: 'opm' as const },
    ],
  },
  {
    targetType: 'resume-bullet' as const,
    beforeText: 'Developed training programs for new employees',
    afterText: 'Designed and delivered comprehensive onboarding program for 120+ new employees annually, reducing time-to-productivity by 30% and improving first-year retention from 72% to 89% over 2 fiscal years',
    whyText: 'Federal hiring officials look for program development with measurable outcomes. The original does not show scale of impact or concrete results.',
    mapsTo: [
      { label: 'USAJOBS: Demonstrate program development and results', source: 'usajobs' as const },
      { label: 'GS-12+: Show initiative in improving organizational processes', source: 'gs-norm' as const },
    ],
  },
  {
    targetType: 'resume-bullet' as const,
    beforeText: 'Handled customer service inquiries and resolved issues',
    afterText: 'Resolved 150+ complex citizen inquiries monthly with 98% first-contact resolution rate, developing 5 process improvements that reduced average resolution time from 72 to 24 hours',
    whyText: 'Federal customer service roles require demonstrated efficiency and process improvement. The original lacks volume, success metrics, and evidence of initiative.',
    mapsTo: [
      { label: 'USAJOBS: Include volume of work handled', source: 'usajobs' as const },
      { label: 'OPM: Customer service competency requires measurable outcomes', source: 'opm' as const },
    ],
  },
  {
    targetType: 'resume-summary' as const,
    beforeText: 'Experienced professional seeking a federal position to apply my skills',
    afterText: 'Results-driven policy analyst with 8+ years of federal experience at GS-13 level, specializing in program evaluation and regulatory analysis. Proven track record of developing data-driven recommendations that saved $3.2M across 3 programs. Seeking to leverage expertise in quantitative analysis and cross-agency collaboration for GS-14 Program Manager position.',
    whyText: 'Federal resume summaries must immediately communicate grade level, area of expertise, quantified achievements, and clear alignment with the target position.',
    mapsTo: [
      { label: 'USAJOBS: Summary must align with position requirements', source: 'usajobs' as const },
      { label: 'GS-14: Demonstrate readiness for increased scope', source: 'gs-norm' as const },
    ],
  },
];

/**
 * Extracts potential improvement targets from resume content.
 *
 * PURPOSE:
 * Analyzes provided resume content to find bullets or sections that would
 * benefit from federal resume improvements.
 *
 * @param content - Resume content to analyze
 * @returns Array of improvement targets with original text
 */
function extractImprovementTargets(
  content: ResumeContentForDemo
): Array<{
  targetType: 'resume-bullet' | 'resume-summary' | 'ksa';
  targetId?: string;
  beforeText: string;
  context?: string;
}> {
  const targets: Array<{
    targetType: 'resume-bullet' | 'resume-summary' | 'ksa';
    targetId?: string;
    beforeText: string;
    context?: string;
  }> = [];

  // Extract from work experience accomplishments
  if (content.workExperience && content.workExperience.length > 0) {
    for (let i = 0; i < content.workExperience.length; i++) {
      const exp = content.workExperience[i];
      if (exp.accomplishments) {
        // Split accomplishments into individual bullets
        const bullets = exp.accomplishments.split('\n').filter(function (b) {
          return b.trim().length > 0;
        });

        for (let j = 0; j < bullets.length && j < 2; j++) {
          // Limit to 2 bullets per position
          const bullet = bullets[j].replace(/^[-•]\s*/, '').trim();
          if (bullet.length > 10) {
            // Only consider substantive bullets
            targets.push({
              targetType: 'resume-bullet',
              targetId: `${exp.id}-bullet-${j}`,
              beforeText: bullet,
              context: `${exp.title} at ${exp.employer}`,
            });
          }
        }
      }
    }
  }

  // Extract from summary
  if (content.summary && content.summary.trim().length > 10) {
    targets.push({
      targetType: 'resume-summary',
      targetId: 'summary',
      beforeText: content.summary.trim(),
    });
  }

  // Extract from KSAs
  if (content.ksas && content.ksas.trim().length > 10) {
    targets.push({
      targetType: 'ksa',
      targetId: 'ksas',
      beforeText: content.ksas.trim().substring(0, 200), // Limit length
    });
  }

  return targets;
}

/**
 * Generates an improved version of a resume bullet.
 *
 * PURPOSE:
 * Creates a more federal-ready version of the provided bullet by:
 * - Adding quantification where possible
 * - Including scope indicators
 * - Adding outcome statements
 *
 * NOTE:
 * This is a simplified demonstration function. In production, this would
 * be handled by AI with proper context about the user's actual experience.
 *
 * @param originalBullet - The original bullet text
 * @param context - Optional context (position title, employer)
 * @returns Improved bullet text
 */
function generateImprovedBullet(originalBullet: string, context?: string): string {
  void context;
  // For demo purposes, enhance the bullet with typical federal improvements
  // In production, this would use AI with user's actual context

  // If bullet is already well-quantified (contains numbers), make smaller enhancements
  const hasNumbers = /\d+/.test(originalBullet);

  if (hasNumbers) {
    // Already has some quantification, add outcome language
    return `${originalBullet}, resulting in improved operational efficiency and stakeholder satisfaction`;
  }

  // Bullet lacks quantification - add typical federal enhancements
  const enhancements = [
    'managing 10+ concurrent initiatives',
    'coordinating with 5+ stakeholder groups',
    'achieving 95% on-time delivery',
    'saving $500K annually',
    'improving efficiency by 25%',
  ];

  // Pick a random enhancement for variety
  const enhancement = enhancements[Math.floor(Math.random() * enhancements.length)];

  // Build improved bullet
  return `${originalBullet}, ${enhancement} through systematic process improvements and cross-functional collaboration`;
}

/**
 * Generates demo proposals for the Resume Review workspace.
 *
 * PURPOSE:
 * Creates realistic placeholder proposals that demonstrate the guidance model.
 * Uses actual resume content when provided, falls back to generic examples otherwise.
 *
 * USAGE:
 * ```typescript
 * const proposals = generateDemoProposals({
 *   anchorId: 'anchor-123-resume',
 *   resumeContent: {
 *     workExperience: [...],
 *     summary: '...',
 *   },
 *   count: 2,
 * });
 * ```
 *
 * @param options - Generation options including anchorId and optional resume content
 * @returns Array of PathAdvisorChangeProposal
 */
export function generateDemoProposals(
  options: DemoProposalOptions
): PathAdvisorChangeProposal[] {
  const anchorId = options.anchorId;
  const resumeContent = options.resumeContent;
  const count = options.count || 2;

  const proposals: PathAdvisorChangeProposal[] = [];

  // Try to generate from actual resume content first
  if (resumeContent) {
    const targets = extractImprovementTargets(resumeContent);

    for (let i = 0; i < targets.length && proposals.length < count; i++) {
      const target = targets[i];

      // Generate improved version based on target type
      let afterText = '';
      let whyText = '';
      const mapsTo: Array<{ label: string; source: 'usajobs' | 'opm' | 'gs-norm' | 'job' | 'other' }> = [];

      if (target.targetType === 'resume-bullet') {
        afterText = generateImprovedBullet(target.beforeText, target.context);
        whyText = 'Federal resumes require quantified accomplishments that demonstrate scope, impact, and measurable outcomes. This revision adds specificity to strengthen your application.';
        mapsTo.push({ label: 'USAJOBS: Quantify accomplishments with specific metrics', source: 'usajobs' });
        mapsTo.push({ label: 'GS-12+: Demonstrate scope and independent authority', source: 'gs-norm' });
      } else if (target.targetType === 'resume-summary') {
        afterText = `Results-driven professional with demonstrated expertise in ${target.beforeText.substring(0, 50)}... Proven track record of delivering measurable outcomes and driving organizational improvements.`;
        whyText = 'Federal resume summaries must immediately communicate your value proposition, relevant experience level, and alignment with position requirements.';
        mapsTo.push({ label: 'USAJOBS: Summary must align with announcement', source: 'usajobs' });
      } else if (target.targetType === 'ksa') {
        afterText = `Demonstrated expertise through: ${target.beforeText}. Applied these competencies to achieve specific organizational outcomes including process improvements and cost savings.`;
        whyText = 'KSA statements must connect knowledge to demonstrated application and measurable outcomes, not just list competencies.';
        mapsTo.push({ label: 'OPM: KSAs must show application, not just possession', source: 'opm' });
      }

      proposals.push(
        createProposal({
          anchorId: anchorId,
          targetType: target.targetType,
          targetId: target.targetId,
          beforeText: target.beforeText,
          afterText: afterText,
          whyText: whyText,
          mapsTo: mapsTo,
        })
      );
    }
  }

  // Fill remaining slots with generic patterns if needed
  let patternIndex = 0;
  while (proposals.length < count && patternIndex < GENERIC_IMPROVEMENT_PATTERNS.length) {
    const pattern = GENERIC_IMPROVEMENT_PATTERNS[patternIndex];

    proposals.push(
      createProposal({
        anchorId: anchorId,
        targetType: pattern.targetType,
        beforeText: pattern.beforeText,
        afterText: pattern.afterText,
        whyText: pattern.whyText,
        mapsTo: pattern.mapsTo,
      })
    );

    patternIndex++;
  }

  return proposals.slice(0, count);
}

/**
 * Generates a single demo proposal for a specific bullet.
 *
 * PURPOSE:
 * Creates one proposal for a specific piece of resume content.
 * Useful for targeted suggestions rather than batch generation.
 *
 * @param anchorId - The anchor ID to associate the proposal with
 * @param bulletText - The original bullet text to improve
 * @param context - Optional context (position title, etc.)
 * @returns A single PathAdvisorChangeProposal
 */
export function generateSingleDemoProposal(
  anchorId: string,
  bulletText: string,
  _context?: string
): PathAdvisorChangeProposal {
  return createProposal({
    anchorId: anchorId,
    targetType: 'resume-bullet',
    beforeText: bulletText,
    afterText: generateImprovedBullet(bulletText, _context),
    whyText: 'Federal resumes require quantified accomplishments that demonstrate scope, impact, and measurable outcomes. This revision adds specificity about scale and results to strengthen your application.',
    mapsTo: [
      { label: 'USAJOBS: Quantify accomplishments with specific metrics', source: 'usajobs' },
      { label: 'GS-12+: Demonstrate scope and independent authority', source: 'gs-norm' },
    ],
  });
}
