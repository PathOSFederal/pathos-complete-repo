/**
 * ============================================================================
 * RESUME EDITOR PANE COMPONENT (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Left pane of the two-pane workspace. Contains structured inputs with clear section headers.
 * Reuses existing step components (ProfileStep, WorkExperienceStep, etc.) in a unified editor view.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Part of Resume Builder workspace
 * - Integrates with existing step components
 * - Shows version switching and view switching controls
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileStep } from '@/components/resume-builder/profile-step';
import { TargetRolesStep } from '@/components/resume-builder/target-roles-step';
import { WorkExperienceStep } from '@/components/resume-builder/work-experience-step';
import { EducationStep } from '@/components/resume-builder/education-step';
import { SkillsStep } from '@/components/resume-builder/skills-step';
import type { ResumeData as PageResumeData } from '@/components/resume-builder/resume-types';
import type { ResumeVersion, ResumeView } from '@/lib/resume/resume-domain-model';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ResumeEditorPaneProps {
  resumeData: PageResumeData;
  versions: ResumeVersion[];
  activeVersionId: string;
  views: ResumeView[];
  activeViewId: string;
  onUpdateProfile: (data: PageResumeData['profile']) => void;
  onUpdateTargetRoles: (data: PageResumeData['targetRoles']) => void;
  onUpdateWorkExperience: (data: PageResumeData['workExperience']) => void;
  onUpdateEducation: (data: PageResumeData['education']) => void;
  onUpdateSkills: (data: PageResumeData['skills']) => void;
  onSelectVersion: (versionId: string) => void;
  onCreateVersion: () => void;
  onRenameVersion: (versionId: string, newName: string) => void;
  onDuplicateVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onSelectView: (viewId: string) => void;
  onTypingActivity: () => void; // Callback to track typing activity for Guidance Strip
  suggestions?: Array<{ id: string; status: string }>; // Optional: Inline suggestions for tailoring mode
  onAcceptSuggestion?: (suggestionId: string) => void; // Optional: Accept suggestion callback
  onRejectSuggestion?: (suggestionId: string) => void; // Optional: Reject suggestion callback
}

/**
 * Resume Editor Pane Component
 *
 * PURPOSE:
 * Renders the left editor pane with structured inputs organized by sections.
 * Includes version cards and view switching at the top.
 */
export function ResumeEditorPane(props: ResumeEditorPaneProps) {
  const resumeData = props.resumeData;
  const views = props.views;
  const activeViewId = props.activeViewId;
  const onUpdateProfile = props.onUpdateProfile;
  const onUpdateTargetRoles = props.onUpdateTargetRoles;
  const onUpdateWorkExperience = props.onUpdateWorkExperience;
  const onUpdateEducation = props.onUpdateEducation;
  const onUpdateSkills = props.onUpdateSkills;
  const onSelectView = props.onSelectView;

  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Day 38 Continuation: Version Cards removed - now shown in workspace header as chip/button and managed via Resume Library modal */}
      
      {/* View Selector */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">View</label>
        <Select value={activeViewId} onValueChange={onSelectView}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {views.map(function (view) {
              return (
                <SelectItem key={view.id} value={view.id}>
                  {view.label} - {view.description}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Editor Sections */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="target-roles">Target Roles</TabsTrigger>
            <TabsTrigger value="work-experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <ProfileStep data={resumeData.profile} onChange={onUpdateProfile} />
          </TabsContent>

          <TabsContent value="target-roles" className="mt-4">
            <TargetRolesStep
              data={resumeData.targetRoles}
              onChange={onUpdateTargetRoles}
            />
          </TabsContent>

          <TabsContent value="work-experience" className="mt-4">
            <WorkExperienceStep
              data={resumeData.workExperience}
              onChange={onUpdateWorkExperience}
            />
          </TabsContent>

          <TabsContent value="education" className="mt-4">
            <EducationStep data={resumeData.education} onChange={onUpdateEducation} />
          </TabsContent>

          <TabsContent value="skills" className="mt-4">
            <SkillsStep data={resumeData.skills} onChange={onUpdateSkills} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

