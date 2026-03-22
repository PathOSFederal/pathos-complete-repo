/**
 * ============================================================================
 * ALERTS CENTER PAGE (Day 20)
 * ============================================================================
 *
 * FILE PURPOSE:
 * A dedicated page for managing job alerts and email digest settings.
 * Users can view all their alerts, run test matches, configure digest
 * preferences, preview digests, and view the event log.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * - Page Layer: /alerts route
 * - Reads from: jobAlertsStore, userPreferencesStore, jobSearchStore
 * - Writes to: jobAlertsStore (email digest settings, events, seen jobs)
 *
 * KEY RESPONSIBILITIES:
 * 1. Display list of alert rules with match counts
 * 2. Run test matches and show results
 * 3. Configure email digest settings (consent, frequency, email)
 * 4. Generate and preview digest
 * 5. Send via mailto: or copy fallback
 * 6. Display event log
 *
 * HOUSE RULES COMPLIANCE (Day 20):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 20 - Email Digest v1
 * ============================================================================
 */

'use client';

import type React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Mail,
  Play,
  Eye,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Send,
  Settings,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PageShell } from '@/components/layout/page-shell';
import {
  useJobAlertsStore,
  selectAlerts,
  selectEmailDigest,
  selectEvents,
  selectTotalNewMatches,
  selectAlertsIsLoaded,
} from '@/store';
import { useJobSearchStore, selectJobs, type JobCardModel } from '@/store/jobSearchStore';
import { useUserPreferencesStore, selectGlobalHide } from '@/store/userPreferencesStore';
import {
  generateDigest,
  buildMailtoUrl,
  copyToClipboard,
} from '@/lib/alerts';
import type { DigestJobData, DigestResult } from '@/lib/alerts';
import type { JobAlert, AlertEvent, MatchableJob } from '@/store';
import { cn } from '@/lib/utils';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts a JobCardModel to DigestJobData format.
 *
 * DAY 20 NOTE:
 * JobCardModel has organizationName, payRange.displayText, postingUrl.
 * We map these to the simpler DigestJobData format.
 *
 * @param job - JobCardModel from store
 * @returns DigestJobData for digest generation
 */
function jobToDigestData(job: JobCardModel): DigestJobData {
  // Extract salary display from payRange if available
  let salaryDisplay = '';
  if (job.payRange !== undefined && job.payRange !== null) {
    if (job.payRange.displayText !== undefined && job.payRange.displayText !== null) {
      salaryDisplay = job.payRange.displayText;
    }
  }

  return {
    id: String(job.id),
    title: job.title,
    organization: job.organizationName !== undefined && job.organizationName !== null ? job.organizationName : '',
    location: job.locationDisplay !== undefined && job.locationDisplay !== null ? job.locationDisplay : '',
    salary: salaryDisplay,
    gradeLevel: job.gradeLevel !== undefined && job.gradeLevel !== null ? job.gradeLevel : '',
    url: job.postingUrl !== undefined && job.postingUrl !== null ? job.postingUrl : '',
  };
}

/**
 * Builds MatchableJob array from JobCardModel array.
 *
 * DAY 20 NOTE:
 * JobCardModel doesn't have snippet or telework directly.
 * We use empty strings as fallbacks for these fields.
 * The matching logic in jobAlertsStore handles this gracefully.
 *
 * @param jobs - JobCardModel array from store
 * @returns Array of MatchableJob for alert matching
 */
function buildMatchableJobs(jobs: JobCardModel[]): MatchableJob[] {
  const result: MatchableJob[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    result.push({
      id: String(job.id),
      title: job.title,
      snippet: '', // Not available in JobCardModel - matching uses title only
      seriesCode: job.seriesCode !== undefined && job.seriesCode !== null ? job.seriesCode : '',
      gradeLevel: job.gradeLevel !== undefined && job.gradeLevel !== null ? job.gradeLevel : '',
      locationDisplay: job.locationDisplay !== undefined && job.locationDisplay !== null ? job.locationDisplay : '',
      teleworkEligibility: job.teleworkEligibility !== undefined && job.teleworkEligibility !== null ? job.teleworkEligibility : '',
    });
  }
  return result;
}

/**
 * Formats a timestamp for display.
 *
 * @param isoString - ISO 8601 timestamp
 * @returns Formatted time string
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return diffMins + ' min ago';
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return diffHours + ' hour' + (diffHours === 1 ? '' : 's') + ' ago';
  }

  // Format as date
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const mins = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMins = mins < 10 ? '0' + mins : '' + mins;

  return month + '/' + day + ' ' + displayHours + ':' + displayMins + ' ' + ampm;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Alert rule card component.
 */
function AlertRuleCard(props: {
  alert: JobAlert;
  newMatchCount: number;
  onRunTest: () => void;
  isRunning: boolean;
}) {
  const alert = props.alert;
  const newMatchCount = props.newMatchCount;
  const onRunTest = props.onRunTest;
  const isRunning = props.isRunning;

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {alert.enabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={cn('font-medium truncate', !alert.enabled && 'text-muted-foreground')}>
            {alert.name}
          </span>
          {newMatchCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {newMatchCount} new
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          <span>Keywords: {alert.keywords}</span>
          {alert.series !== null && alert.series !== '' && (
            <span> • Series: {alert.series}</span>
          )}
          {alert.gradeBand !== null && alert.gradeBand !== '' && (
            <span> • Grade: {alert.gradeBand}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {alert.lastMatchCount} match{alert.lastMatchCount === 1 ? '' : 'es'}
          {alert.lastRunAt !== null && (
            <span> • Last run: {formatTime(alert.lastRunAt)}</span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRunTest}
        disabled={isRunning || !alert.enabled}
        className="flex-shrink-0 ml-4"
      >
        {isRunning ? (
          <RefreshCcw className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span className="ml-1">Run Test</span>
      </Button>
    </div>
  );
}

/**
 * Event log entry component.
 */
function EventLogEntry(props: { event: AlertEvent }) {
  const event = props.event;

  const iconByType: Record<string, React.ReactNode> = {
    'TEST_RUN': <Play className="h-3 w-3" />,
    'NEW_MATCHES_FOUND': <Check className="h-3 w-3 text-green-500" />,
    'NO_NEW_MATCHES': <AlertTriangle className="h-3 w-3 text-yellow-500" />,
    'DIGEST_GENERATED': <Mail className="h-3 w-3" />,
    'DIGEST_SENT': <Send className="h-3 w-3 text-primary" />,
    'SETTINGS_UPDATED': <Settings className="h-3 w-3" />,
    'ALERT_CREATED': <Bell className="h-3 w-3 text-primary" />,
    'ALERT_DELETED': <Trash2 className="h-3 w-3 text-destructive" />,
  };

  const icon = iconByType[event.type];

  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-b-0">
      <div className="flex-shrink-0 mt-0.5">{icon !== undefined ? icon : <Clock className="h-3 w-3" />}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{event.message}</p>
        <p className="text-xs text-muted-foreground">{formatTime(event.createdAt)}</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AlertsCenterPage() {
  // ---------------------------------------------------------------------------
  // STORE SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  const alerts = useJobAlertsStore(selectAlerts);
  const emailDigest = useJobAlertsStore(selectEmailDigest);
  const events = useJobAlertsStore(selectEvents);
  const totalNewMatches = useJobAlertsStore(selectTotalNewMatches);
  const isAlertsLoaded = useJobAlertsStore(selectAlertsIsLoaded);
  const jobs = useJobSearchStore(selectJobs);
  const globalHide = useUserPreferencesStore(selectGlobalHide);

  // Store actions
  const loadFromStorage = useJobAlertsStore(function (s) { return s.loadFromStorage; });
  const setEmailDigestSettings = useJobAlertsStore(function (s) { return s.setEmailDigestSettings; });
  const setConsent = useJobAlertsStore(function (s) { return s.setConsent; });
  const runTestMatch = useJobAlertsStore(function (s) { return s.runTestMatch; });
  const getNewMatchesCount = useJobAlertsStore(function (s) { return s.getNewMatchesCount; });
  const markDigestSent = useJobAlertsStore(function (s) { return s.markDigestSent; });
  const addEvent = useJobAlertsStore(function (s) { return s.addEvent; });
  const clearEvents = useJobAlertsStore(function (s) { return s.clearEvents; });

  // ---------------------------------------------------------------------------
  // LOCAL STATE
  // ---------------------------------------------------------------------------
  const [runningAlertId, setRunningAlertId] = useState<string | null>(null);
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  const toast = useToast().toast;

  // ---------------------------------------------------------------------------
  // LOAD FROM STORAGE ON MOUNT
  // ---------------------------------------------------------------------------
  useEffect(function () {
    if (!isAlertsLoaded) {
      loadFromStorage();
    }
  }, [isAlertsLoaded, loadFromStorage]);

  // ---------------------------------------------------------------------------
  // BUILD MATCHABLE JOBS
  // ---------------------------------------------------------------------------
  const matchableJobs = useMemo(function () {
    return buildMatchableJobs(jobs);
  }, [jobs]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handles running a test match for an alert.
   */
  const handleRunTest = useCallback(function (alertId: string) {
    setRunningAlertId(alertId);

    // Use setTimeout to allow UI to update before running
    setTimeout(function () {
      const result = runTestMatch(alertId, matchableJobs);

      toast({
        title: 'Test Match Complete',
        description: result.allMatches + ' total match' + (result.allMatches === 1 ? '' : 'es') +
          ', ' + result.newMatches + ' new',
      });

      setRunningAlertId(null);
    }, 100);
  }, [matchableJobs, runTestMatch, toast]);

  /**
   * Handles email input change.
   */
  const handleEmailChange = useCallback(function (e: React.ChangeEvent<HTMLInputElement>) {
    setEmailDigestSettings({ email: e.target.value });
  }, [setEmailDigestSettings]);

  /**
   * Handles frequency change.
   */
  const handleFrequencyChange = useCallback(function (value: string) {
    if (value === 'daily' || value === 'weekly') {
      setEmailDigestSettings({ frequency: value });
    }
  }, [setEmailDigestSettings]);

  /**
   * Handles consent checkbox change.
   */
  const handleConsentChange = useCallback(function (checked: boolean) {
    setConsent(checked);
    if (checked) {
      setEmailDigestSettings({ enabled: true });
    }
  }, [setConsent, setEmailDigestSettings]);

  /**
   * Handles onlyWhenNew toggle.
   */
  const handleOnlyWhenNewChange = useCallback(function (checked: boolean) {
    setEmailDigestSettings({ onlyWhenNew: checked });
  }, [setEmailDigestSettings]);

  /**
   * Handles includeSalary toggle.
   */
  const handleIncludeSalaryChange = useCallback(function (checked: boolean) {
    setEmailDigestSettings({ includeSalary: checked });
  }, [setEmailDigestSettings]);

  /**
   * Handles includeLocation toggle.
   */
  const handleIncludeLocationChange = useCallback(function (checked: boolean) {
    setEmailDigestSettings({ includeLocation: checked });
  }, [setEmailDigestSettings]);

  /**
   * Generates digest preview.
   */
  const handleGeneratePreview = useCallback(function () {
    setIsGenerating(true);

    // Build job data for each alert
    const jobsByAlert: Record<string, DigestJobData[]> = {};
    const newJobIdsByAlert: Record<string, string[]> = {};

    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];
      if (!alert.enabled) {
        continue;
      }

      // Get jobs that match this alert
      const matchedJobs: DigestJobData[] = [];
      const matchedIdSet: Set<string> = new Set();
      for (let j = 0; j < alert.matches.length; j++) {
        matchedIdSet.add(alert.matches[j]);
      }

      for (let k = 0; k < jobs.length; k++) {
        const job = jobs[k];
        if (matchedIdSet.has(job.id)) {
          matchedJobs.push(jobToDigestData(job));
        }
      }

      jobsByAlert[alert.id] = matchedJobs;

      // Get new job IDs for this alert
      const newCount = getNewMatchesCount(alert.id);
      // For simplicity, we mark the first N matches as "new"
      // In a real implementation, we'd compare against seen jobs
      const newIds: string[] = [];
      for (let m = 0; m < alert.matches.length && newIds.length < newCount; m++) {
        newIds.push(alert.matches[m]);
      }
      newJobIdsByAlert[alert.id] = newIds;
    }

    const result = generateDigest({
      settings: emailDigest,
      alerts: alerts,
      jobsByAlert: jobsByAlert,
      newJobIdsByAlert: newJobIdsByAlert,
      globalPrivacyHide: globalHide,
      date: new Date(),
    });

    setDigestResult(result);
    setPreviewOpen(true);
    setIsGenerating(false);

    if (result.generated) {
      addEvent('DIGEST_GENERATED', 'Digest preview generated with ' + result.jobCount + ' jobs');
      toast({
        title: 'Digest Generated',
        description: result.jobCount + ' job' + (result.jobCount === 1 ? '' : 's') + ' included',
      });
    } else {
      toast({
        title: 'No Digest Generated',
        description: result.skipReason !== null ? result.skipReason : 'Unknown reason',
        variant: 'destructive',
      });
    }
  }, [alerts, jobs, emailDigest, globalHide, getNewMatchesCount, addEvent, toast]);

  /**
   * Handles sending test email via mailto:.
   */
  const handleSendTestEmail = useCallback(function () {
    if (digestResult === null || !digestResult.generated) {
      toast({
        title: 'No Digest',
        description: 'Generate a preview first',
        variant: 'destructive',
      });
      return;
    }

    const mailtoResult = buildMailtoUrl(
      emailDigest.email,
      digestResult.subject,
      digestResult.bodyText
    );

    if (mailtoResult.exceededMaxLength) {
      toast({
        title: 'Email Too Long',
        description: 'The digest is too long for mailto. Use copy buttons instead.',
        variant: 'destructive',
      });
      return;
    }

    // Open mailto: link
    window.open(mailtoResult.url, '_blank');
    markDigestSent();

    toast({
      title: 'Opening Email Client',
      description: 'Check your email client for the draft',
    });
  }, [digestResult, emailDigest.email, markDigestSent, toast]);

  /**
   * Copies subject to clipboard.
   */
  const handleCopySubject = useCallback(async function () {
    if (digestResult === null) {
      return;
    }

    const success = await copyToClipboard(digestResult.subject);
    if (success) {
      setCopiedSubject(true);
      setTimeout(function () { setCopiedSubject(false); }, 2000);
      toast({ title: 'Subject Copied' });
    } else {
      toast({ title: 'Copy Failed', variant: 'destructive' });
    }
  }, [digestResult, toast]);

  /**
   * Copies body to clipboard.
   */
  const handleCopyBody = useCallback(async function () {
    if (digestResult === null) {
      return;
    }

    const success = await copyToClipboard(digestResult.bodyText);
    if (success) {
      setCopiedBody(true);
      setTimeout(function () { setCopiedBody(false); }, 2000);
      toast({ title: 'Body Copied' });
    } else {
      toast({ title: 'Copy Failed', variant: 'destructive' });
    }
  }, [digestResult, toast]);

  /**
   * Clears the event log.
   */
  const handleClearEvents = useCallback(function () {
    clearEvents();
    toast({ title: 'Event Log Cleared' });
  }, [clearEvents, toast]);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------
  const hasConsent = emailDigest.consentAt !== null;
  const canSendEmail = hasConsent && emailDigest.email !== '' && digestResult !== null && digestResult.generated;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (!isAlertsLoaded) {
    return (
      <PageShell className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts Center</h1>
          <p className="text-muted-foreground">
            Manage your job alerts and email digest settings
          </p>
        </div>
        {totalNewMatches > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {totalNewMatches} new match{totalNewMatches === 1 ? '' : 'es'}
          </Badge>
        )}
      </div>

      {/* Alert Rules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Your Alerts
          </CardTitle>
          <CardDescription>
            {alerts.length} alert{alerts.length === 1 ? '' : 's'} configured.
            Run test matches to see which jobs match your criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alerts configured yet.</p>
              <p className="text-sm mt-2">
                Create an alert from the Job Search page to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(function (alert) {
                const newCount = getNewMatchesCount(alert.id);
                return (
                  <AlertRuleCard
                    key={alert.id}
                    alert={alert}
                    newMatchCount={newCount}
                    onRunTest={function () { handleRunTest(alert.id); }}
                    isRunning={runningAlertId === alert.id}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Digest Settings Section */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle className="text-lg">Email Digest Settings</CardTitle>
                </div>
                {settingsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CardDescription>
              Configure how you want to receive email digests of your job matches.
              Note: In Tier 1, emails are composed locally and opened in your email client.
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="digest-email">Email Address</Label>
                <Input
                  id="digest-email"
                  type="email"
                  placeholder="your@email.com"
                  value={emailDigest.email}
                  onChange={handleEmailChange}
                />
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor="digest-frequency">Frequency</Label>
                <Select value={emailDigest.frequency} onValueChange={handleFrequencyChange}>
                  <SelectTrigger id="digest-frequency" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Only send when new matches</Label>
                    <p className="text-sm text-muted-foreground">
                      Skip digest if there are no new jobs
                    </p>
                  </div>
                  <Switch
                    checked={emailDigest.onlyWhenNew}
                    onCheckedChange={handleOnlyWhenNewChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include salary info</Label>
                    <p className="text-sm text-muted-foreground">
                      Add salary ranges to the digest
                    </p>
                  </div>
                  <Switch
                    checked={emailDigest.includeSalary}
                    onCheckedChange={handleIncludeSalaryChange}
                    disabled={globalHide}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include location</Label>
                    <p className="text-sm text-muted-foreground">
                      Add location details to the digest
                    </p>
                  </div>
                  <Switch
                    checked={emailDigest.includeLocation}
                    onCheckedChange={handleIncludeLocationChange}
                    disabled={globalHide}
                  />
                </div>

                {globalHide && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Global privacy mode is enabled. Salary and location will be redacted.
                    </span>
                  </div>
                )}
              </div>

              {/* Consent */}
              <div className="border-t pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="digest-consent"
                    checked={hasConsent}
                    onCheckedChange={handleConsentChange}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="digest-consent" className="cursor-pointer">
                      I consent to email digest generation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      I understand that PathOS Tier 1 is local-only. Digests are composed on my
                      device and opened in my email client via mailto: link. No emails are sent
                      automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Preview Button */}
              <div className="flex items-center gap-4 pt-2">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={alerts.length === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Generate Digest Preview
                </Button>

                {emailDigest.lastDigestAt !== null && (
                  <p className="text-sm text-muted-foreground">
                    Last digest: {formatTime(emailDigest.lastDigestAt)}
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Digest Preview Section */}
      <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <CardTitle className="text-lg">Digest Preview</CardTitle>
                  {digestResult !== null && digestResult.generated && (
                    <Badge variant="outline">{digestResult.jobCount} jobs</Badge>
                  )}
                </div>
                {previewOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {digestResult === null ? (
                <p className="text-muted-foreground text-center py-8">
                  Click &quot;Generate Digest Preview&quot; to see your digest.
                </p>
              ) : !digestResult.generated ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                  <p className="text-muted-foreground">{digestResult.skipReason}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Subject */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Subject</Label>
                      <Button variant="ghost" size="sm" onClick={handleCopySubject}>
                        {copiedSubject ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                      {digestResult.subject}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Body</Label>
                      <Button variant="ghost" size="sm" onClick={handleCopyBody}>
                        {copiedBody ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {digestResult.bodyText}
                    </pre>
                  </div>

                  {/* Send Button */}
                  <div className="flex items-center gap-4 pt-4">
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={!canSendEmail}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </Button>
                    {!hasConsent && (
                      <p className="text-sm text-muted-foreground">
                        Check consent box to enable sending
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Event Log Section */}
      <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle className="text-lg">Event Log</CardTitle>
                  {events.length > 0 && (
                    <Badge variant="secondary">{events.length}</Badge>
                  )}
                </div>
                {eventsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No events yet. Run a test match or generate a digest to see activity.
                </p>
              ) : (
                <div className="space-y-0">
                  <div className="max-h-64 overflow-y-auto">
                    {events.map(function (event) {
                      return <EventLogEntry key={event.id} event={event} />;
                    })}
                  </div>
                  <div className="pt-4 border-t mt-4">
                    <Button variant="outline" size="sm" onClick={handleClearEvents}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Log
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </PageShell>
  );
}
