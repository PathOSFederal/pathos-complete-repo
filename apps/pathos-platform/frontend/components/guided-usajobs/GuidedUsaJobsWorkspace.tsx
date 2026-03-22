'use client';

/**
 * ============================================================================
 * GUIDED USAJOBS WORKSPACE (Day 44)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Main workspace layout for Guided USAJOBS Mode. Provides:
 * - Embedded USAJOBS iframe
 * - Click-to-explain overlay
 * - Right-side PathAdvisor panel with structured guidance
 *
 * IMPORTANT CONSTRAINTS:
 * - No DOM scraping or USAJOBS parsing
 * - No script injection into USAJOBS
 * - Only pixel-based local capture (ephemeral, non-persistent)
 *
 * @version Day 44 - Guided USAJOBS Click-to-Explain v1
 * ============================================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Info, MousePointerClick, ShieldCheck } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  useGuidedUsaJobsStore,
  type RelocationTolerance,
  type ServicePreference,
} from '@/store/guidedUsaJobsStore';
import {
  buildGuidedUsaJobsResponse,
  type GuidedUsaJobsTopic,
} from '@/lib/guided-usajobs/responseBuilder';
import { captureGuidedUsaJobsScreenshot } from '@/lib/guided-usajobs/screenshot';
import { buildGuidedUsaJobsRegion } from '@/lib/guided-usajobs/selection';
import type { GuidedUsaJobsRegion } from '@/lib/guided-usajobs/types';

const RESPONSE_TOPIC_OPTIONS: { id: GuidedUsaJobsTopic; label: string }[] = [
  { id: 'who-may-apply', label: 'Who May Apply' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'how-evaluated', label: 'How You Will Be Evaluated' },
  { id: 'required-documents', label: 'Required Documents' },
  { id: 'questionnaire', label: 'Questionnaire' },
  { id: 'application-status', label: 'Application Status' },
  { id: 'pay-grade', label: 'Pay / Grade' },
  { id: 'location-travel', label: 'Location / Travel' },
  { id: 'how-to-apply', label: 'How to Apply' },
];

type UsaJobsEmbedStatus = 'loading' | 'ready' | 'blocked';

/**
 * Primary workspace component for Guided USAJOBS Mode.
 */
export function GuidedUsaJobsWorkspace() {
  // ---------------------------------------------------------------------------
  // Store state (explicit selectors for readability)
  // ---------------------------------------------------------------------------
  const interactionState = useGuidedUsaJobsStore(function (state) {
    return state.interactionState;
  });
  const askModeEnabled = useGuidedUsaJobsStore(function (state) {
    return state.askModeEnabled;
  });
  const selectedRegion = useGuidedUsaJobsStore(function (state) {
    return state.selectedRegion;
  });
  const screenshot = useGuidedUsaJobsStore(function (state) {
    return state.screenshot;
  });
  const response = useGuidedUsaJobsStore(function (state) {
    return state.response;
  });
  const responseTopic = useGuidedUsaJobsStore(function (state) {
    return state.responseTopic;
  });
  const contextState = useGuidedUsaJobsStore(function (state) {
    return state.contextState;
  });
  const goals = useGuidedUsaJobsStore(function (state) {
    return state.goals;
  });
  const applyEvent = useGuidedUsaJobsStore(function (state) {
    return state.applyEvent;
  });
  const setAskModeEnabled = useGuidedUsaJobsStore(function (state) {
    return state.setAskModeEnabled;
  });
  const setSelectedRegion = useGuidedUsaJobsStore(function (state) {
    return state.setSelectedRegion;
  });
  const setScreenshot = useGuidedUsaJobsStore(function (state) {
    return state.setScreenshot;
  });
  const setResponse = useGuidedUsaJobsStore(function (state) {
    return state.setResponse;
  });
  const setResponseTopic = useGuidedUsaJobsStore(function (state) {
    return state.setResponseTopic;
  });
  const setTargetGsLevel = useGuidedUsaJobsStore(function (state) {
    return state.setTargetGsLevel;
  });
  const setTimelineGoal = useGuidedUsaJobsStore(function (state) {
    return state.setTimelineGoal;
  });
  const setRelocationTolerance = useGuidedUsaJobsStore(function (state) {
    return state.setRelocationTolerance;
  });
  const setServicePreference = useGuidedUsaJobsStore(function (state) {
    return state.setServicePreference;
  });

  // ---------------------------------------------------------------------------
  // Local UI state for selection dragging + media capture
  // ---------------------------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<GuidedUsaJobsRegion | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [, setCaptureError] = useState<string | null>(null);
  const [embedStatus, setEmbedStatus] = useState<UsaJobsEmbedStatus>('loading');
  const [iframeKey, setIframeKey] = useState(0);

  // ---------------------------------------------------------------------------
  // Media stream attachment + lifecycle
  // ---------------------------------------------------------------------------
  useEffect(function () {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!mediaStream) {
      video.srcObject = null;
      return;
    }

    video.srcObject = mediaStream;

    const tracks = mediaStream.getTracks();
    const handleEnded = function () {
      setCaptureError('Screen capture ended. Select the USAJOBS tab/window again.');
      setSelectedRegion(null);
      setScreenshot(null);
      setResponse(null);
      setResponseTopic('generic');
      setAskModeEnabled(false);
      applyEvent('CAPTURE_FAILED', 'Screen capture ended by the browser.');
      setMediaStream(null);
    };

    for (let index = 0; index < tracks.length; index += 1) {
      tracks[index].addEventListener('ended', handleEnded);
    }

    return function () {
      for (let index = 0; index < tracks.length; index += 1) {
        tracks[index].removeEventListener('ended', handleEnded);
      }
    };
  }, [
    mediaStream,
    applyEvent,
    setAskModeEnabled,
    setSelectedRegion,
    setScreenshot,
    setResponse,
    setResponseTopic,
  ]);

  // ---------------------------------------------------------------------------
  // Ask PathAdvisor toggle
  // ---------------------------------------------------------------------------
  const handleToggleExplain = function () {
    if (askModeEnabled) {
      setAskModeEnabled(false);
      applyEvent('DISARM', 'Explain mode toggled off by user.');
    } else {
      setAskModeEnabled(true);
      applyEvent('ARM', 'Explain mode toggled on by user.');
    }
  };


  // ---------------------------------------------------------------------------
  // Region selection helpers
  // ---------------------------------------------------------------------------
  const getRelativePoint = function (event: React.PointerEvent) {
    const target = overlayRef.current;
    if (!target) {
      return null;
    }
    const rect = target.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      rect: rect,
    };
  };

  const finalizeRegionSelection = async function (region: GuidedUsaJobsRegion) {
    setSelectedRegion(region);
    setResponseTopic('generic');
    setResponse(null);
    setScreenshot(null);
    applyEvent('CAPTURE_REGION', 'Region selected from the capture surface.');

    const captureResult = await captureGuidedUsaJobsScreenshot({
      region: region,
      video: videoRef.current,
      maxDimension: 600,
    });

    setScreenshot({
      dataUrl: captureResult.dataUrl,
      wasBlocked: captureResult.wasBlocked,
      capturedAt: new Date().toISOString(),
    });
    applyEvent('START_ANALYSIS', 'Sending capture to PathAdvisor context.');

    window.setTimeout(function () {
      const latestGoals = useGuidedUsaJobsStore.getState().goals;
      const latestTopic = useGuidedUsaJobsStore.getState().responseTopic;
      const latestContext = useGuidedUsaJobsStore.getState().contextState;
      const nextResponse = buildGuidedUsaJobsResponse({
        topic: latestTopic,
        goals: latestGoals,
        contextState: latestContext,
      });

      setResponse(nextResponse);
      applyEvent('RENDER_RESPONSE', 'Guidance ready for display.');
      applyEvent('COMPLETE', 'Guided explanation complete.');
      setAskModeEnabled(false);
    }, 650);
  };

  const handlePointerDown = function (event: React.PointerEvent) {
    if (!askModeEnabled || interactionState !== 'CAPTURING') {
      return;
    }

    const point = getRelativePoint(event);
    if (!point) {
      return;
    }

    event.preventDefault();
    dragStartRef.current = { x: point.x, y: point.y };
    applyEvent('START_SELECTING', 'User started selecting a region.');
    setDragPreview({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
  };

  const handlePointerMove = function (event: React.PointerEvent) {
    if (!askModeEnabled || interactionState !== 'SELECTING') {
      return;
    }

    const start = dragStartRef.current;
    if (!start) {
      return;
    }

    const point = getRelativePoint(event);
    if (!point) {
      return;
    }

    event.preventDefault();

    const x = Math.min(start.x, point.x);
    const y = Math.min(start.y, point.y);
    const width = Math.abs(point.x - start.x);
    const height = Math.abs(point.y - start.y);

    setDragPreview({
      x: x,
      y: y,
      width: width,
      height: height,
    });
  };

  const handlePointerUp = function (event: React.PointerEvent) {
    if (!askModeEnabled || interactionState !== 'SELECTING') {
      return;
    }

    const start = dragStartRef.current;
    const overlay = overlayRef.current;
    if (!start || !overlay) {
      dragStartRef.current = null;
      setDragPreview(null);
      return;
    }

    const point = getRelativePoint(event);
    if (!point) {
      dragStartRef.current = null;
      setDragPreview(null);
      applyEvent('CAPTURE_READY', 'Selection canceled.');
      return;
    }

    const rect = overlay.getBoundingClientRect();

    const region = buildGuidedUsaJobsRegion({
      startX: start.x,
      startY: start.y,
      endX: point.x,
      endY: point.y,
      containerWidth: rect.width,
      containerHeight: rect.height,
      clickThreshold: 12,
      clickWidth: 180,
      clickHeight: 120,
      minDragSize: 24,
    });

    dragStartRef.current = null;
    setDragPreview(null);

    finalizeRegionSelection(region);
  };

  const handlePointerCancel = function () {
    dragStartRef.current = null;
    setDragPreview(null);
    applyEvent('CAPTURE_READY', 'Selection canceled.');
  };

  const handleEmbedLoad = function () {
    setEmbedStatus('ready');
  };

  const handleEmbedError = function () {
    setEmbedStatus('blocked');
  };

  const handleRetryEmbed = function () {
    setEmbedStatus('loading');
    setIframeKey(function (currentKey) {
      return currentKey + 1;
    });
  };

  const handleOpenNewTab = function () {
    window.open('https://www.usajobs.gov/', '_blank', 'noopener,noreferrer');
  };

  const handleTopicRefine = function (topic: GuidedUsaJobsTopic) {
    const latestGoals = useGuidedUsaJobsStore.getState().goals;
    const nextResponse = buildGuidedUsaJobsResponse({
      topic: topic,
      goals: latestGoals,
      contextState: contextState,
    });
    setResponseTopic(topic);
    setResponse(nextResponse);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageShell fullWidth className="px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* Left: Embedded USAJOBS + capture overlay */}
        <Card className="border-border/60 bg-background/60">
          <div className="border-b border-border/60 p-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Guided USAJOBS Mode</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Browse USAJOBS directly. Click anything to ask PathAdvisor what it means in federal terms.
              </p>
            </div>
            <Button
              type="button"
              variant={askModeEnabled ? 'default' : 'outline'}
              onClick={handleToggleExplain}
              className={cn(askModeEnabled ? 'bg-amber-500 text-slate-900' : '')}
            >
              <MousePointerClick className="h-4 w-4 mr-2" />
              {askModeEnabled ? 'Explain: ON' : 'Ask PathAdvisor'}
            </Button>
          </div>

          <div className="relative h-[70vh] bg-slate-950">
            {embedStatus === 'blocked' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
                <ShieldCheck className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-lg font-medium text-foreground">Embedding blocked by USAJOBS</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    USAJOBS disallows embedding. You can open it in a new tab and still use
                    Ask PathAdvisor here for manual context selection.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="default" onClick={handleOpenNewTab}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open USAJOBS in new tab
                  </Button>
                  <Button type="button" variant="outline" onClick={handleRetryEmbed}>
                    Retry embed
                  </Button>
                </div>
              </div>
            ) : null}

            <iframe
              key={iframeKey}
              src="https://www.usajobs.gov/"
              title="USAJOBS"
              className={cn(
                'absolute inset-0 w-full h-full',
                embedStatus === 'blocked' ? 'opacity-0 pointer-events-none' : 'opacity-100',
              )}
              onLoad={handleEmbedLoad}
              onError={handleEmbedError}
            />

            {/* Click-to-explain overlay */}
            <div
              ref={overlayRef}
              className={cn(
                'absolute inset-0',
                askModeEnabled && interactionState === 'ARMED'
                  ? 'cursor-help pointer-events-auto'
                  : 'pointer-events-none',
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              {dragPreview ? (
                <div
                  className="absolute border-2 border-amber-400 bg-amber-400/10"
                  style={{
                    left: dragPreview.x,
                    top: dragPreview.y,
                    width: Math.max(dragPreview.width, 8),
                    height: Math.max(dragPreview.height, 8),
                  }}
                />
              ) : null}

              {!dragPreview && selectedRegion ? (
                <div
                  className="absolute border-2 border-amber-400/70 bg-amber-400/5"
                  style={{
                    left: selectedRegion.x,
                    top: selectedRegion.y,
                    width: selectedRegion.width,
                    height: selectedRegion.height,
                  }}
                />
              ) : null}
            </div>
          </div>
        </Card>

        {/* Right: PathAdvisor panel */}
        <div className="flex flex-col gap-4">
          <Card className="border-border/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">PathAdvisor</h2>
                <p className="text-xs text-muted-foreground">
                  Calm federal guidance based on what you select.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                State: <span className="text-foreground">{interactionState}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-400" />
                PathAdvisor uses the pixels you selected as visual context only.
              </p>

              {screenshot ? (
                <div className="rounded-md border border-border/60 bg-slate-900/50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshot.dataUrl}
                    alt="Selected region preview"
                    className="w-full h-auto rounded-sm"
                  />
                  {screenshot.wasBlocked ? (
                    <p className="text-[11px] text-amber-300 mt-2">
                      Pixel capture was blocked by the browser. Guidance uses selection context only.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                  No selection captured yet. Enable “Ask PathAdvisor” and click or drag on USAJOBS.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">Goal context (local only)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Used to tailor explanations. Stored locally in your browser only.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Target GS level</Label>
                <Input
                  value={goals.targetGsLevel}
                  onChange={function (event) {
                    setTargetGsLevel(event.target.value);
                  }}
                  placeholder="e.g., GS-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Career timeline goal</Label>
                <Input
                  value={goals.timelineGoal}
                  onChange={function (event) {
                    setTimelineGoal(event.target.value);
                  }}
                  placeholder="e.g., Apply within 6 months"
                />
              </div>

              <div className="space-y-2">
                <Label>Relocation tolerance</Label>
                <Select
                  value={goals.relocationTolerance}
                  onValueChange={function (value) {
                    setRelocationTolerance(value as RelocationTolerance);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Service preference</Label>
                <Select
                  value={goals.servicePreference}
                  onValueChange={function (value) {
                    setServicePreference(value as ServicePreference);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competitive">Competitive</SelectItem>
                    <SelectItem value="excepted">Excepted</SelectItem>
                    <SelectItem value="no-preference">No preference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">Guided explanation</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Structured guidance focused on consequences and next checks.
            </p>

            <div className="mt-4 space-y-3">
              {response ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-border/60 bg-slate-900/40 p-3">
                    <p className="text-sm font-semibold text-foreground">{response.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Topic: {responseTopic === 'generic' ? 'Unlabeled section' : response.title}
                    </p>
                  </div>
                  {response.sections.map(function (section) {
                    return (
                      <div key={section.label} className="rounded-md border border-border/60 p-3">
                        <p className="text-xs font-semibold text-foreground">{section.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{section.content}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                  No response yet. Capture a region to receive guidance.
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Refine explanation</p>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_TOPIC_OPTIONS.map(function (option) {
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={responseTopic === option.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={function () {
                        handleTopicRefine(option.id);
                      }}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>

          <TrustBoundaryPanel />
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Trust boundary microcopy and OPSEC details.
 */
function TrustBoundaryPanel() {
  return (
    <Card className="border-border/60 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-400 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Trust boundary</p>
          <p className="text-xs text-muted-foreground mt-1">
            PathOS does not access your USAJOBS account. You are browsing USAJOBS directly.
            PathOS only explains what you choose to click.
          </p>
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="mt-3">
            View OPSEC / Privacy details
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2 text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">What PathOS can see</p>
            <p>
              The pixels you select for explanation, temporarily in memory, and only within this
              session.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">What PathOS never sees</p>
            <p>
              Credentials, form fields, questionnaire answers, or any DOM content from USAJOBS.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
