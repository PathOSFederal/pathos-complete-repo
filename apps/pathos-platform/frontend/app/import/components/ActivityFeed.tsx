'use client';

/**
 * ============================================================================
 * ACTIVITY FEED COMPONENT (Day 27 - Extracted from Import Page)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays audit log events (activity feed) for an import item.
 * Shows actions taken on the import with timestamps and event types.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * Used within DocumentItem in the Import Center page to show activity history.
 *
 * HOUSE RULES COMPLIANCE:
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 27 - Extracted from Import Page
 * ============================================================================
 */

import { Activity, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  AUDIT_EVENT_TYPE_LABELS,
  AUDIT_EVENT_TYPE_COLORS,
} from '@/store/auditLogStore';
import type { AuditEvent } from '@/store/auditLogStore';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

interface ActivityFeedProps {
  /**
   * Audit events to display for this import item.
   */
  auditEvents: AuditEvent[];
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Renders the activity feed showing audit log events for an import item.
 */
export function ActivityFeed(props: ActivityFeedProps) {
  const auditEventsForImport = props.auditEvents;

  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <Activity className="w-3 h-3" />
        Activity
        <span className="text-[10px] text-muted-foreground ml-1 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Shows actions taken on this import
        </span>
      </Label>
      {auditEventsForImport.length > 0 ? (
        <div className="bg-secondary/20 p-3 rounded space-y-2 max-h-48 overflow-auto">
          {auditEventsForImport.map(function (event) {
            const eventDate = new Date(event.timestamp);
            const timeAgo = function (): string {
              const now = new Date();
              const diffMs = now.getTime() - eventDate.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins < 1) return 'Just now';
              if (diffMins < 60) return diffMins + 'm ago';
              const diffHours = Math.floor(diffMins / 60);
              if (diffHours < 24) return diffHours + 'h ago';
              const diffDays = Math.floor(diffHours / 24);
              return diffDays + 'd ago';
            };

            return (
              <div key={event.id} className="flex items-start gap-2 text-xs">
                <div className={'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ' + AUDIT_EVENT_TYPE_COLORS[event.type].replace('text-', 'bg-')} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{event.summary}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-muted-foreground">{timeAgo()}</span>
                    <span className={'text-[10px] ' + AUDIT_EVENT_TYPE_COLORS[event.type]}>
                      {AUDIT_EVENT_TYPE_LABELS[event.type]}
                    </span>
                    {event.source === 'system' && (
                      <span className="text-[10px] text-slate-500">(auto)</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-secondary/20 p-3 rounded text-xs text-muted-foreground italic">
          No activity yet.
        </div>
      )}
    </div>
  );
}









