/**
 * ============================================================================
 * RESUME ACTIONS BAR COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * Shared header actions component for Resume Builder that provides consistent
 * action buttons across default page and workspace views.
 * Includes: Save version, Export, Focus view, Version selector
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in Resume Builder default page header
 * - Can optionally be used in workspace headers
 * - Provides consistent action set across both contexts
 *
 * KEY FEATURES:
 * - Save version button (with status indicator)
 * - Export button
 * - Focus view button
 * - Version selector (dropdown/picker)
 * - Responsive: Adapts to available space
 * - Accessible: Keyboard navigation, ARIA labels
 *
 * @version Day 38 - Resume Actions Bar
 * ============================================================================
 */

'use client';

import React from 'react';
import {
  Save,
  Download,
  Maximize2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ResumeVersion } from '@/lib/resume/resume-domain-model';

interface ResumeActionsBarProps {
  /** Active resume version (for version selector) */
  activeVersion?: ResumeVersion | null;
  /** All available versions */
  versions?: ResumeVersion[];
  /** Save status */
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  /** Callbacks */
  onSaveVersion?: () => void;
  onExport?: () => void;
  onFocusView?: () => void;
  onSelectVersion?: (versionId: string) => void;
  /** Optional: Custom class name */
  className?: string;
}

/**
 * Resume Actions Bar Component
 *
 * PURPOSE:
 * Provides consistent header actions across Resume Builder contexts.
 * Renders Save, Export, Focus view, and Version selector buttons.
 */
export function ResumeActionsBar(props: ResumeActionsBarProps) {
  const {
    activeVersion,
    versions = [],
    saveStatus = 'saved',
    onSaveVersion,
    onExport,
    onFocusView,
    onSelectVersion,
    className = '',
  } = props;

  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      {/* Version Selector */}
      {versions.length > 0 && activeVersion && onSelectVersion && (
        <Select
          value={activeVersion.id}
          onValueChange={onSelectVersion}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs gap-1">
            <FileText className="h-3 w-3 shrink-0" />
            <SelectValue>
              <span className="truncate">{activeVersion.name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {versions.map(function (version) {
              return (
                <SelectItem key={version.id} value={version.id}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>{version.name}</span>
                    {version.isBase && (
                      <span className="text-xs text-muted-foreground ml-auto">(Base)</span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {/* Save Version Button */}
      {onSaveVersion && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveVersion}
          disabled={saveStatus === 'saving'}
          className="text-xs gap-1.5 h-8"
          aria-label="Save version"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save version'}
          </span>
        </Button>
      )}

      {/* Export Button */}
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="text-xs gap-1.5 h-8"
          aria-label="Export resume"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      )}

      {/* Focus View Button */}
      {onFocusView && (
        <Button
          variant="outline"
          size="sm"
          onClick={onFocusView}
          className="text-xs gap-1.5 h-8"
          aria-label="Open focus view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Focus view</span>
        </Button>
      )}
    </div>
  );
}

