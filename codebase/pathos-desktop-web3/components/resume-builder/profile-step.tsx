'use client';

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
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import type { ResumeData } from '@/components/resume-builder/resume-types';

interface ProfileStepProps {
  data: ResumeData['profile'];
  onChange: (data: ResumeData['profile']) => void;
}

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
];

export function ProfileStep({ data, onChange }: ProfileStepProps) {
  const profileVisibility = useDashboardCardVisibility('resume.profile');
  const federalEligibilityVisibility = useDashboardCardVisibility('resume.federalEligibility');
  const currentPositionVisibility = useDashboardCardVisibility('resume.currentPosition');

  const updateField = <K extends keyof ResumeData['profile']>(
    field: K,
    value: ResumeData['profile'][K],
  ) => {
    onChange({ ...data, [field]: value });
  };

  // Determine if we should mask values (global privacy is on) or hide the card entirely
  const shouldMaskProfile = profileVisibility.visible && profileVisibility.isSensitiveHidden;
  const shouldMaskCurrentPosition = currentPositionVisibility.visible && currentPositionVisibility.isSensitiveHidden;

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>
                Your contact details for federal job applications. This information will appear at
                the top of your resume.
              </CardDescription>
            </div>
            <DashboardCardVisibilityToggle cardKey="resume.profile" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profileVisibility.visible ? (
            <CardHiddenPlaceholder title="Contact Information" cardKey="resume.profile" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  {shouldMaskProfile ? (
                    <SensitiveValue
                      value={data.firstName || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Input
                      id="firstName"
                      value={data.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="John"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  {shouldMaskProfile ? (
                    <SensitiveValue
                      value={data.lastName || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Input
                      id="lastName"
                      value={data.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="Doe"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  {shouldMaskProfile ? (
                    <SensitiveValue
                      value={data.email || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Input
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="john.doe@email.com"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {shouldMaskProfile ? (
                    <SensitiveValue
                      value={data.phone || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Input
                      id="phone"
                      type="tel"
                      value={data.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                {shouldMaskProfile ? (
                  <SensitiveValue
                    value={data.address || 'Not entered'}
                    hide={true}
                    className="h-9 flex items-center"
                  />
                ) : (
                  <Input
                    id="address"
                    value={data.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  {shouldMaskProfile ? (
                    <SensitiveValue
                      value={data.city || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Input
                      id="city"
                      value={data.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Washington"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  {shouldMaskProfile ? (
                    <SensitiveValue
                      value={data.state || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Select value={data.state} onValueChange={(value) => updateField('state', value)}>
                      <SelectTrigger id="state" className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  {shouldMaskProfile ? (
                    <SensitiveValue
                      value={data.zip || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Input
                      id="zip"
                      value={data.zip}
                      onChange={(e) => updateField('zip', e.target.value)}
                      placeholder="20001"
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Federal Eligibility */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Federal Eligibility</CardTitle>
              <CardDescription>Required information for federal job applications.</CardDescription>
            </div>
            <DashboardCardVisibilityToggle cardKey="resume.federalEligibility" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!federalEligibilityVisibility.visible ? (
            <CardHiddenPlaceholder title="Federal Eligibility" cardKey="resume.federalEligibility" />
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="citizenship">Citizenship Status</Label>
                {federalEligibilityVisibility.isSensitiveHidden ? (
                  <SensitiveValue
                    value={data.citizenship || 'Not selected'}
                    hide={true}
                    className="h-9 flex items-center"
                  />
                ) : (
                  <Select
                    value={data.citizenship}
                    onValueChange={(value) => updateField('citizenship', value)}
                  >
                    <SelectTrigger id="citizenship" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US Citizen">US Citizen</SelectItem>
                      <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="veteranStatus">Veteran Status</Label>
                {federalEligibilityVisibility.isSensitiveHidden ? (
                  <SensitiveValue
                    value={data.veteranStatus || 'Not selected'}
                    hide={true}
                    className="h-9 flex items-center"
                  />
                ) : (
                  <Select
                    value={data.veteranStatus}
                    onValueChange={(value) => updateField('veteranStatus', value)}
                  >
                    <SelectTrigger id="veteranStatus" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Yes - Preference Eligible">
                        Yes - Preference Eligible
                      </SelectItem>
                      <SelectItem value="Yes - Not Preference Eligible">
                        Yes - Not Preference Eligible
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="securityClearance">Security Clearance</Label>
                {federalEligibilityVisibility.isSensitiveHidden ? (
                  <SensitiveValue
                    value={data.securityClearance || 'Not selected'}
                    hide={true}
                    className="h-9 flex items-center"
                  />
                ) : (
                  <Select
                    value={data.securityClearance}
                    onValueChange={(value) => updateField('securityClearance', value)}
                  >
                    <SelectTrigger id="securityClearance" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Public Trust">Public Trust</SelectItem>
                      <SelectItem value="Secret">Secret</SelectItem>
                      <SelectItem value="Top Secret">Top Secret</SelectItem>
                      <SelectItem value="TS/SCI">TS/SCI</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Federal Position - Has its own visibility toggle */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Federal Position</CardTitle>
              <CardDescription>
                Your current agency and position details. This helps PathAdvisor provide better
                guidance.
              </CardDescription>
            </div>
            <DashboardCardVisibilityToggle cardKey="resume.currentPosition" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentPositionVisibility.visible ? (
            <CardHiddenPlaceholder title="Current Federal Position" cardKey="resume.currentPosition" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="currentAgency">Current Agency</Label>
                {shouldMaskCurrentPosition ? (
                  <SensitiveValue
                    value={data.currentAgency || 'Not entered'}
                    hide={true}
                    className="h-9 flex items-center"
                  />
                ) : (
                  <Input
                    id="currentAgency"
                    value={data.currentAgency}
                    onChange={(e) => updateField('currentAgency', e.target.value)}
                    placeholder="Department of Veterans Affairs"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentSeries">Occupational Series</Label>
                  {shouldMaskCurrentPosition ? (
                    <SensitiveValue
                      value={data.currentSeries || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Input
                      id="currentSeries"
                      value={data.currentSeries}
                      onChange={(e) => updateField('currentSeries', e.target.value)}
                      placeholder="0343"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentGrade">Current Grade</Label>
                  {shouldMaskCurrentPosition ? (
                    <SensitiveValue
                      value={data.currentGrade || 'Not entered'}
                      hide={true}
                      className="h-9 flex items-center"
                    />
                  ) : (
                    <Select
                      value={data.currentGrade}
                      onValueChange={(value) => updateField('currentGrade', value)}
                    >
                      <SelectTrigger id="currentGrade" className="w-full">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => i + 1).map((grade) => (
                          <SelectItem key={grade} value={`GS-${grade}`}>
                            GS-{grade}
                          </SelectItem>
                        ))}
                        <SelectItem value="SES">SES</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
