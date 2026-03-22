/**
 * ============================================================================
 * SKILLS STEP COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component renders the Skills step of the Resume Builder wizard.
 * It includes four sub-sections: Technical Skills, Certifications & Licenses,
 * Languages, and KSAs (Knowledge, Skills, and Abilities).
 *
 * DEEP-LINK SUPPORT (Day 14):
 * Each section has a `data-resume-section` attribute that enables deep-linking
 * from the Career page. When a user clicks "Fix now" for certifications, the
 * ResumeBuilderFocusHandler reads the resumeFocus query param and scrolls to
 * the certifications card with a highlight effect.
 *
 * @see components/resume-builder/resume-builder-focus-handler.tsx
 *
 * CODE STYLE NOTES:
 * - Uses function declarations instead of arrow functions (codebase convention)
 * - Avoids spread operators in hot paths (builds new objects/arrays explicitly)
 * - All buttons have type="button" to prevent form submission
 *
 * @version Day 14 - ResumeFocus Deep-Link Scroll + Highlight Bugfix
 */

'use client';

import React, { useState } from 'react';
import { Plus, X, Wrench, Award, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import type { ResumeData } from '@/components/resume-builder/resume-types';

interface SkillsStepProps {
  data: ResumeData['skills'];
  onChange: (data: ResumeData['skills']) => void;
}

export function SkillsStep(props: SkillsStepProps) {
  const data = props.data;
  const onChange = props.onChange;

  // Visibility hook for privacy mode support
  const visibility = useDashboardCardVisibility('resume.skills');
  const visible = visibility.visible;
  const isSensitiveHidden = visibility.isSensitiveHidden;
  const shouldMask = visible && isSensitiveHidden;

  // Local state for input fields
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const [newLang, setNewLang] = useState('');

  /**
   * addSkill: Add a new technical skill to the list.
   *
   * WHY NO SPREAD:
   * We build a new array explicitly to avoid spread operators that may
   * not be supported in all target runtimes.
   */
  const addSkill = function () {
    if (newSkill.trim()) {
      // Build new technicalSkills array without spread
      const newTechnicalSkills: string[] = [];
      for (let i = 0; i < data.technicalSkills.length; i++) {
        newTechnicalSkills.push(data.technicalSkills[i]);
      }
      newTechnicalSkills.push(newSkill.trim());

      // Build new data object without spread
      const newData: ResumeData['skills'] = {
        technicalSkills: newTechnicalSkills,
        certifications: data.certifications,
        languages: data.languages,
        ksas: data.ksas,
      };
      onChange(newData);
      setNewSkill('');
    }
  };

  /**
   * removeSkill: Remove a technical skill at the given index.
   */
  const removeSkill = function (index: number) {
    const newTechnicalSkills: string[] = [];
    for (let i = 0; i < data.technicalSkills.length; i++) {
      if (i !== index) {
        newTechnicalSkills.push(data.technicalSkills[i]);
      }
    }

    const newData: ResumeData['skills'] = {
      technicalSkills: newTechnicalSkills,
      certifications: data.certifications,
      languages: data.languages,
      ksas: data.ksas,
    };
    onChange(newData);
  };

  /**
   * addCert: Add a new certification to the list.
   */
  const addCert = function () {
    if (newCert.trim()) {
      const newCertifications: string[] = [];
      for (let i = 0; i < data.certifications.length; i++) {
        newCertifications.push(data.certifications[i]);
      }
      newCertifications.push(newCert.trim());

      const newData: ResumeData['skills'] = {
        technicalSkills: data.technicalSkills,
        certifications: newCertifications,
        languages: data.languages,
        ksas: data.ksas,
      };
      onChange(newData);
      setNewCert('');
    }
  };

  /**
   * removeCert: Remove a certification at the given index.
   */
  const removeCert = function (index: number) {
    const newCertifications: string[] = [];
    for (let i = 0; i < data.certifications.length; i++) {
      if (i !== index) {
        newCertifications.push(data.certifications[i]);
      }
    }

    const newData: ResumeData['skills'] = {
      technicalSkills: data.technicalSkills,
      certifications: newCertifications,
      languages: data.languages,
      ksas: data.ksas,
    };
    onChange(newData);
  };

  /**
   * addLang: Add a new language to the list.
   */
  const addLang = function () {
    if (newLang.trim()) {
      const newLanguages: string[] = [];
      for (let i = 0; i < data.languages.length; i++) {
        newLanguages.push(data.languages[i]);
      }
      newLanguages.push(newLang.trim());

      const newData: ResumeData['skills'] = {
        technicalSkills: data.technicalSkills,
        certifications: data.certifications,
        languages: newLanguages,
        ksas: data.ksas,
      };
      onChange(newData);
      setNewLang('');
    }
  };

  /**
   * removeLang: Remove a language at the given index.
   */
  const removeLang = function (index: number) {
    const newLanguages: string[] = [];
    for (let i = 0; i < data.languages.length; i++) {
      if (i !== index) {
        newLanguages.push(data.languages[i]);
      }
    }

    const newData: ResumeData['skills'] = {
      technicalSkills: data.technicalSkills,
      certifications: data.certifications,
      languages: newLanguages,
      ksas: data.ksas,
    };
    onChange(newData);
  };

  /**
   * handleKsasChange: Update the KSAs text field.
   */
  const handleKsasChange = function (newKsas: string) {
    const newData: ResumeData['skills'] = {
      technicalSkills: data.technicalSkills,
      certifications: data.certifications,
      languages: data.languages,
      ksas: newKsas,
    };
    onChange(newData);
  };

  /**
   * handleSkillInputChange: Handler for the skill input field.
   */
  const handleSkillInputChange = function (e: React.ChangeEvent<HTMLInputElement>) {
    setNewSkill(e.target.value);
  };

  /**
   * handleSkillKeyDown: Handler for Enter key in skill input.
   */
  const handleSkillKeyDown = function (e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      addSkill();
    }
  };

  /**
   * handleCertInputChange: Handler for the certification input field.
   */
  const handleCertInputChange = function (e: React.ChangeEvent<HTMLInputElement>) {
    setNewCert(e.target.value);
  };

  /**
   * handleCertKeyDown: Handler for Enter key in certification input.
   */
  const handleCertKeyDown = function (e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      addCert();
    }
  };

  /**
   * handleLangInputChange: Handler for the language input field.
   */
  const handleLangInputChange = function (e: React.ChangeEvent<HTMLInputElement>) {
    setNewLang(e.target.value);
  };

  /**
   * handleLangKeyDown: Handler for Enter key in language input.
   */
  const handleLangKeyDown = function (e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      addLang();
    }
  };

  /**
   * handleTextareaChange: Handler for KSAs textarea.
   */
  const handleTextareaChange = function (e: React.ChangeEvent<HTMLTextAreaElement>) {
    handleKsasChange(e.target.value);
  };

  /**
   * renderSkillBadges: Renders the list of technical skill badges.
   * Uses explicit for loop instead of map with arrow function.
   */
  const renderSkillBadges = function () {
    const badges: React.ReactNode[] = [];
    for (let i = 0; i < data.technicalSkills.length; i++) {
      const skill = data.technicalSkills[i];
      const index = i;
      badges.push(
        <Badge key={index} variant="secondary" className="gap-1 pr-1">
          {shouldMask ? (
            <SensitiveValue value={skill} hide={true} />
          ) : (
            <>
              {skill}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={function () {
                  removeSkill(index);
                }}
                className="h-4 w-4 hover:bg-transparent hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
        </Badge>
      );
    }
    return badges;
  };

  /**
   * renderCertBadges: Renders the list of certification badges.
   * Uses explicit for loop instead of map with arrow function.
   */
  const renderCertBadges = function () {
    const badges: React.ReactNode[] = [];
    for (let i = 0; i < data.certifications.length; i++) {
      const cert = data.certifications[i];
      const index = i;
      badges.push(
        <Badge key={index} variant="secondary" className="gap-1 pr-1">
          {shouldMask ? (
            <SensitiveValue value={cert} hide={true} />
          ) : (
            <>
              {cert}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={function () {
                  removeCert(index);
                }}
                className="h-4 w-4 hover:bg-transparent hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
        </Badge>
      );
    }
    return badges;
  };

  /**
   * renderLangBadges: Renders the list of language badges.
   * Uses explicit for loop instead of map with arrow function.
   */
  const renderLangBadges = function () {
    const badges: React.ReactNode[] = [];
    for (let i = 0; i < data.languages.length; i++) {
      const lang = data.languages[i];
      const index = i;
      badges.push(
        <Badge key={index} variant="secondary" className="gap-1 pr-1">
          {shouldMask ? (
            <SensitiveValue value={lang} hide={true} />
          ) : (
            <>
              {lang}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={function () {
                  removeLang(index);
                }}
                className="h-4 w-4 hover:bg-transparent hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
        </Badge>
      );
    }
    return badges;
  };

  return (
    <div className="space-y-6">
      {/* ================================================================
          TECHNICAL SKILLS SECTION
          ================================================================
          The data-resume-section attribute enables deep-linking from the
          Career page. When resumeFocus=skills is passed, the focus handler
          will scroll to this element and highlight it briefly.
          
          @see components/resume-builder/resume-builder-focus-handler.tsx
      ================================================================ */}
      <Card data-resume-section="skills">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-accent" />
                Technical Skills
              </CardTitle>
              <CardDescription>
                Add software, tools, and technical competencies relevant to your target roles.
              </CardDescription>
            </div>
            <DashboardCardVisibilityToggle cardKey="resume.skills" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!visible ? (
            <CardHiddenPlaceholder title="Technical Skills" cardKey="resume.skills" />
          ) : (
            <>
              {!shouldMask && (
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={handleSkillInputChange}
                    placeholder="e.g., Microsoft Excel, SQL, SharePoint"
                    onKeyDown={handleSkillKeyDown}
                  />
                  <Button type="button" onClick={addSkill} variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {renderSkillBadges()}
                {data.technicalSkills.length === 0 && shouldMask && (
                  <span className="text-sm text-muted-foreground">No skills added yet</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          CERTIFICATIONS SECTION
          ================================================================
          The data-resume-section attribute enables deep-linking from the
          Career page. When resumeFocus=certifications is passed, the focus
          handler will scroll to this element and highlight it briefly.
          
          @see components/resume-builder/resume-builder-focus-handler.tsx
      ================================================================ */}
      <Card data-resume-section="certifications">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" />
                Certifications & Licenses
              </CardTitle>
              <CardDescription>
                Include professional certifications, licenses, and federal training completions.
              </CardDescription>
            </div>
            {/* Shares visibility with skills card */}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!visible ? (
            <CardHiddenPlaceholder title="Certifications & Licenses" cardKey="resume.skills" />
          ) : (
            <>
              {!shouldMask && (
                <div className="flex gap-2">
                  <Input
                    value={newCert}
                    onChange={handleCertInputChange}
                    placeholder="e.g., PMP, FAC-C Level II, Security+"
                    onKeyDown={handleCertKeyDown}
                  />
                  <Button type="button" onClick={addCert} variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {renderCertBadges()}
                {data.certifications.length === 0 && shouldMask && (
                  <span className="text-sm text-muted-foreground">No certifications added yet</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          LANGUAGES SECTION
          ================================================================
          The data-resume-section attribute enables deep-linking from the
          Career page. When resumeFocus=languages is passed, the focus
          handler will scroll to this element and highlight it briefly.
          
          @see components/resume-builder/resume-builder-focus-handler.tsx
      ================================================================ */}
      <Card data-resume-section="languages">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-accent" />
                Languages
              </CardTitle>
              <CardDescription>
                List languages you speak, including proficiency level (e.g., &quot;Spanish, Fluent&quot;).
              </CardDescription>
            </div>
            {/* Shares visibility with skills card */}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!visible ? (
            <CardHiddenPlaceholder title="Languages" cardKey="resume.skills" />
          ) : (
            <>
              {!shouldMask && (
                <div className="flex gap-2">
                  <Input
                    value={newLang}
                    onChange={handleLangInputChange}
                    placeholder="e.g., Spanish, Professional Working Proficiency"
                    onKeyDown={handleLangKeyDown}
                  />
                  <Button type="button" onClick={addLang} variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {renderLangBadges()}
                {data.languages.length === 0 && shouldMask && (
                  <span className="text-sm text-muted-foreground">No languages added yet</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          KSAs SECTION (Knowledge, Skills, and Abilities)
          ================================================================
          The data-resume-section attribute enables deep-linking from the
          Career page. When resumeFocus=ksas is passed, the focus handler
          will scroll to this element and highlight it briefly.
          
          @see components/resume-builder/resume-builder-focus-handler.tsx
      ================================================================ */}
      <Card data-resume-section="ksas">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Knowledge, Skills & Abilities (KSAs)</CardTitle>
              <CardDescription>
                Describe your core competencies. PathAdvisor can help you structure these for specific
                job announcements.
              </CardDescription>
            </div>
            {/* Shares visibility with skills card */}
          </div>
        </CardHeader>
        <CardContent>
          {!visible ? (
            <CardHiddenPlaceholder title="KSAs" cardKey="resume.skills" />
          ) : shouldMask ? (
            <div className="min-h-[200px] p-3 border rounded-md bg-muted/20">
              <SensitiveValue
                value={data.ksas || 'Not entered'}
                hide={true}
              />
            </div>
          ) : (
            <Textarea
              value={data.ksas}
              onChange={handleTextareaChange}
              placeholder="Describe your core knowledge, skills, and abilities. Use specific examples to demonstrate each competency..."
              className="min-h-[200px]"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
