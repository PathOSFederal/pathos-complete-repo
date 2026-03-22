'use client';

/**
 * ============================================================================
 * GUIDED USAJOBS DESKTOP WORKSPACE (Day 45)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provide the PathOS UI shell that sits alongside the Electron BrowserView.
 *
 * WHY THIS FILE EXISTS:
 * - The Electron main process renders USAJOBS in a BrowserView (native surface).
 * - The PathOS UI must reserve a left region for that BrowserView.
 * - The right panel hosts PathAdvisor guidance and trust boundary microcopy.
 *
 * TRUST BOUNDARY:
 * - This UI never reads or parses USAJOBS DOM.
 * - Any screenshot is pixel-only and ephemeral (no storage).
 * ============================================================================
 */

import React, { useState } from 'react';
import { Info, Monitor, ShieldCheck } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const RIGHT_PANEL_WIDTH = 420;
const TOP_BAR_HEIGHT = 64;

/**
 * Copy for the trust boundary. Keep this visible and unambiguous.
 */
const TRUST_BOUNDARY_COPY =
  'PathOS runs locally and sits beside USAJOBS. It does not intercept credentials, modify USAJOBS, ' +
  'or submit anything on your behalf.';

const CONTEXT_OPTIONS = [
  'Terms/Consent',
  'Search Results',
  'Job Announcement',
  'Qualifications',
  'How You Will Be Evaluated',
  'Required Documents',
  'Questionnaire',
  'Application Status',
];

type DesktopCommandResponse = {
  ok: boolean;
  message?: string;
};

type DesktopBridge = {
  /**
   * Simple health check for the Electron bridge.
   */
  ping: () => Promise<{
    ok: boolean;
    ts: number;
  }>;
  /**
   * Ask the main process to attach the USAJOBS BrowserView.
   */
  loadUsajobs: () => Promise<DesktopCommandResponse>;
  /**
   * Capture a pixel-only screenshot from the BrowserView (ephemeral).
   */
  captureUsajobsScreenshot: () => Promise<{
    ok: boolean;
    dataUrl: string | null;
    capturedAt: string | null;
    errorMessage?: string;
    width?: number;
    height?: number;
  }>;
};

/**
 * Desktop shell workspace UI.
 */
export function GuidedUsaJobsDesktopWorkspace() {
  // Teaching note: detect the bridge by checking for the preload-exposed object.
  const [bridgeAvailable] = useState(function () {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(window.pathosDesktop);
  });
  const [statusMessage, setStatusMessage] = useState<string>(function () {
    if (typeof window === 'undefined') {
      return 'Waiting for desktop shell...';
    }

    if (window.pathosDesktop) {
      return 'Desktop bridge detected. Ready to load USAJOBS.';
    }

    return 'Desktop bridge not detected. Run inside Electron.';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTrustDetails, setShowTrustDetails] = useState(false);
  const [isAskMode, setIsAskMode] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotTimestamp, setScreenshotTimestamp] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState(CONTEXT_OPTIONS[0]);
  const [explanationSections, setExplanationSections] = useState<
    Array<{ title: string; body: string }>
  >([]);

  /**
   * Resolve the Electron bridge safely.
   */
  function getDesktopBridge(): DesktopBridge | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (window.pathosDesktop) {
      return window.pathosDesktop;
    }

    return null;
  }

  /**
   * Build deterministic, mentor-style guidance for the selected context.
   * This is a stub: no LLM calls, no DOM inspection.
   */
  function buildExplanationSections(contextLabel: string) {
    let whyItMatters = 'This step affects how USAJOBS evaluates your eligibility and fit.';
    let commonMistakes = 'Skipping details or misreading instructions can delay review.';
    let nextStep = 'Confirm your GS target, then review the next section carefully.';

    if (contextLabel === 'Search Results') {
      whyItMatters =
        'Search results are your funnel. Filters and series selection drive which jobs you ever see.';
      commonMistakes =
        'Using overly narrow filters or ignoring agency/grade requirements can hide good matches.';
      nextStep =
        'Validate filters against your GS target and duty locations before opening a posting.';
    } else if (contextLabel === 'Job Announcement') {
      whyItMatters =
        'The announcement is the source of truth for duties, requirements, and evaluation.';
      commonMistakes =
        'Missing specialized experience or ignoring required documents can disqualify you.';
      nextStep =
        'Scan for specialized experience and confirm your GS target aligns with it.';
    } else if (contextLabel === 'Qualifications') {
      whyItMatters =
        'Qualifications determine eligibility; HR uses this to screen out ineligible applicants.';
      commonMistakes =
        'Assuming education substitutes for experience when it does not.';
      nextStep =
        'Match your experience bullets to the stated specialized experience requirements.';
    } else if (contextLabel === 'How You Will Be Evaluated') {
      whyItMatters =
        'Evaluation criteria tell you what evidence must be visible in your resume.';
      commonMistakes =
        'Not aligning resume language with the competencies being scored.';
      nextStep =
        'Map your resume bullets to each competency and confirm GS target fit.';
    } else if (contextLabel === 'Required Documents') {
      whyItMatters =
        'Missing documents can result in automatic disqualification even if you are qualified.';
      commonMistakes =
        'Uploading the wrong document version or forgetting a veterans/eligibility form.';
      nextStep =
        'Create a checklist for every document and confirm filenames are clear.';
    } else if (contextLabel === 'Questionnaire') {
      whyItMatters =
        'Questionnaires influence ranking; HR compares your answers to your resume evidence.';
      commonMistakes =
        'Overstating proficiency without resume evidence or under-claiming experience.';
      nextStep =
        'Cross-check each answer against a resume bullet to avoid inconsistency.';
    } else if (contextLabel === 'Application Status') {
      whyItMatters =
        'Status updates indicate where you are in the pipeline and what follow-ups are needed.';
      commonMistakes =
        'Assuming “received” means qualified or missing additional info requests.';
      nextStep =
        'Track deadlines and monitor for requests to update documents.';
    } else if (contextLabel === 'Terms/Consent') {
      whyItMatters =
        'Terms confirm your legal acknowledgements and eligibility conditions.';
      commonMistakes =
        'Rushing through without verifying eligibility requirements.';
      nextStep =
        'Confirm you meet the eligibility criteria tied to your GS target.';
    }

    return [
      {
        title: 'What you clicked',
        body: 'You clicked in the ' + contextLabel + ' area.',
      },
      {
        title: 'Why it matters',
        body: whyItMatters,
      },
      {
        title: 'Common mistakes',
        body: commonMistakes,
      },
      {
        title: 'What to check next',
        body: nextStep,
      },
    ];
  }

  /**
   * Ask Electron to show the USAJOBS BrowserView.
   */
  async function handleLoadUsaJobs() {
    setErrorMessage(null);
    const bridge = getDesktopBridge();

    if (!bridge) {
      setStatusMessage('Desktop bridge not available.');
      setErrorMessage('Launch via Electron to load USAJOBS.');
      return;
    }

    const response = await bridge.loadUsajobs();
    if (response && response.ok) {
      setStatusMessage(response.message || 'USAJOBS loaded.');
    } else {
      setStatusMessage('Failed to load USAJOBS.');
      setErrorMessage(response && response.message ? response.message : 'Unknown load error.');
    }
  }

  /**
   * Capture a pixel-only screenshot in Ask Mode (no DOM access).
   */
  async function handleSurfaceClick() {
    if (!isAskMode) {
      return;
    }

    setErrorMessage(null);
    const bridge = getDesktopBridge();

    if (!bridge) {
      setStatusMessage('Desktop bridge not available.');
      setErrorMessage('Launch via Electron to capture a screenshot.');
      return;
    }

    const response = await bridge.captureUsajobsScreenshot();
    if (response && response.ok && response.dataUrl) {
      setScreenshotDataUrl(response.dataUrl);
      setScreenshotTimestamp(response.capturedAt);
      setStatusMessage('Captured pixel-only preview.');
      setExplanationSections(buildExplanationSections(selectedContext));
      return;
    }

    setScreenshotDataUrl(null);
    setScreenshotTimestamp(null);
    setStatusMessage('Screenshot capture failed.');
    setErrorMessage(response && response.errorMessage ? response.errorMessage : 'Unknown capture error.');
  }

  /**
   * Clear the current screenshot preview from memory.
   */
  function handleClearScreenshot() {
    setScreenshotDataUrl(null);
    setScreenshotTimestamp(null);
    setStatusMessage('Screenshot cleared.');
  }


  /**
   * Toggle the trust boundary disclosure.
   */
  function handleToggleTrust() {
    setShowTrustDetails(!showTrustDetails);
  }

  return (
    <PageShell fullWidth className="p-0">
      <div className="min-h-screen bg-background text-foreground">
        {/* Top bar: matches the Electron layout math (TOP_BAR_HEIGHT) */}
        <div
          className="flex items-center justify-between border-b border-border/60 px-6"
          style={{ height: TOP_BAR_HEIGHT }}
        >
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold">Guided USAJOBS Workspace</p>
              <p className="text-xs text-muted-foreground">
                Desktop shell spike — BrowserView on the left, PathAdvisor on the right.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleLoadUsaJobs} disabled={!bridgeAvailable}>
              Load USAJOBS
            </Button>
            <Button
              type="button"
              variant={isAskMode ? 'default' : 'outline'}
              onClick={function () {
                setIsAskMode(!isAskMode);
              }}
              disabled={!bridgeAvailable}
            >
              Ask PathAdvisor: {isAskMode ? 'On' : 'Off'}
            </Button>
            <Button type="button" variant="ghost" onClick={handleToggleTrust}>
              Show Trust Boundary
            </Button>
          </div>
        </div>

        {/* Main workspace area */}
        <div
          className="flex"
          style={{ minHeight: 'calc(100vh - ' + TOP_BAR_HEIGHT + 'px)' }}
        >
          {/* Left: reserved BrowserView surface */}
          <div className="flex-1 border-r border-border/60">
            <div className="h-full min-h-[520px] p-6">
              <div
                className={
                  'h-full rounded-lg border-2 border-dashed border-emerald-500/40 bg-slate-950/40 ' +
                  (isAskMode ? 'cursor-help' : 'cursor-default')
                }
                onClick={handleSurfaceClick}
              >
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
                  <Monitor className="h-10 w-10 text-emerald-400" />
                  <div>
                    <p className="text-lg font-semibold">USAJOBS Surface (BrowserView)</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This area is reserved for the Electron BrowserView. No iframe, no DOM access.
                    </p>
                  </div>
                  {isAskMode ? (
                    <div className="text-xs text-emerald-200/90">
                      Ask Mode is on — click anywhere to explain.
                    </div>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    Reserved width: <span className="text-foreground">{RIGHT_PANEL_WIDTH}px</span> right rail.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: PathAdvisor panel */}
          <div className="border-l border-border/60 bg-background/80 p-6" style={{ width: RIGHT_PANEL_WIDTH }}>
            <div className="flex flex-col gap-4">
              <Card className="border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">PathAdvisor</h2>
                    <p className="text-xs text-muted-foreground">
                      Guidance remains visible while you browse USAJOBS.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Shell: <span className="text-foreground">{bridgeAvailable ? 'connected' : 'offline'}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-400 mt-0.5" />
                    <span>{TRUST_BOUNDARY_COPY}</span>
                  </p>

                  {showTrustDetails ? (
                    <div className="rounded-md border border-border/60 bg-slate-900/40 p-3 text-xs">
                      <p className="font-semibold text-foreground">Trust boundary details</p>
                      <p className="mt-2 text-muted-foreground">
                        USAJOBS is rendered in a native BrowserView. PathOS never injects scripts, never scrapes HTML,
                        and only uses pixel-only, ephemeral screenshots in Ask Mode.
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">BrowserView Status</h3>
                    <p className="text-xs text-muted-foreground mt-1">{statusMessage}</p>
                  </div>
                  {typeof window !== 'undefined' ? (
                    <div className="text-xs text-muted-foreground">Bridge checked</div>
                  ) : null}
                </div>

                {errorMessage ? (
                  <div className="mt-3 rounded-md border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">
                    {errorMessage}
                  </div>
                ) : null}
              </Card>

              <Card className="border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Ephemeral Screenshot</h3>
                    <p className="text-xs text-muted-foreground mt-1">Screenshot is ephemeral and not stored.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearScreenshot}
                    disabled={!screenshotDataUrl}
                  >
                    Clear
                  </Button>
                </div>

                {screenshotDataUrl ? (
                  <div className="mt-4 space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshotDataUrl} alt="USAJOBS capture preview" className="w-full rounded-md" />
                    <p className="text-[11px] text-muted-foreground">
                      Captured at {screenshotTimestamp || 'unknown time'}. Preview is ephemeral.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                    No screenshot captured yet. Toggle Ask Mode and click the surface to explain.
                  </div>
                )}
              </Card>

              <Card className="border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Ask PathAdvisor</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click-to-explain uses pixels only (no DOM).
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground">Context state</label>
                  <select
                    className="mt-2 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
                    value={selectedContext}
                    onChange={function (event) {
                      const nextValue = event.target.value;
                      setSelectedContext(nextValue);
                      if (screenshotDataUrl) {
                        setExplanationSections(buildExplanationSections(nextValue));
                      }
                    }}
                  >
                    {CONTEXT_OPTIONS.map(function (option) {
                      return (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {explanationSections.length > 0 ? (
                  <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                    {explanationSections.map(function (section) {
                      return (
                        <div key={section.title}>
                          <p className="font-semibold text-foreground">{section.title}</p>
                          <p className="mt-1">{section.body}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                    Capture a screenshot to generate a deterministic explanation.
                  </div>
                )}
              </Card>

              <Card className="border-border/60 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Trust Boundary Summary</p>
                    <p className="text-xs text-muted-foreground mt-1">{TRUST_BOUNDARY_COPY}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
