/**
 * ============================================================================
 * RESUME PREVIEW PANE COMPONENT (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Right pane of the two-pane workspace. Renders selected view + selected version
 * in a print-like format but still responsive.
 * Shows coverage indicators (subtle) when tailoring mode active.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Part of Resume Builder workspace
 * - Reuses preview logic from ReviewExportStep
 * - Updates live as user edits in left pane
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

'use client';

import { FileText, FileCode } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SensitiveValue } from '@/components/sensitive-value';
import { useDashboardCardVisibility } from '@/components/dashboard/dashboard-card-visibility-toggle';
import type { ResumeData as PageResumeData } from '@/components/resume-builder/resume-types';
import type { ResumeView } from '@/lib/resume/resume-domain-model';

interface ResumePreviewPaneProps {
  resumeData: PageResumeData;
  activeView: ResumeView;
  isTailoringMode?: boolean;
  coverageMap?: {
    profile: number;
    workExperience: number;
    education: number;
    skills: number;
  };
}

/**
 * Resume Preview Pane Component
 *
 * PURPOSE:
 * Renders the live preview of the resume in the selected view format.
 * Shows USAJOBS or Traditional format based on view type.
 */
export function ResumePreviewPane(props: ResumePreviewPaneProps) {
  const resumeData = props.resumeData;
  const activeView = props.activeView;
  const isTailoringMode = props.isTailoringMode || false;
  const coverageMap = props.coverageMap;

  const { isSensitiveHidden } = useDashboardCardVisibility('resume.profile');
  const shouldMask = isSensitiveHidden;

  const { profile, targetRoles, workExperience, education, skills } = resumeData;

  const formatDate = function (dateStr: string) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return '';
    const year = parts[0];
    const month = parts[1];
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Determine format based on view type
  const isFederalFormat = activeView.type === 'federal';
  const showFormatToggle = activeView.type === 'federal' || activeView.type === 'full';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {showFormatToggle ? (
          <Tabs defaultValue={isFederalFormat ? 'usajobs' : 'traditional'}>
            {/* Day 38 Polish Fix: Add data attribute to prevent parent click handler from opening Focus View */}
            <TabsList className="mb-4" data-prevent-focus-view="true">
              <TabsTrigger value="usajobs" className="gap-2">
                <FileCode className="w-4 h-4" />
                USAJOBS Format
              </TabsTrigger>
              <TabsTrigger value="traditional" className="gap-2">
                <FileText className="w-4 h-4" />
                Traditional Resume
              </TabsTrigger>
            </TabsList>

            <TabsContent value="usajobs" className="mt-0">
              <div className="border rounded-lg p-6 bg-background space-y-6">
                {renderUSAJOBSPreview()}
              </div>
            </TabsContent>

            <TabsContent value="traditional" className="mt-0">
              <div className="border rounded-lg p-6 bg-background space-y-6">
                {renderTraditionalPreview()}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="border rounded-lg p-6 bg-background space-y-6">
            {renderTraditionalPreview()}
          </div>
        )}
      </div>
    </div>
  );

  function renderUSAJOBSPreview() {
    return (
      <>
        {/* Header */}
        {activeView.includedSections.profile && (
          <div className="text-center border-b pb-4">
            {shouldMask ? (
              <SensitiveValue
                value={`${profile.firstName} ${profile.lastName}`}
                hide={true}
                className="text-xl font-bold"
              />
            ) : (
              <h2 className="text-xl font-bold">
                {profile.firstName} {profile.lastName}
              </h2>
            )}
            {shouldMask ? (
              <SensitiveValue
                value={`${profile.city}, ${profile.state}`}
                hide={true}
                className="text-sm text-muted-foreground"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {profile.city}, {profile.state} | {profile.email} | {profile.phone}
              </p>
            )}
            <p className="text-sm mt-1">
              {profile.citizenship} | Veteran: {profile.veteranStatus} | Clearance:{' '}
              {profile.securityClearance}
            </p>
          </div>
        )}

        {/* Target Roles */}
        {activeView.includedSections.targetRoles && targetRoles.length > 0 && (
          <div>
            <h3 className="font-semibold text-accent mb-2 uppercase text-sm">Objective</h3>
            <p className="text-sm">
              Seeking position as {targetRoles.map((r) => r.title).join(' or ')} (
              {targetRoles.map((r) => `${r.gradeMin}-${r.gradeMax}`).join(', ')})
            </p>
          </div>
        )}

        {/* Work Experience */}
        {activeView.includedSections.workExperience && workExperience.length > 0 && (
          <div>
            <h3 className="font-semibold text-accent mb-3 uppercase text-sm">
              Work Experience
              {isTailoringMode && coverageMap && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({coverageMap.workExperience}% coverage)
                </span>
              )}
            </h3>
            {workExperience.map((exp) => (
              <div key={exp.id} className="mb-4 pb-4 border-b last:border-b-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-sm text-muted-foreground">{exp.employer}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      {formatDate(exp.startDate)} -{' '}
                      {exp.current ? 'Present' : formatDate(exp.endDate)}
                    </p>
                    <p className="text-muted-foreground">{exp.hoursPerWeek} hrs/week</p>
                  </div>
                </div>
                {activeView.formattingRules.showDuties && exp.duties && (
                  <div className="mt-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                      Duties:
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{exp.duties}</p>
                  </div>
                )}
                {activeView.formattingRules.showQuantifiedAccomplishments &&
                  exp.accomplishments && (
                    <div className="mt-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                        Accomplishments:
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{exp.accomplishments}</p>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {activeView.includedSections.education && education.length > 0 && (
          <div>
            <h3 className="font-semibold text-accent mb-3 uppercase text-sm">
              Education
              {isTailoringMode && coverageMap && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({coverageMap.education}% coverage)
                </span>
              )}
            </h3>
            {education.map((edu) => (
              <div key={edu.id} className="mb-3">
                <p className="font-medium">
                  {edu.degree} in {edu.field}
                </p>
                <p className="text-sm text-muted-foreground">
                  {edu.institution} | {formatDate(edu.graduationDate)}
                  {edu.gpa && ` | GPA: ${edu.gpa}`}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {activeView.includedSections.skills &&
          (skills.technicalSkills.length > 0 || skills.certifications.length > 0) && (
            <div>
              <h3 className="font-semibold text-accent mb-2 uppercase text-sm">
                Skills & Certifications
                {isTailoringMode && coverageMap && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({coverageMap.skills}% coverage)
                  </span>
                )}
              </h3>
              {skills.technicalSkills.length > 0 && (
                <p className="text-sm mb-1">
                  <span className="font-medium">Skills:</span>{' '}
                  {skills.technicalSkills.join(', ')}
                </p>
              )}
              {activeView.includedSections.certifications &&
                skills.certifications.length > 0 && (
                  <p className="text-sm mb-1">
                    <span className="font-medium">Certifications:</span>{' '}
                    {skills.certifications.join(', ')}
                  </p>
                )}
              {activeView.includedSections.languages && skills.languages.length > 0 && (
                <p className="text-sm">
                  <span className="font-medium">Languages:</span> {skills.languages.join(', ')}
                </p>
              )}
            </div>
          )}

        {/* KSAs */}
        {activeView.includedSections.ksas && skills.ksas && (
          <div>
            <h3 className="font-semibold text-accent mb-2 uppercase text-sm">
              Knowledge, Skills & Abilities
            </h3>
            <p className="text-sm whitespace-pre-wrap">{skills.ksas}</p>
          </div>
        )}
      </>
    );
  }

  function renderTraditionalPreview() {
    return (
      <>
        {/* Header */}
        {activeView.includedSections.profile && (
          <div className="text-center border-b pb-4">
            {shouldMask ? (
              <SensitiveValue
                value={`${profile.firstName} ${profile.lastName}`}
                hide={true}
                className="text-2xl font-bold"
              />
            ) : (
              <h2 className="text-2xl font-bold">
                {profile.firstName} {profile.lastName}
              </h2>
            )}
            {shouldMask ? (
              <SensitiveValue value="Contact info hidden" hide={true} className="text-sm" />
            ) : (
              <>
                <p className="text-sm">
                  {profile.address} | {profile.city}, {profile.state} {profile.zip}
                </p>
                <p className="text-sm">
                  {profile.email} | {profile.phone}
                </p>
              </>
            )}
          </div>
        )}

        {/* Work Experience */}
        {activeView.includedSections.workExperience && workExperience.length > 0 && (
          <div>
            <h3 className="font-bold border-b pb-1 mb-3">PROFESSIONAL EXPERIENCE</h3>
            {workExperience.map((exp) => (
              <div key={exp.id} className="mb-4">
                <div className="flex justify-between">
                  <p className="font-semibold">{exp.title}</p>
                  <p className="text-sm">
                    {formatDate(exp.startDate)} -{' '}
                    {exp.current ? 'Present' : formatDate(exp.endDate)}
                  </p>
                </div>
                <p className="text-sm italic">{exp.employer}</p>
                {exp.accomplishments && (
                  <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                    {exp.accomplishments
                      .split('\n')
                      .filter(Boolean)
                      .map((item, i) => (
                        <li key={i}>{item.replace(/^[-•]\s*/, '')}</li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {activeView.includedSections.education && education.length > 0 && (
          <div>
            <h3 className="font-bold border-b pb-1 mb-3">EDUCATION</h3>
            {education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <p className="font-semibold">
                  {edu.degree} in {edu.field}
                </p>
                <p className="text-sm">
                  {edu.institution}, {formatDate(edu.graduationDate)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {activeView.includedSections.skills && skills.technicalSkills.length > 0 && (
          <div>
            <h3 className="font-bold border-b pb-1 mb-3">SKILLS</h3>
            <p className="text-sm">{skills.technicalSkills.join(' • ')}</p>
          </div>
        )}
      </>
    );
  }
}

