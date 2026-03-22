/**
 * ============================================================================
 * VERSION CARDS COMPONENT (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Displays version cards list for creating, renaming, duplicating, deleting, and switching versions.
 * Versions are named cards (not filenames) that represent snapshots of the resume.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in Resume Builder workspace left pane
 * - Integrates with resumeBuilderStore for version management
 * - Each version is a named snapshot that can be independently edited
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { Plus, Copy, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ResumeVersion } from '@/lib/resume/resume-domain-model';

interface VersionCardsProps {
  versions: ResumeVersion[];
  activeVersionId: string;
  onSelectVersion: (versionId: string) => void;
  onCreateVersion: () => void;
  onRenameVersion: (versionId: string, newName: string) => void;
  onDuplicateVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
}

/**
 * Version Cards Component
 *
 * PURPOSE:
 * Renders a list of version cards with actions (create, rename, duplicate, delete, switch).
 * Shows the active version with visual indication.
 */
export function VersionCards(props: VersionCardsProps) {
  const versions = props.versions;
  const activeVersionId = props.activeVersionId;
  const onSelectVersion = props.onSelectVersion;
  const onCreateVersion = props.onCreateVersion;
  const onRenameVersion = props.onRenameVersion;
  const onDuplicateVersion = props.onDuplicateVersion;
  const onDeleteVersion = props.onDeleteVersion;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = function (version: ResumeVersion) {
    setEditingId(version.id);
    setEditName(version.name);
  };

  const handleSaveEdit = function (versionId: string) {
    if (editName.trim()) {
      onRenameVersion(versionId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = function () {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Saved Versions</h3>
          <p className="text-xs text-muted-foreground">Saved locally on this device.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateVersion} className="gap-1">
          <Plus className="h-3 w-3" />
          New
        </Button>
      </div>

      <div className="space-y-2">
        {versions.map(function (version) {
          const isActive = version.id === activeVersionId;
          const isEditing = editingId === version.id;

          return (
            <Card
              key={version.id}
              className={
                isActive
                  ? 'border-accent bg-accent/5 cursor-pointer'
                  : 'border-border cursor-pointer hover:bg-accent/5'
              }
              onClick={function () {
                if (!isEditing) {
                  onSelectVersion(version.id);
                }
              }}
            >
              <CardContent className="p-3">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={function (e) {
                        setEditName(e.target.value);
                      }}
                      onKeyDown={function (e) {
                        if (e.key === 'Enter') {
                          handleSaveEdit(version.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="h-8 flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={function () {
                        handleSaveEdit(version.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{version.name}</span>
                        {isActive && (
                          <span className="text-xs text-accent">(Active)</span>
                        )}
                        {version.isBase && (
                          <span className="text-xs text-muted-foreground">(Base)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated{' '}
                        {new Date(version.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={function (e) {
                          e.stopPropagation();
                          handleStartEdit(version);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={function (e) {
                          e.stopPropagation();
                          onDuplicateVersion(version.id);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {!version.isBase && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={function (e) {
                            e.stopPropagation();
                            onDeleteVersion(version.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


