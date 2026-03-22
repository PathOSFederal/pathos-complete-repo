/**
 * ============================================================================
 * MISSION BOARD V1 (Day 35 - Hybrid Advisor + Mission Board Dashboard)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component renders a compact 3-step mission board for the Job Seeker
 * dashboard. It provides structure and clarity about the user's journey:
 * 1. Target the right roles
 * 2. Qualify and prove it
 * 3. Apply with precision
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * This is the SECONDARY panel in the new Job Seeker dashboard layout:
 * - Right column (desktop): MissionBoardV1 + EvidenceDrawerV1
 * - Compact tabs/pills (mobile): Mission Board becomes compact tabs
 *
 * KEY FEATURES:
 * - 3-step board with status pills (Not started / In progress / Ready)
 * - One "Recommended next action" button per mission
 * - One "Why it matters" sentence per mission
 * - In Plan Mode: Clicking a mission injects a targeted advisor message
 *   and opens relevant evidence
 *
 * STATE MANAGEMENT:
 * - Statuses are placeholder for now (can be computed from store data later)
 * - Mission clicks trigger callbacks to parent (for injecting messages)
 *
 * DESIGN PRINCIPLES:
 * - Compact and structured
 * - Clear progression path
 * - Actionable (each mission has a recommended action)
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, FileCheck, Send } from 'lucide-react';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * MissionStatus represents the current status of a mission.
 */
type MissionStatus = 'not-started' | 'in-progress' | 'ready';

/**
 * Mission represents a single mission in the board.
 */
interface Mission {
  id: string;
  title: string;
  status: MissionStatus;
  recommendedAction: {
    label: string;
    href: string;
  };
  whyItMatters: string;
  evidenceCardType: 'snapshot' | 'blockers' | 'focus' | 'moves';
}

/**
 * ============================================================================
 * PROPS INTERFACE
 * ============================================================================
 */

interface MissionBoardV1Props {
  /**
   * Callback when a mission is clicked.
   * Should inject a targeted advisor message and open relevant evidence.
   */
  onMissionClick: (missionId: string, evidenceCardType: Mission['evidenceCardType']) => void;
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Gets the status badge variant and text for a mission status.
 */
function getStatusBadge(status: MissionStatus): { variant: 'default' | 'secondary' | 'outline'; text: string } {
  if (status === 'ready') {
    return { variant: 'default', text: 'Ready' };
  }
  if (status === 'in-progress') {
    return { variant: 'secondary', text: 'In progress' };
  }
  return { variant: 'outline', text: 'Not started' };
}

/**
 * Gets the icon for a mission based on its ID.
 */
function getMissionIcon(missionId: string) {
  if (missionId === 'target') {
    return Target;
  }
  if (missionId === 'qualify') {
    return FileCheck;
  }
  if (missionId === 'apply') {
    return Send;
  }
  return Target;
}

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function MissionBoardV1(props: MissionBoardV1Props) {
  const onMissionClick = props.onMissionClick;

  // ============================================================================
  // MISSION DATA
  // Placeholder missions with default statuses.
  // In a real implementation, these would be computed from store data.
  // ============================================================================

  const missions: Mission[] = [
    {
      id: 'target',
      title: 'Target the right roles',
      status: 'in-progress',
      recommendedAction: {
        label: 'Set target role',
        href: '/dashboard/job-search',
      },
      whyItMatters: 'Focusing on roles you qualify for reduces wasted applications.',
      evidenceCardType: 'snapshot',
    },
    {
      id: 'qualify',
      title: 'Qualify and prove it',
      status: 'not-started',
      recommendedAction: {
        label: 'Address blockers',
        href: '/dashboard/job-search',
      },
      whyItMatters: 'Most wasted applications happen when eligibility blockers are missed.',
      evidenceCardType: 'blockers',
    },
    {
      id: 'apply',
      title: 'Apply with precision',
      status: 'not-started',
      recommendedAction: {
        label: 'Review today\'s focus',
        href: '/dashboard/job-search',
      },
      whyItMatters: 'Tailored applications get more responses than generic ones.',
      evidenceCardType: 'focus',
    },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    // data-tour anchors are used by GuidedTourOverlay for stable spotlight targeting
    <Card data-tour="mission-card" className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Your Mission</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missions.map(function (mission) {
          const statusBadge = getStatusBadge(mission.status);
          const MissionIcon = getMissionIcon(mission.id);

          return (
            <div
              key={mission.id}
              className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={function () {
                onMissionClick(mission.id, mission.evidenceCardType);
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MissionIcon className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-medium text-foreground">{mission.title}</h3>
                </div>
                <Badge variant={statusBadge.variant} className="text-xs">
                  {statusBadge.text}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{mission.whyItMatters}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-handoff-target={mission.id === 'target' ? 'set-target' : mission.id === 'qualify' ? 'check-blockers' : 'resume-proof'}
                onClick={function (e) {
                  e.stopPropagation();
                  // Day 35: Append handoff query param for guided navigation
                  const handoffId = mission.id === 'target' ? 'set-target' : mission.id === 'qualify' ? 'check-blockers' : 'resume-proof';
                  window.location.href = mission.recommendedAction.href + '?handoff=' + handoffId;
                }}
              >
                {mission.recommendedAction.label}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
