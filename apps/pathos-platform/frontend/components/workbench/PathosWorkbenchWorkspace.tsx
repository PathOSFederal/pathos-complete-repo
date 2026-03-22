'use client';

import React, { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  MessageSquareText,
  MonitorDot,
  TerminalSquare,
  Trash2,
  User,
  WifiOff,
} from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const WORKFLOW_STAGES = [
  'Search Setup',
  'Eligibility Check',
  'Target Role',
  'Resume Workspace',
  'Document Checklist',
  'Application Plan',
  'Submission Prep',
];

const JOB_SECTIONS = [
  {
    id: 'summary',
    title: 'Summary',
    content:
      'GS-13 Program Analyst supporting mission delivery, stakeholder coordination, and data-driven reporting.',
  },
  {
    id: 'duties',
    title: 'Duties',
    content:
      'Lead cross-functional planning, analyze program data, and deliver weekly status updates to leadership.',
  },
  {
    id: 'qualifications',
    title: 'Qualifications',
    content:
      'One year of specialized experience at the GS-12 level with program planning and performance analytics.',
  },
  {
    id: 'documents',
    title: 'Required Documents',
    content: 'Resume, SF-50, performance appraisal, and transcripts (if using education).',
  },
];

const QUICK_ACTIONS = ['Draft resume bullets', 'Map experience to duties', 'Outline required documents'];

const DEFAULT_STAGE = 'Target Role';

const INITIAL_SECTION_STATE: Record<string, boolean> = {
  summary: true,
  duties: false,
  qualifications: false,
  documents: false,
};

const CHAT_MESSAGES = [
  {
    id: 'assistant-intro',
    role: 'assistant',
    text: 'I can help you focus on GS-13 fit and required documents. What would you like to tackle first?',
  },
  {
    id: 'user-goal',
    role: 'user',
    text: 'Confirm the specialized experience and make sure my resume lines align.',
  },
  {
    id: 'assistant-followup',
    role: 'assistant',
    text: 'Great. Let us map each duty to a resume bullet and flag any gaps before submission prep.',
  },
];

type ActivityLogEntry = {
  id: string;
  message: string;
  timestamp: string;
  tone?: 'info' | 'success' | 'warning';
};

function createTimestamp() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createLogEntry(message: string, tone: ActivityLogEntry['tone'] = 'info'): ActivityLogEntry {
  return {
    id: Math.random().toString(36).slice(2, 10),
    message,
    timestamp: createTimestamp(),
    tone,
  };
}

export function PathosWorkbenchWorkspace() {
  const [selectedStage, setSelectedStage] = useState(DEFAULT_STAGE);
  const [isOfflineMode, setIsOfflineMode] = useState(true);
  const [isAdvisorPrivate, setIsAdvisorPrivate] = useState(false);
  const [openSections, setOpenSections] = useState(INITIAL_SECTION_STATE);
  const [chatInput, setChatInput] = useState('');
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(() => [
    createLogEntry('Workbench initialized in offline mode.'),
    createLogEntry('Target role set to GS-13 Program Analyst.'),
  ]);

  function appendLog(message: string, tone: ActivityLogEntry['tone'] = 'info') {
    setActivityLog((prev) => [...prev, createLogEntry(message, tone)]);
  }

  function handleStageSelect(stage: string) {
    setSelectedStage(stage);
    appendLog('Stage selected: ' + stage + '.');
  }

  function handleOfflineToggle(nextValue: boolean) {
    setIsOfflineMode(nextValue);
    appendLog(nextValue ? 'Offline mode enabled.' : 'Offline mode disabled.', nextValue ? 'warning' : 'info');
  }

  function handlePrivacyToggle() {
    setIsAdvisorPrivate((prev) => {
      const nextValue = !prev;
      appendLog(nextValue ? 'PathAdvisor privacy mode enabled.' : 'PathAdvisor privacy mode disabled.');
      return nextValue;
    });
  }

  function handleDeleteAllLocalData() {
    setSelectedStage(DEFAULT_STAGE);
    setIsOfflineMode(true);
    setIsAdvisorPrivate(false);
    setOpenSections(INITIAL_SECTION_STATE);
    setChatInput('');
    setActivityLog([createLogEntry('Deleted all local workbench data.', 'success')]);
  }

  return (
    <PageShell fullWidth className="p-0">
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <MonitorDot className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold">PathOS Desktop · USAJOBS Workbench</p>
              <p className="text-xs text-muted-foreground">
                Offline-first workspace for guided application prep.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={isOfflineMode ? 'secondary' : 'outline'} className="gap-2">
                <WifiOff className="h-3 w-3" />
                {isOfflineMode ? 'Offline Mode' : 'Online Mode'}
              </Badge>
              <Switch checked={isOfflineMode} onCheckedChange={handleOfflineToggle} />
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-[260px] border-r border-border/60 bg-background/80 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Layers className="h-4 w-4" />
              Workflow stages
            </div>
            <div className="mt-4 space-y-2">
              {WORKFLOW_STAGES.map((stage) => {
                const isSelected = stage === selectedStage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => handleStageSelect(stage)}
                    className={cn(
                      'w-full rounded-md border border-border/60 px-3 py-2 text-left text-sm transition',
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40'
                        : 'bg-background hover:bg-accent/30',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{stage}</span>
                      {isSelected ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-6">
            <Card className="border-border/60">
              <div className="px-6 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Official USAJOBS Listing</p>
                    <h2 className="text-lg font-semibold mt-1">Program Analyst (Read Only)</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Department of the Interior · Washington, DC · GS-13 · Full Time
                    </p>
                  </div>
                  <Badge variant="outline">Listing locked</Badge>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm">
                    <p className="text-xs text-muted-foreground">Announcement</p>
                    <p className="mt-1 font-semibold">DOI-25-1258</p>
                    <p className="mt-2 text-xs text-muted-foreground">Open through Feb 15, 2026</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm">
                    <p className="text-xs text-muted-foreground">Hiring path</p>
                    <p className="mt-1 font-semibold">Competitive Service</p>
                    <p className="mt-2 text-xs text-muted-foreground">Telework eligible</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-border/60 px-6 pb-6 pt-5">
                <div className="space-y-3">
                  {JOB_SECTIONS.map((section) => {
                    const isOpen = openSections[section.id];
                    return (
                      <Collapsible
                        key={section.id}
                        open={isOpen}
                        onOpenChange={(nextOpen) =>
                          setOpenSections((prev) => ({
                            ...prev,
                            [section.id]: nextOpen,
                          }))
                        }
                      >
                        <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">{section.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {isOpen ? 'Section expanded' : 'Section collapsed'}
                              </p>
                            </div>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label="Toggle section">
                                <ChevronDown className={cn('h-4 w-4 transition', isOpen && 'rotate-180')} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
                            {section.content}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            </Card>
          </main>

          <section className="w-[380px] border-l border-border/60 bg-background/80 p-6 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold">PathAdvisor</p>
                  <p className="text-xs text-muted-foreground">Conversation stays local</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handlePrivacyToggle} aria-label="Toggle privacy">
                {isAdvisorPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {CHAT_MESSAGES.map((message) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <div key={message.id} className={cn('flex gap-2', !isAssistant && 'justify-end')}>
                    {isAssistant ? (
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-emerald-300" />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg border border-border/60 px-3 py-2 text-sm',
                        isAssistant ? 'bg-background/70' : 'bg-emerald-500/15 text-emerald-50',
                      )}
                    >
                      {isAdvisorPrivate ? (
                        <p className="text-xs italic text-muted-foreground">Hidden while privacy mode is on.</p>
                      ) : (
                        <p>{message.text}</p>
                      )}
                    </div>
                    {!isAssistant ? (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button key={action} type="button" variant="outline" size="sm" className="text-xs">
                    {action}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask PathAdvisor for guidance"
                />
                <Button type="button" disabled>
                  Send
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Stub responses only. Data stays local while offline mode is enabled.
              </p>
            </div>
          </section>
        </div>

        <div className="border-t border-border/60 bg-background/90 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TerminalSquare className="h-4 w-4 text-emerald-300" />
              Activity Log
            </div>
            <Button variant="destructive" onClick={handleDeleteAllLocalData}>
              <Trash2 className="h-4 w-4" />
              Delete All Local Data
            </Button>
          </div>
          <div className="mt-3 rounded-lg border border-border/60 bg-slate-950/40 p-4 text-xs font-mono text-muted-foreground">
            <div className="space-y-2">
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-emerald-200">{entry.timestamp}</span>
                  <span
                    className={cn(
                      entry.tone === 'success' && 'text-emerald-200',
                      entry.tone === 'warning' && 'text-amber-200',
                    )}
                  >
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
