'use client';

import { useState } from 'react';
import { Download, Copy, Shield, FileText, FileCode, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SensitiveValue } from '@/components/sensitive-value';
import { useDashboardCardVisibility } from '@/components/dashboard/dashboard-card-visibility-toggle';
import type { ResumeData } from '@/components/resume-builder/resume-types';
import {
  ResumeStrengthPanel,
  type ResumeStrengthData,
} from '@/components/resume-builder/resume-strength-panel';
import { useTailoringWorkspaceStore } from '@/store/tailoringWorkspaceStore';
import { AskPathAdvisorButton } from '@/components/pathadvisor/AskPathAdvisorButton';

/**
 * Job context information for PathAdvisor requests.
 * Used to pre-seed PathAdvisor with job details when opening from Export modal.
 */
interface JobContext {
  title?: string;
  agency?: string;
  grade?: string;
}

interface ReviewExportStepProps {
  resumeData: ResumeData;
  resumeStrength: ResumeStrengthData;
  /**
   * Optional callback to open PathAdvisor within the workspace.
   * If provided, this will be called when "Ask PathAdvisor" button is clicked.
   * If not provided, falls back to using the workspace store.
   */
  onAskPathAdvisor?: (() => void) | null;
  /**
   * Optional job context for PathAdvisor requests.
   * Used when onAskPathAdvisor is not provided, to open PathAdvisor with job context.
   */
  jobContext?: JobContext | null;
}

export function ReviewExportStep({
  resumeData,
  resumeStrength,
  onAskPathAdvisor,
  jobContext,
}: ReviewExportStepProps) {
  // Use global privacy system
  const { isSensitiveHidden } = useDashboardCardVisibility('resume.profile');
  const shouldMask = isSensitiveHidden;
  const { profile, targetRoles, workExperience, education, skills } = resumeData;
  
  // Day 38 Polish Fix: Get store function for fallback PathAdvisor opening
  const requestOpenWorkspacePathAdvisor = useTailoringWorkspaceStore(function (state) {
    return state.requestOpenWorkspacePathAdvisor;
  });
  
  /**
   * Handle "Ask PathAdvisor" button click.
   * 
   * HOW IT WORKS:
   * 1. If onAskPathAdvisor callback is provided, call it (workspace will handle closing modal and opening PathAdvisor)
   * 2. Otherwise, fall back to using the workspace store to request PathAdvisor opening
   * 3. If jobContext is available, pass it to the store for pre-seeding the prompt
   */
  const handleAskPathAdvisor = function () {
    if (onAskPathAdvisor) {
      // Callback provided - workspace will handle closing modal and opening PathAdvisor
      onAskPathAdvisor();
    } else {
      // Fallback: use workspace store to request PathAdvisor opening
      if (jobContext) {
        // Pass job context to pre-seed PathAdvisor prompt
        requestOpenWorkspacePathAdvisor({
          jobTitle: jobContext.title,
          agency: jobContext.agency,
          grade: jobContext.grade,
        });
      } else {
        // No job context, just request opening
        requestOpenWorkspacePathAdvisor();
      }
    }
  };

  // Export preview modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const formatDate = function (dateStr: string) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return '';
    const year = parts[0];
    const month = parts[1];
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleDownload = function () {
    // Placeholder: In real implementation, this would generate and download a DOCX file
    console.log('Downloading resume as DOCX...');
    alert(
      'Resume download started. (This is a placeholder - actual DOCX generation would be implemented here)',
    );
  };

  const handleCopyForUSAJOBS = function () {
    // Placeholder: In real implementation, this would copy formatted sections to clipboard
    console.log('Copying resume sections for USAJOBS...');
    alert(
      'Resume sections copied to clipboard. (This is a placeholder - actual clipboard functionality would be implemented here)',
    );
  };

  const handleExportPreview = function () {
    setIsExportModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Resume Preview - Left Side (3 columns) */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Resume Preview</CardTitle>
            <CardDescription>
              Review your resume before exporting. Switch between USAJOBS and traditional formats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="usajobs">
              <TabsList className="mb-4">
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
                <div className="border rounded-lg p-6 bg-background max-h-[600px] overflow-y-auto space-y-6">
                  {/* Header */}
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

                  {/* Target Roles */}
                  {targetRoles.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-accent mb-2 uppercase text-sm">
                        Objective
                      </h3>
                      <p className="text-sm">
                        Seeking position as {targetRoles.map((r) => r.title).join(' or ')} (
                        {targetRoles.map((r) => `${r.gradeMin}-${r.gradeMax}`).join(', ')})
                      </p>
                    </div>
                  )}

                  {/* Work Experience - USAJOBS format */}
                  {workExperience.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-accent mb-3 uppercase text-sm">
                        Work Experience
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
                              {exp.salary && (
                                <p className="text-muted-foreground">{exp.salary}/year</p>
                              )}
                            </div>
                          </div>
                          {(exp.series || exp.grade) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Series: {exp.series || 'N/A'} | Grade: {exp.grade || 'N/A'}
                            </p>
                          )}
                          {exp.duties && (
                            <div className="mt-2">
                              <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                                Duties:
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{exp.duties}</p>
                            </div>
                          )}
                          {exp.accomplishments && (
                            <div className="mt-2">
                              <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                                Accomplishments:
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{exp.accomplishments}</p>
                            </div>
                          )}
                          {exp.supervisorName && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Supervisor: {exp.supervisorName}{' '}
                              {exp.supervisorPhone && `| ${exp.supervisorPhone}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Education */}
                  {education.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-accent mb-3 uppercase text-sm">
                        Education
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
                  {(skills.technicalSkills.length > 0 || skills.certifications.length > 0) && (
                    <div>
                      <h3 className="font-semibold text-accent mb-2 uppercase text-sm">
                        Skills & Certifications
                      </h3>
                      {skills.technicalSkills.length > 0 && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Skills:</span>{' '}
                          {skills.technicalSkills.join(', ')}
                        </p>
                      )}
                      {skills.certifications.length > 0 && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Certifications:</span>{' '}
                          {skills.certifications.join(', ')}
                        </p>
                      )}
                      {skills.languages.length > 0 && (
                        <p className="text-sm">
                          <span className="font-medium">Languages:</span>{' '}
                          {skills.languages.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* KSAs */}
                  {skills.ksas && (
                    <div>
                      <h3 className="font-semibold text-accent mb-2 uppercase text-sm">
                        Knowledge, Skills & Abilities
                      </h3>
                      <p className="text-sm whitespace-pre-wrap">{skills.ksas}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="traditional" className="mt-0">
                <div className="border rounded-lg p-6 bg-background max-h-[600px] overflow-y-auto space-y-6">
                  {/* Header - Traditional format */}
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
                      <p className="text-sm">
                        {profile.address} | {profile.city}, {profile.state} {profile.zip}
                      </p>
                    )}
                    {!shouldMask && (
                      <p className="text-sm">
                        {profile.email} | {profile.phone}
                      </p>
                    )}
                  </div>

                  {/* Work Experience - Traditional format */}
                  {workExperience.length > 0 && (
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

                  {/* Education - Traditional format */}
                  {education.length > 0 && (
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

                  {/* Skills - Traditional format */}
                  {skills.technicalSkills.length > 0 && (
                    <div>
                      <h3 className="font-bold border-b pb-1 mb-3">SKILLS</h3>
                      <p className="text-sm">{skills.technicalSkills.join(' • ')}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Alignment to Target Role</CardTitle>
          </CardHeader>
          <CardContent>
            <ResumeStrengthPanel
              data={resumeStrength}
              compact={true}
              title="Target Role Match"
              description=""
            />
            <p className="text-xs text-muted-foreground mt-3">
              {resumeStrength.score >= 80
                ? 'Your resume is well-aligned with your target roles. Consider adding more quantified accomplishments to stand out.'
                : resumeStrength.score >= 50
                  ? 'Your resume is developing. Add more details to work experience and ensure you have measurable accomplishments.'
                  : 'Complete more sections to improve alignment. Focus on adding target roles and detailed work experience.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions - Right Side (2 columns) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Export Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Export Options</CardTitle>
            <CardDescription>Preview and export your resume for USAJOBS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleExportPreview} className="w-full gap-2">
              <Eye className="w-4 h-4" />
              Export resume (preview)
            </Button>
            <Button onClick={handleDownload} variant="outline" className="w-full gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Download DOCX Resume
            </Button>
            <Button
              onClick={handleCopyForUSAJOBS}
              variant="outline"
              className="w-full gap-2 bg-transparent"
            >
              <Copy className="w-4 h-4" />
              Copy Resume Sections for USAJOBS
            </Button>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              Privacy Note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              PathOS stores your data locally in this browser and does not send it to a server. Your
              data is used solely to build your resume and is not shared externally.
            </p>
          </CardContent>
        </Card>

        {/* PathAdvisor Tips */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">PathAdvisor Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p className="text-muted-foreground">Before exporting, review your resume for:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Complete work history with hours/week</li>
                <li>Quantified accomplishments</li>
                <li>Keywords matching your target roles</li>
                <li>Accurate education and certifications</li>
              </ul>
            </div>
            {/* Day 39: Use standardized AskPathAdvisorButton component */}
            <AskPathAdvisorButton onClick={handleAskPathAdvisor} className="text-sm" />
          </CardContent>
        </Card>
      </div>

      {/* Export Preview Modal */}
      {/* Day 38 Polish: Fixed width to max-w-6xl for better preview visibility */}
      {/* Day 38 Polish: Explicitly override sm:max-w-lg with sm:max-w-6xl to ensure wide dialog */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Resume Export Preview
            </DialogTitle>
            <DialogDescription>
              This is a preview of your structured resume content. In a future update, PathOS will
              generate a DOCX or PDF file from this data for direct submission to USAJOBS.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4">
            <div className="mx-auto w-full max-w-[900px] border rounded-lg p-6 bg-background space-y-6">
            {/* Contact/Profile Section */}
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold text-center mb-2">
                {profile.firstName} {profile.lastName}
              </h2>
              <div className="text-sm text-center text-muted-foreground space-y-1">
                <p>
                  {profile.address && profile.address + ', '}
                  {profile.city}, {profile.state} {profile.zip}
                </p>
                <p>
                  {profile.email} | {profile.phone}
                </p>
                <p>
                  Citizenship: {profile.citizenship} | Veteran Status: {profile.veteranStatus} |
                  Clearance: {profile.securityClearance}
                </p>
              </div>
            </div>

            {/* Target Roles Section */}
            {targetRoles.length > 0 && (
              <div>
                <h3 className="font-semibold text-accent uppercase text-sm mb-2 border-b pb-1">
                  Objective / Target Positions
                </h3>
                <ul className="text-sm space-y-1">
                  {targetRoles.map(function (role) {
                    return (
                      <li key={role.id}>
                        {role.title} ({role.series}, {role.gradeMin}-{role.gradeMax}) -{' '}
                        {role.location}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Work Experience Section */}
            {workExperience.length > 0 && (
              <div>
                <h3 className="font-semibold text-accent uppercase text-sm mb-3 border-b pb-1">
                  Work Experience
                </h3>
                {workExperience.map(function (exp) {
                  return (
                    <div key={exp.id} className="mb-4 pb-4 border-b last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{exp.title}</p>
                          <p className="text-sm text-muted-foreground">{exp.employer}</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>
                            {formatDate(exp.startDate)} -{' '}
                            {exp.current ? 'Present' : formatDate(exp.endDate)}
                          </p>
                          <p>{exp.hoursPerWeek} hours/week</p>
                        </div>
                      </div>
                      {(exp.series || exp.grade) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Series: {exp.series || 'N/A'} | Grade: {exp.grade || 'N/A'}
                        </p>
                      )}
                      {exp.duties && (
                        <div className="mt-2">
                          <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                            Duties:
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{exp.duties}</p>
                        </div>
                      )}
                      {exp.accomplishments && (
                        <div className="mt-2">
                          <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                            Accomplishments:
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{exp.accomplishments}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Education Section */}
            {education.length > 0 && (
              <div>
                <h3 className="font-semibold text-accent uppercase text-sm mb-3 border-b pb-1">
                  Education
                </h3>
                {education.map(function (edu) {
                  return (
                    <div key={edu.id} className="mb-2">
                      <p className="font-medium">
                        {edu.degree} in {edu.field}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {edu.institution} | {formatDate(edu.graduationDate)}
                        {edu.gpa && ' | GPA: ' + edu.gpa}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Skills Section */}
            {(skills.technicalSkills.length > 0 ||
              skills.certifications.length > 0 ||
              skills.languages.length > 0) && (
              <div>
                <h3 className="font-semibold text-accent uppercase text-sm mb-2 border-b pb-1">
                  Skills & Certifications
                </h3>
                {skills.technicalSkills.length > 0 && (
                  <p className="text-sm mb-1">
                    <span className="font-medium">Technical Skills:</span>{' '}
                    {skills.technicalSkills.join(', ')}
                  </p>
                )}
                {skills.certifications.length > 0 && (
                  <p className="text-sm mb-1">
                    <span className="font-medium">Certifications:</span>{' '}
                    {skills.certifications.join(', ')}
                  </p>
                )}
                {skills.languages.length > 0 && (
                  <p className="text-sm">
                    <span className="font-medium">Languages:</span> {skills.languages.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* KSAs Section */}
            {skills.ksas && (
              <div>
                <h3 className="font-semibold text-accent uppercase text-sm mb-2 border-b pb-1">
                  Knowledge, Skills & Abilities (KSAs)
                </h3>
                <p className="text-sm whitespace-pre-wrap">{skills.ksas}</p>
              </div>
            )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <p className="text-xs text-muted-foreground">
              File generation coming soon in a future PathOS update.
            </p>
            <Button
              variant="outline"
              onClick={function () {
                setIsExportModalOpen(false);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
