/**
 * ============================================================================
 * TARGET ROLES & PATHS CARD (REFACTORED)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component displays the user's target federal roles and allows them to
 * designate EXACTLY ONE as the primary target. The primary role is used by
 * PathAdvisor and the Resume Builder for tailored guidance.
 *
 * WHY THIS REFACTOR:
 * The previous design allowed multiple target roles but didn't:
 *   - Enforce exactly one primary role
 *   - Show clear "Primary" badge
 *   - Handle incomplete role data with accurate messaging
 *
 * KEY CHANGES:
 * 1. Added "Primary" badge/toggle for each role
 * 2. Enforced exactly one primary role when multiple roles exist
 * 3. Fixed messaging: "Complete required details for your primary target role"
 *    instead of "Fill out at least one target role" when roles exist
 * 4. Added validation for required fields (grade, series, title)
 *
 * EXACTLY ONE PRIMARY ROLE RULE:
 * - If only one role exists, it's automatically primary
 * - If multiple roles exist, user must designate one as primary
 * - When a role is set as primary, the previous primary is demoted
 *
 * ARCHITECTURE FIT:
 * - Located in components/career-resume/ alongside other career page cards
 * - Uses the same stores and visibility patterns as sibling components
 * - Provides primaryRole data to parent for Command Strip usage
 *
 * @version Day 14 - Career & Resume First-Principles Refactor
 */

'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, MapPin, Calendar, X, Star, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { SensitiveValue } from '@/components/sensitive-value';

/**
 * TargetRole interface defines a target federal role.
 * Now includes `isPrimary` flag and `isComplete` validation.
 */
interface TargetRole {
  /** Unique identifier */
  id: string;
  /** GS grade (e.g., "GS-13") */
  grade: string;
  /** Job series code (e.g., "2210") */
  series: string;
  /** Position title (e.g., "IT Specialist (SYSADMIN)") */
  title: string;
  /** Preferred location */
  location: string;
  /** Target timeline (e.g., "Next 12-18 months") */
  timeline: string;
  /** Whether this is the primary target role */
  isPrimary: boolean;
}

/**
 * Check if a role has all required fields filled.
 * Required: grade, series, title.
 * Optional: location, timeline.
 *
 * @param role - The target role to check
 * @returns boolean - true if all required fields are present
 *
 * EXAMPLE:
 *   isRoleComplete({ grade: 'GS-13', series: '2210', title: 'IT Specialist' })
 *   -> true
 *
 *   isRoleComplete({ grade: 'GS-13', series: '', title: '' })
 *   -> false
 */
function isRoleComplete(role: TargetRole): boolean {
  // Check each required field explicitly and convert to boolean
  // This avoids TypeScript inference issues with && returning string | boolean
  const hasGrade = Boolean(role.grade && role.grade.length > 0);
  const hasSeries = Boolean(role.series && role.series.length > 0);
  const hasTitle = Boolean(role.title && role.title.length > 0);
  return hasGrade && hasSeries && hasTitle;
}

/**
 * Mock target roles - in real implementation, this comes from the store.
 * The first role is marked as primary by default.
 */
const initialTargetRoles: TargetRole[] = [
  {
    id: '1',
    grade: 'GS-13',
    series: '2210',
    title: 'IT Specialist (SYSADMIN)',
    location: 'Current agency',
    timeline: 'Next 12-18 months',
    isPrimary: true,
  },
  {
    id: '2',
    grade: 'GS-13',
    series: '2210',
    title: 'IT Specialist (INFOSEC)',
    location: 'Any location',
    timeline: 'Next 18-24 months',
    isPrimary: false,
  },
];

/**
 * Props interface for TargetRolesCard.
 */
interface TargetRolesCardProps {
  /** Callback when primary role changes (for parent to update Command Strip) */
  onPrimaryRoleChange?: (role: TargetRole | null, isComplete: boolean) => void;
}

/**
 * TargetRolesCard Component
 *
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Uses local state to manage target roles list
 * 2. Enforces exactly one primary role rule
 * 3. Shows "Primary" badge on the designated primary role
 * 4. Shows "Set as primary" button for non-primary roles
 * 5. Validates required fields and shows "Missing required details" if incomplete
 * 6. Notifies parent when primary role changes (for Command Strip sync)
 *
 * EXAMPLE:
 * User has two roles, first is primary:
 *   -> First role shows "Primary" badge
 *   -> Second role shows "Set as primary" button
 *   -> Clicking "Set as primary" on second role demotes the first
 */
export function TargetRolesCard(props: TargetRolesCardProps) {
  const onPrimaryRoleChange = props.onPrimaryRoleChange;

  const visibility = useDashboardCardVisibility('career.targetRoles');
  const visible = visibility.visible;
  const isSensitiveHidden = visibility.isSensitiveHidden;
  const title = 'Target Roles & Paths';

  const [targetRoles, setTargetRoles] = useState<TargetRole[]>(initialTargetRoles);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole] = useState({
    grade: '',
    series: '',
    title: '',
    location: '',
    timeline: '',
  });

  /**
   * Find the current primary role.
   */
  const getPrimaryRole = function (): TargetRole | null {
    for (let i = 0; i < targetRoles.length; i++) {
      if (targetRoles[i].isPrimary) {
        return targetRoles[i];
      }
    }
    // If no role is marked primary but roles exist, return the first one
    if (targetRoles.length > 0) {
      return targetRoles[0];
    }
    return null;
  };

  /**
   * Effect: Notify parent when primary role changes.
   * This keeps the Command Strip in sync with the selected primary role.
   */
  useEffect(function () {
    if (onPrimaryRoleChange) {
      const primary = getPrimaryRole();
      if (primary) {
        onPrimaryRoleChange(primary, isRoleComplete(primary));
      } else {
        onPrimaryRoleChange(null, false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRoles]);

  /**
   * Handle setting a role as primary.
   * Demotes the current primary role and promotes the selected one.
   *
   * @param roleId - The ID of the role to set as primary
   */
  const handleSetPrimary = function (roleId: string) {
    const newRoles: TargetRole[] = [];
    for (let i = 0; i < targetRoles.length; i++) {
      const role = targetRoles[i];
      const updatedRole: TargetRole = {
        id: role.id,
        grade: role.grade,
        series: role.series,
        title: role.title,
        location: role.location,
        timeline: role.timeline,
        isPrimary: role.id === roleId,
      };
      newRoles.push(updatedRole);
    }
    setTargetRoles(newRoles);
  };

  /**
   * Handle adding a new target role.
   * If this is the only role, it becomes primary automatically.
   */
  const handleAddRole = function () {
    if (newRole.grade && newRole.series) {
      const isFirstRole = targetRoles.length === 0;
      const role: TargetRole = {
        id: Date.now().toString(),
        grade: newRole.grade,
        series: newRole.series,
        title: newRole.title,
        location: newRole.location,
        timeline: newRole.timeline,
        isPrimary: isFirstRole,
      };

      const newRoles: TargetRole[] = [];
      for (let i = 0; i < targetRoles.length; i++) {
        newRoles.push(targetRoles[i]);
      }
      newRoles.push(role);
      setTargetRoles(newRoles);

      setNewRole({ grade: '', series: '', title: '', location: '', timeline: '' });
      setShowAddForm(false);
    }
  };

  /**
   * Handle removing a target role.
   * If the primary role is removed and others exist, the first remaining
   * role becomes primary.
   */
  const handleRemoveRole = function (id: string) {
    const removedRole = targetRoles.find(function (r) {
      return r.id === id;
    });
    const wasPrimary = removedRole && removedRole.isPrimary;

    const newRoles: TargetRole[] = [];
    for (let i = 0; i < targetRoles.length; i++) {
      if (targetRoles[i].id !== id) {
        newRoles.push(targetRoles[i]);
      }
    }

    // If we removed the primary and there are remaining roles, make the first one primary
    if (wasPrimary && newRoles.length > 0) {
      newRoles[0] = {
        id: newRoles[0].id,
        grade: newRoles[0].grade,
        series: newRoles[0].series,
        title: newRoles[0].title,
        location: newRoles[0].location,
        timeline: newRoles[0].timeline,
        isPrimary: true,
      };
    }

    setTargetRoles(newRoles);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <DashboardCardVisibilityToggle cardKey="career.targetRoles" />
        </div>
        {visible && (
          <p className="text-sm text-muted-foreground">
            Tell PathAdvisor which roles you are targeting. Designate one as your primary target
            for tailored guidance.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            {/* No Roles Message */}
            {targetRoles.length === 0 && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      No target role defined
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add at least one target role so PathAdvisor can provide tailored career guidance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Target Roles List */}
            <div className="space-y-3">
              {targetRoles.map(function (role) {
                const complete = isRoleComplete(role);
                return (
                  <div
                    key={role.id}
                    className={
                      'p-3 rounded-lg border bg-muted/30 group ' +
                      (role.isPrimary ? 'border-accent/50 bg-accent/5' : 'border-border')
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        {/* Role Header: Grade + Title + Primary Badge */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <SensitiveValue
                              value={role.grade}
                              hide={isSensitiveHidden}
                              masked="GS-••"
                            />
                          </Badge>
                          <span className="text-sm font-medium">
                            <SensitiveValue
                              value={role.title}
                              hide={isSensitiveHidden}
                              masked="••••••••••••"
                            />
                          </span>

                          {/* Primary Badge */}
                          {role.isPrimary && (
                            <Badge className="bg-accent text-accent-foreground text-xs gap-1">
                              <Star className="w-3 h-3" />
                              Primary
                            </Badge>
                          )}

                          {/* Incomplete Warning */}
                          {!complete && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Missing required details
                            </Badge>
                          )}
                        </div>

                        {/* Location + Timeline */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {role.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <SensitiveValue
                                value={role.location}
                                hide={isSensitiveHidden}
                                masked="••••••••"
                              />
                            </span>
                          )}
                          {role.timeline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <SensitiveValue
                                value={role.timeline}
                                hide={isSensitiveHidden}
                                masked="••••••••"
                              />
                            </span>
                          )}
                        </div>

                        {/* Set as Primary Button (for non-primary roles) */}
                        {!role.isPrimary && targetRoles.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-accent hover:text-accent hover:bg-accent/10"
                            onClick={function () {
                              handleSetPrimary(role.id);
                            }}
                          >
                            <Star className="w-3 h-3" />
                            Set as primary
                          </Button>
                        )}
                      </div>

                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={function () {
                          handleRemoveRole(role.id);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Role Form */}
            {showAddForm ? (
              <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
                <p className="text-sm font-medium">Add Target Role</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Grade *</label>
                    <Select
                      value={newRole.grade}
                      onValueChange={function (value) {
                        setNewRole({
                          grade: value,
                          series: newRole.series,
                          title: newRole.title,
                          location: newRole.location,
                          timeline: newRole.timeline,
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {['GS-9', 'GS-11', 'GS-12', 'GS-13', 'GS-14', 'GS-15'].map(function (
                          grade,
                        ) {
                          return (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Series *</label>
                    <Input
                      value={newRole.series}
                      onChange={function (e) {
                        setNewRole({
                          grade: newRole.grade,
                          series: e.target.value,
                          title: newRole.title,
                          location: newRole.location,
                          timeline: newRole.timeline,
                        });
                      }}
                      placeholder="e.g., 2210"
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Title *</label>
                    <Input
                      value={newRole.title}
                      onChange={function (e) {
                        setNewRole({
                          grade: newRole.grade,
                          series: newRole.series,
                          title: e.target.value,
                          location: newRole.location,
                          timeline: newRole.timeline,
                        });
                      }}
                      placeholder="e.g., IT Specialist (INFOSEC)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Location</label>
                    <Input
                      value={newRole.location}
                      onChange={function (e) {
                        setNewRole({
                          grade: newRole.grade,
                          series: newRole.series,
                          title: newRole.title,
                          location: e.target.value,
                          timeline: newRole.timeline,
                        });
                      }}
                      placeholder="e.g., Any location"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Timeline</label>
                    <Select
                      value={newRole.timeline}
                      onValueChange={function (value) {
                        setNewRole({
                          grade: newRole.grade,
                          series: newRole.series,
                          title: newRole.title,
                          location: newRole.location,
                          timeline: value,
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select timeline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Next 6-12 months">Next 6-12 months</SelectItem>
                        <SelectItem value="Next 12-18 months">Next 12-18 months</SelectItem>
                        <SelectItem value="Next 18-24 months">Next 18-24 months</SelectItem>
                        <SelectItem value="2+ years">2+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddRole}>
                    Add Role
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={function () {
                      setShowAddForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full bg-transparent"
                onClick={function () {
                  setShowAddForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add target role
              </Button>
            )}
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="career.targetRoles" />
        )}
      </CardContent>
    </Card>
  );
}
