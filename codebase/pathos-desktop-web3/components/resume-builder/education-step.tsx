'use client';

import { Plus, X, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import type { ResumeData } from '@/components/resume-builder/resume-types';

interface EducationStepProps {
  data: ResumeData['education'];
  onChange: (data: ResumeData['education']) => void;
}

const DEGREE_TYPES = [
  'High School Diploma',
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctoral Degree',
  'Professional Degree (JD, MD, etc.)',
  'Certificate',
  'Some College (No Degree)',
];

export function EducationStep({ data, onChange }: EducationStepProps) {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('resume.education');
  const shouldMask = visible && isSensitiveHidden;

  const addEducation = () => {
    const newEdu = {
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      field: '',
      graduationDate: '',
      gpa: '',
      credits: '',
    };
    onChange([...data, newEdu]);
  };

  const updateEducation = (id: string, field: string, value: string) => {
    onChange(data.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)));
  };

  const removeEducation = (id: string) => {
    onChange(data.filter((edu) => edu.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-accent" />
                Education
              </CardTitle>
              <CardDescription>
                List your educational background, including any federal training programs or
                certifications.
              </CardDescription>
            </div>
            <DashboardCardVisibilityToggle cardKey="resume.education" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!visible ? (
            <CardHiddenPlaceholder title="Education" cardKey="resume.education" />
          ) : data.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No education added yet</p>
              <Button onClick={addEducation} variant="outline" className="gap-2 bg-transparent">
                <Plus className="w-4 h-4" />
                Add Education
              </Button>
            </div>
          ) : (
            <>
              {data.map((edu, index) => (
                <div key={edu.id} className="relative p-4 border rounded-lg bg-muted/30">
                  {!shouldMask && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEducation(edu.id)}
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mb-4">
                    Education {index + 1}
                  </p>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Institution Name</Label>
                      {shouldMask ? (
                        <SensitiveValue
                          value={edu.institution || 'Not entered'}
                          hide={true}
                          className="h-9 flex items-center"
                        />
                      ) : (
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                          placeholder="University of Maryland"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Degree Type</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={edu.degree || 'Not selected'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Select
                            value={edu.degree}
                            onValueChange={(value) => updateEducation(edu.id, 'degree', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select degree" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEGREE_TYPES.map((degree) => (
                                <SelectItem key={degree} value={degree}>
                                  {degree}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Field of Study</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={edu.field || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={edu.field}
                            onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                            placeholder="Public Administration"
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Graduation Date</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={edu.graduationDate || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            type="month"
                            value={edu.graduationDate}
                            onChange={(e) =>
                              updateEducation(edu.id, 'graduationDate', e.target.value)
                            }
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>GPA (optional)</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={edu.gpa || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={edu.gpa}
                            onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                            placeholder="3.5"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Credit Hours (optional)</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={edu.credits || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={edu.credits}
                            onChange={(e) => updateEducation(edu.id, 'credits', e.target.value)}
                            placeholder="120"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!shouldMask && (
                <Button onClick={addEducation} variant="outline" className="gap-2 bg-transparent">
                  <Plus className="w-4 h-4" />
                  Add Another Education
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
