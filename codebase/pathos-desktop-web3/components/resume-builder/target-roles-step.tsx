'use client';
import { Plus, X, Target } from 'lucide-react';
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

interface TargetRolesStepProps {
  data: ResumeData['targetRoles'];
  onChange: (data: ResumeData['targetRoles']) => void;
}

const COMMON_SERIES = [
  { value: '0201', label: '0201 - Human Resources' },
  { value: '0301', label: '0301 - Miscellaneous Admin' },
  { value: '0343', label: '0343 - Management Analyst' },
  { value: '0510', label: '0510 - Accounting' },
  { value: '0560', label: '0560 - Budget Analyst' },
  { value: '1102', label: '1102 - Contracting' },
  { value: '2210', label: '2210 - IT Specialist' },
];

export function TargetRolesStep({ data, onChange }: TargetRolesStepProps) {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('resume.targetRoles');
  const shouldMask = visible && isSensitiveHidden;

  const addRole = () => {
    const newRole = {
      id: crypto.randomUUID(),
      title: '',
      series: '',
      gradeMin: '',
      gradeMax: '',
      location: '',
    };
    onChange([...data, newRole]);
  };

  const updateRole = (id: string, field: string, value: string) => {
    onChange(data.map((role) => (role.id === id ? { ...role, [field]: value } : role)));
  };

  const removeRole = (id: string) => {
    onChange(data.filter((role) => role.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Target Roles
              </CardTitle>
              <CardDescription>
                Add the positions you&apos;re targeting for your next move. PathAdvisor will use this to
                tailor resume suggestions and match you with job announcements.
              </CardDescription>
            </div>
            <DashboardCardVisibilityToggle cardKey="resume.targetRoles" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!visible ? (
            <CardHiddenPlaceholder title="Target Roles" cardKey="resume.targetRoles" />
          ) : data.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No target roles added yet</p>
              <Button onClick={addRole} variant="outline" className="gap-2 bg-transparent">
                <Plus className="w-4 h-4" />
                Add Target Role
              </Button>
            </div>
          ) : (
            <>
              {data.map((role, index) => (
                <div key={role.id} className="relative p-4 border rounded-lg bg-muted/30">
                  {!shouldMask && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRole(role.id)}
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mb-4">
                    Target Role {index + 1}
                  </p>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Position Title</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={role.title || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={role.title}
                            onChange={(e) => updateRole(role.id, 'title', e.target.value)}
                            placeholder="Management Analyst"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Occupational Series</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={role.series || 'Not selected'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Select
                            value={role.series}
                            onValueChange={(value) => updateRole(role.id, 'series', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select series" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_SERIES.map((series) => (
                                <SelectItem key={series.value} value={series.value}>
                                  {series.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Min Grade</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={role.gradeMin || 'Not selected'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Select
                            value={role.gradeMin}
                            onValueChange={(value) => updateRole(role.id, 'gradeMin', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="GS-?" />
                            </SelectTrigger>
                            <SelectContent>
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
                        <Label>Max Grade</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={role.gradeMax || 'Not selected'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Select
                            value={role.gradeMax}
                            onValueChange={(value) => updateRole(role.id, 'gradeMax', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="GS-?" />
                            </SelectTrigger>
                            <SelectContent>
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
                        <Label>Preferred Location</Label>
                        {shouldMask ? (
                          <SensitiveValue
                            value={role.location || 'Not entered'}
                            hide={true}
                            className="h-9 flex items-center"
                          />
                        ) : (
                          <Input
                            value={role.location}
                            onChange={(e) => updateRole(role.id, 'location', e.target.value)}
                            placeholder="Washington, DC"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!shouldMask && (
                <Button onClick={addRole} variant="outline" className="gap-2 bg-transparent">
                  <Plus className="w-4 h-4" />
                  Add Another Role
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
