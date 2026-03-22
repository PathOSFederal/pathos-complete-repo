'use client';

import { Plus, X, Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import type { ResumeData } from '@/components/resume-builder/resume-types';

interface WorkExperienceStepProps {
  data: ResumeData['workExperience'];
  onChange: (data: ResumeData['workExperience']) => void;
}

export function WorkExperienceStep({ data, onChange }: WorkExperienceStepProps) {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('resume.experience');
  const shouldMask = visible && isSensitiveHidden;
  const addExperience = () => {
    const newExp = {
      id: crypto.randomUUID(),
      employer: '',
      title: '',
      series: '',
      grade: '',
      startDate: '',
      endDate: '',
      current: false,
      hoursPerWeek: '40',
      salary: '',
      supervisorName: '',
      supervisorPhone: '',
      duties: '',
      accomplishments: '',
    };
    onChange([...data, newExp]);
  };

  const updateExperience = (id: string, field: string, value: string | boolean) => {
    onChange(data.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)));
  };

  const removeExperience = (id: string) => {
    onChange(data.filter((exp) => exp.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" />
                Work Experience
              </CardTitle>
              <CardDescription>
                List your federal and non-federal work history. Include detailed duties and
                accomplishments using the STAR method.
              </CardDescription>
            </div>
            <DashboardCardVisibilityToggle cardKey="resume.experience" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!visible ? (
            <CardHiddenPlaceholder title="Work Experience" cardKey="resume.experience" />
          ) : data.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No work experience added yet</p>
              <Button onClick={addExperience} variant="outline" className="gap-2 bg-transparent">
                <Plus className="w-4 h-4" />
                Add Work Experience
              </Button>
            </div>
          ) : (
            <>
              {data.map((exp, index) => (
                <div key={exp.id} className="relative p-4 border rounded-lg bg-muted/30">
                  {!shouldMask && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExperience(exp.id)}
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mb-4">
                    Position {index + 1}
                  </p>
                  <div className="grid gap-4">
                    {/* Employer and Title */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Employer / Agency</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.employer || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={exp.employer}
                            onChange={(e) => updateExperience(exp.id, 'employer', e.target.value)}
                            placeholder="Department of Defense"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.title || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={exp.title}
                            onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                            placeholder="Program Analyst"
                          />
                        )}
                      </div>
                    </div>

                    {/* Series/Grade for federal positions */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Series (if federal)</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.series || 'N/A'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={exp.series}
                            onChange={(e) => updateExperience(exp.id, 'series', e.target.value)}
                            placeholder="0343"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Grade (if federal)</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.grade || 'N/A'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Select
                            value={exp.grade}
                            onValueChange={(value) => updateExperience(exp.id, 'grade', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Grade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="N/A">N/A</SelectItem>
                              {Array.from({ length: 15 }, (_, i) => i + 1).map((grade) => (
                                <SelectItem key={grade} value={`GS-${grade}`}>
                                  GS-{grade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Hours/Week</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.hoursPerWeek || '40'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={exp.hoursPerWeek}
                            onChange={(e) => updateExperience(exp.id, 'hoursPerWeek', e.target.value)}
                            placeholder="40"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Salary (optional)</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.salary || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={exp.salary}
                            onChange={(e) => updateExperience(exp.id, 'salary', e.target.value)}
                            placeholder="$75,000"
                          />
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.startDate || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            type="month"
                            value={exp.startDate}
                            onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.current ? 'Present' : (exp.endDate || 'Not entered')}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            type="month"
                            value={exp.endDate}
                            onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                            disabled={exp.current}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 pb-2">
                        {!shouldMask && (
                          <>
                            <Checkbox
                              id={`current-${exp.id}`}
                              checked={exp.current}
                              onCheckedChange={(checked) =>
                                updateExperience(exp.id, 'current', !!checked)
                              }
                            />
                            <Label htmlFor={`current-${exp.id}`} className="text-sm font-normal">
                              Currently employed here
                            </Label>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Supervisor info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Supervisor Name (optional)</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.supervisorName || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={exp.supervisorName}
                            onChange={(e) =>
                              updateExperience(exp.id, 'supervisorName', e.target.value)
                            }
                            placeholder="Jane Smith"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Supervisor Phone (optional)</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={exp.supervisorPhone || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={exp.supervisorPhone}
                            onChange={(e) =>
                              updateExperience(exp.id, 'supervisorPhone', e.target.value)
                            }
                            placeholder="(555) 123-4567"
                          />
                        )}
                      </div>
                    </div>

                    {/* Duties */}
                    <div className="space-y-2">
                      <Label>Duties & Responsibilities</Label>
                      {shouldMask ? (
                        <div className="min-h-[100px] p-3 border rounded-md bg-muted/20">
                          <SensitiveValue
                            value={exp.duties || 'Not entered'}
                            hide={true}
                          />
                        </div>
                      ) : (
                        <Textarea
                          value={exp.duties}
                          onChange={(e) => updateExperience(exp.id, 'duties', e.target.value)}
                          placeholder="Describe your day-to-day duties and responsibilities..."
                          className="min-h-[100px]"
                        />
                      )}
                    </div>

                    {/* Accomplishments */}
                    <div className="space-y-2">
                      <Label>Key Accomplishments</Label>
                      <p className="text-xs text-muted-foreground">
                        Use the STAR method: Situation, Task, Action, Result. Include metrics when
                        possible.
                      </p>
                      {shouldMask ? (
                        <div className="min-h-[120px] p-3 border rounded-md bg-muted/20">
                          <SensitiveValue
                            value={exp.accomplishments || 'Not entered'}
                            hide={true}
                          />
                        </div>
                      ) : (
                        <Textarea
                          value={exp.accomplishments}
                          onChange={(e) =>
                            updateExperience(exp.id, 'accomplishments', e.target.value)
                          }
                          placeholder="- Reduced processing time by 30% by implementing..."
                          className="min-h-[120px]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!shouldMask && (
                <Button onClick={addExperience} variant="outline" className="gap-2 bg-transparent">
                  <Plus className="w-4 h-4" />
                  Add Another Position
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
