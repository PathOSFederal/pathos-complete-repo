'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Bot, Cpu, User, Zap } from 'lucide-react';
import type { PipelineEvent } from '@/lib/types';
import { formatRelativeTime, cn } from '@/lib/utils';

interface EventTimelineProps {
  events: PipelineEvent[];
  runId: string;
}

function actorIcon(actor?: string) {
  if (!actor) return <Zap className="w-3 h-3 text-slate-500" />;
  const lower = actor.toLowerCase();
  if (lower.includes('claude')) return <Bot className="w-3 h-3 text-amber-400" />;
  if (lower.includes('codex')) return <Cpu className="w-3 h-3 text-purple-400" />;
  if (lower.includes('system') || lower.includes('scheduler')) return <Zap className="w-3 h-3 text-blue-400" />;
  if (lower.includes('human') || lower.includes('john')) return <User className="w-3 h-3 text-green-400" />;
  return <Zap className="w-3 h-3 text-slate-500" />;
}

function actorLabel(actor?: string): string {
  if (!actor) return 'System';
  return actor;
}

function eventDotColor(event?: string): string {
  if (!event) return 'bg-slate-700';
  const lower = event.toLowerCase();
  if (lower.includes('fail') || lower.includes('error') || lower.includes('reject')) return 'bg-red-500';
  if (lower.includes('complete') || lower.includes('pass') || lower.includes('success')) return 'bg-green-500';
  if (lower.includes('retry') || lower.includes('warn')) return 'bg-amber-500';
  if (lower.includes('start') || lower.includes('gate') || lower.includes('check')) return 'bg-blue-500';
  return 'bg-slate-600';
}

function formatEventTitle(event: PipelineEvent): string {
  if (event.event) return event.event.replace(/_/g, ' ');
  if (event.type) return event.type.replace(/_/g, ' ');
  if (event.message) return event.message.substring(0, 60);
  return 'Event';
}

function formatEventMessage(event: PipelineEvent): string | null {
  if (event.message) return event.message;
  const data = { ...event };
  delete data.timestamp;
  delete data.event;
  delete data.type;
  delete data.actor;
  delete data.run_id;
  const keys = Object.keys(data);
  if (keys.length === 0) return null;
  return keys.map((k) => `${k}: ${String(data[k])}`).slice(0, 3).join(' · ');
}

export function EventTimeline({ events, runId }: EventTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const displayCount = expanded ? events.length : 8;
  const displayed = events.slice(0, displayCount);

  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Event Timeline</h3>
        <span className="text-xs text-slate-500">{events.length} events</span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6 text-slate-600 text-sm">
          No events logged for this run.
          <div className="mt-1 text-xs text-slate-700">
            Events appear in <code className="mono">runs/{runId}/events.log</code>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-0">
            {displayed.map((event, idx) => {
              const title = formatEventTitle(event);
              const message = formatEventMessage(event);
              const timestamp = event.timestamp;
              const actor = event.actor;
              const dotColor = eventDotColor(event.event ?? event.type);
              const isLast = idx === displayed.length - 1;

              return (
                <div key={idx} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dotColor}`} />
                    {!isLast && <div className="w-px flex-1 bg-[#1e2430] my-1" />}
                  </div>

                  {/* Content */}
                  <div className={cn('pb-4 min-w-0 flex-1', isLast && 'pb-0')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm text-slate-200 capitalize">{title}</span>
                        {message && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{message}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {actor && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-0.5 justify-end">
                            {actorIcon(actor)}
                            {actorLabel(actor)}
                          </div>
                        )}
                        {timestamp && (
                          <div className="text-xs text-slate-600">
                            {formatRelativeTime(timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {events.length > 8 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {expanded ? (
                <><ChevronDown className="w-3.5 h-3.5" /> Show fewer</>
              ) : (
                <><ChevronRight className="w-3.5 h-3.5" /> Show all {events.length} events</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
