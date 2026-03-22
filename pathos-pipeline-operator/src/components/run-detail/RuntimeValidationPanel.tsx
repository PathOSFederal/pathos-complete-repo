'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CommitScopeData,
  PipelineCommandResult,
  RuntimeValidationAnalysis,
  RuntimeValidationAutomation,
} from '@/lib/types';
import { ActionResultPanel } from '@/components/actions/ActionResultPanel';
import { PanelActionFeedback, createActionFeedback, focusPanel, type ActionFeedbackState } from '@/components/run-detail/action-feedback';

interface RuntimeValidationPanelProps {
  runId: string;
  artifactPath: string;
  initialContent: string | null;
  exists: boolean;
  runtimeAnalysis: RuntimeValidationAnalysis;
  runtimeAutomation: RuntimeValidationAutomation;
  runtimeMode: string | null;
  runStatus: string | null;
  branch: string | null;
  repo: string;
  flowType: string;
  taskTitle: string | null;
  taskSpecContent: string | null;
  commitScope: CommitScopeData;
}

type RuntimeValues = {
  feature: string;
  outcome: string;
  environment: string;
  branch: string;
  repo: string;
  buildVersion: string;
  date: string;
  expectedResult: string;
  regressionSurface: string;
  observedResult: string;
  summary: string;
  notes: string;
  decision: 'PASS' | 'FAIL' | 'PASS WITH KNOWN RISKS';
};

const today = new Date().toISOString().slice(0, 10);

function firstHeading(content: string | null): string | null {
  return content
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('# '))
    ?.replace(/^#\s*/, '')
    .trim() ?? null;
}

function firstNonHeadingParagraph(content: string | null): string | null {
  if (!content) return null;
  return (
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*')) ?? null
  );
}

function collectAcceptanceBullets(content: string | null): string[] {
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('*'))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function deriveDefaults(args: {
  taskTitle: string | null;
  taskSpecContent: string | null;
  repo: string;
  flowType: string;
  branch: string | null;
  commitScope: CommitScopeData;
  runtimeAutomation: RuntimeValidationAutomation;
}): RuntimeValues {
  const feature = args.taskTitle ?? firstHeading(args.taskSpecContent) ?? 'Runtime validation target';
  const outcome =
    firstNonHeadingParagraph(args.taskSpecContent) ??
    `Validate the intended ${args.flowType} outcome in ${args.repo}.`;
  const acceptance = collectAcceptanceBullets(args.taskSpecContent);
  const expectedResult =
    acceptance.length > 0
      ? acceptance.join(' ')
      : `The change for "${feature}" behaves as intended without breaking the main user flow.`;
  const regressionSurface =
    args.commitScope.changedFiles.length > 0
      ? args.commitScope.changedFiles.slice(0, 4).map((file) => file.path).join(', ')
      : args.runtimeAutomation.targetIds.length > 0
      ? args.runtimeAutomation.targetIds.join(', ')
      : `Primary ${args.flowType} route in ${args.repo}`;
  const buildVersion =
    args.runtimeAutomation.command
      ? `Automated runtime validation via ${args.runtimeAutomation.command}`
      : args.branch
      ? `Branch ${args.branch}`
      : `${args.repo} ${args.flowType} run`;

  return {
    feature,
    outcome,
    environment: `${args.repo} / ${args.flowType} / operator runtime validation`,
    branch: args.branch ?? 'not set',
    repo: args.repo,
    buildVersion,
    date: today,
    expectedResult,
    regressionSurface,
    observedResult: '',
    summary: `${feature} matched the expected runtime behavior.`,
    notes: '',
    decision: 'PASS',
  };
}

function buildRuntimeValidationMarkdown(values: RuntimeValues): string {
  return `# Runtime Validation

## What Was Validated
- Feature: ${values.feature}
- Intended User Outcome: ${values.outcome}
- Environment: ${values.environment}
- Branch: ${values.branch}
- Repo: ${values.repo}
- Build / Version Context: ${values.buildVersion}
- Date: ${values.date}

## Expected Result
${values.expectedResult}

## Suggested Regression Surface
${values.regressionSurface}

## Observed Result
${values.observedResult}

## Decision
- Status: ${values.decision}
- Summary: ${values.summary}
- Notes: ${values.notes || 'None.'}
`;
}

function parseRuntimeValidationMarkdown(content: string | null): Partial<RuntimeValues> | null {
  if (!content) return null;
  const extract = (pattern: RegExp) => content.match(pattern)?.[1]?.trim() ?? '';

  if (content.includes('## What Was Validated')) {
    return {
      feature: extract(/- Feature:\s*(.*)/),
      outcome: extract(/- Intended User Outcome:\s*(.*)/),
      environment: extract(/- Environment:\s*(.*)/),
      branch: extract(/- Branch:\s*(.*)/),
      repo: extract(/- Repo:\s*(.*)/),
      buildVersion: extract(/- Build \/ Version Context:\s*(.*)/),
      date: extract(/- Date:\s*(.*)/),
      expectedResult: extract(/## Expected Result\s+([\s\S]*?)\s+## Suggested Regression Surface/),
      regressionSurface: extract(/## Suggested Regression Surface\s+([\s\S]*?)\s+## Observed Result/),
      observedResult: extract(/## Observed Result\s+([\s\S]*?)\s+## Decision/),
      decision: (extract(/- Status:\s*(PASS WITH KNOWN RISKS|PASS|FAIL)/) as RuntimeValues['decision']) || 'PASS',
      summary: extract(/- Summary:\s*(.*)/),
      notes: extract(/- Notes:\s*(.*)/),
    };
  }

  return {
    feature: extract(/## Feature\s+([\s\S]*?)\s+## Intended User Outcome/),
    outcome: extract(/## Intended User Outcome\s+([\s\S]*?)\s+## Validation Context/),
    environment: extract(/- Environment:\s*(.*)/),
    branch: extract(/- Branch:\s*(.*)/),
    buildVersion: extract(/- Build\/version:\s*(.*)/),
    date: extract(/- Date:\s*(.*)/),
    expectedResult: extract(/- Expected Result:\s*(.*)/),
    regressionSurface: extract(/### Surface 1\s+- Why checked:\s*(.*)/),
    observedResult: extract(/## Primary Flow Proof[\s\S]*?- Observed Result:\s*(.*)/),
    decision: (extract(/- Decision:\s*(PASS WITH KNOWN RISKS|PASS|FAIL)/) as RuntimeValues['decision']) || 'PASS',
    summary: extract(/- Notes:\s*(.*)/),
    notes: extract(/## Open Risks \/ Known Non-Goals\s+-\s*(.*)/),
  };
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#1e2430] bg-[#161b22] p-3">
      <div className="text-[11px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

export function RuntimeValidationPanel({
  runId,
  artifactPath,
  initialContent,
  exists,
  runtimeAnalysis,
  runtimeAutomation,
  runtimeMode,
  runStatus,
  branch,
  repo,
  flowType,
  taskTitle,
  taskSpecContent,
  commitScope,
}: RuntimeValidationPanelProps) {
  const router = useRouter();
  const defaults = useMemo(
    () =>
      deriveDefaults({
        taskTitle,
        taskSpecContent,
        repo,
        flowType,
        branch,
        commitScope,
        runtimeAutomation,
      }),
    [branch, commitScope, flowType, repo, runtimeAutomation, taskSpecContent, taskTitle]
  );
  const [values, setValues] = useState<RuntimeValues>(defaults);
  const [status, setStatus] = useState<string | null>(initialContent ? 'Existing runtime-validation.md detected.' : null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineCommandResult | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  useEffect(() => {
    const parsed = parseRuntimeValidationMarkdown(initialContent);
    setValues({ ...defaults, ...parsed });
  }, [defaults, initialContent]);

  const markdown = useMemo(() => buildRuntimeValidationMarkdown(values), [values]);
  const localBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!values.observedResult.trim()) blockers.push('observedResult');
    if (!values.summary.trim()) blockers.push('summary');
    return blockers;
  }, [values.observedResult, values.summary]);
  const combinedBlockers = useMemo(() => {
    const blockers = [...runtimeAnalysis.placeholderFields, ...runtimeAnalysis.missingSections, ...localBlockers];
    return [...new Set(blockers)];
  }, [localBlockers, runtimeAnalysis.missingSections, runtimeAnalysis.placeholderFields]);
  const canConfirmPass = combinedBlockers.length === 0;
  const runtimeAlreadyInProgress = runStatus === 'runtime_validation_in_progress';
  const runtimeAutoStarted =
    runtimeAlreadyInProgress ||
    Boolean(runtimeMode && runtimeMode.startsWith('playwright_route_shell_')) ||
    runtimeAutomation.exists ||
    runtimeAutomation.status === 'passed' ||
    runtimeAutomation.status === 'failed';

  async function saveArtifact(nextValues: RuntimeValues = values) {
    setIsSaving(true);
    setError(null);
    setStatus(null);
    setFeedback(null);
    try {
      const response = await fetch(`/api/runs/${runId}/runtime-validation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: buildRuntimeValidationMarkdown(nextValues) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Unable to save runtime validation artifact.');
        setFeedback(createActionFeedback('save-runtime-validation', false, data?.error ?? 'Unable to save runtime validation artifact.'));
        return false;
      }
      setStatus(`Saved runtime-validation.md at ${data.updatedAt ?? 'now'}.`);
      setFeedback(createActionFeedback('save-runtime-validation', true, 'Runtime validation notes were saved for this run.'));
      router.refresh();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save runtime validation artifact.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function runAction(action: 'runtime-start' | 'runtime-done' | 'runtime-fail') {
    const nextValues =
      action === 'runtime-fail'
        ? { ...values, decision: 'FAIL' as const }
        : action === 'runtime-done'
        ? { ...values, decision: values.decision === 'FAIL' ? 'PASS' : values.decision }
        : values;
    setValues(nextValues);
    setActiveAction(action);
    setError(null);
    setStatus(null);
    setResult(null);
    setFeedback(null);

    try {
      if (action !== 'runtime-start') {
        const saved = await saveArtifact(nextValues);
        if (!saved) return;
      }
      if (action === 'runtime-done' && !canConfirmPass) {
        setError(`Runtime validation is still blocked by: ${combinedBlockers.join(', ')}`);
        return;
      }

      const response = await fetch('/api/pipeline/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: { runId } }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? data?.stderr ?? `${action} failed.`);
        if (data?.command) setResult(data as PipelineCommandResult);
        setFeedback(createActionFeedback(action, false, data?.error ?? data?.stderr ?? `${action} failed.`));
        return;
      }
      setResult(data as PipelineCommandResult);
      router.refresh();
      if (action === 'runtime-done') focusPanel('run-actions-panel');
      setFeedback(
        createActionFeedback(
          action,
          true,
          action === 'runtime-start'
            ? 'Runtime validation started for this run.'
            : action === 'runtime-done'
            ? 'Runtime validation passed and the run advanced to Codex hardening.'
            : 'Runtime failure was recorded for this run.'
        )
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${action} failed.`);
      setFeedback(createActionFeedback(action, false, actionError instanceof Error ? actionError.message : `${action} failed.`));
    } finally {
      setActiveAction(null);
    }
  }

  function updateField<Key extends keyof RuntimeValues>(key: Key, value: RuntimeValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div id="runtime-validation-panel" className="space-y-4">
      <div className="rounded-lg border border-[#1e2430] bg-[#0f1117] p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Runtime Validation</h3>
            <p className="mt-1 text-xs text-slate-500">
              Review the pre-filled runtime context, confirm the observed result, then record pass or fail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveArtifact()}
              disabled={!exists || isSaving || activeAction !== null}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:bg-blue-900"
            >
              {isSaving ? 'Saving…' : 'Save Runtime Validation'}
            </button>
            {!runtimeAutoStarted && (
              <button
                type="button"
                onClick={() => void runAction('runtime-start')}
                disabled={activeAction !== null}
                className="rounded-md bg-slate-700 px-4 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:bg-slate-800"
              >
                {activeAction === 'runtime-start' ? 'Starting…' : 'Start Runtime Validation'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void runAction('runtime-done')}
              disabled={activeAction !== null || !canConfirmPass}
              className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-500 disabled:bg-green-900"
            >
              {activeAction === 'runtime-done' ? 'Recording…' : 'Confirm Pass'}
            </button>
            <button
              type="button"
              onClick={() => void runAction('runtime-fail')}
              disabled={activeAction !== null}
              className="rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:bg-red-900"
            >
              {activeAction === 'runtime-fail' ? 'Recording…' : 'Mark Fail'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <InfoField label="Feature" value={values.feature} />
          <InfoField label="Intended User Outcome" value={values.outcome} />
          <InfoField label="Expected Result" value={values.expectedResult} />
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          <InfoField label="Environment" value={values.environment} />
          <InfoField label="Branch" value={values.branch} />
          <InfoField label="Repo" value={values.repo} />
          <InfoField label="Build / Version" value={values.buildVersion} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.4fr,1fr]">
          <InfoField label="Suggested Regression Surface" value={values.regressionSurface} />
          <InfoField label="Date" value={values.date} />
        </div>

        <PanelActionFeedback
          feedback={feedback}
          activeLabel={activeAction === 'runtime-start' ? 'Starting runtime validation…' : activeAction === 'runtime-done' ? 'Recording runtime pass…' : activeAction === 'runtime-fail' ? 'Recording runtime failure…' : isSaving ? 'Saving runtime validation artifact…' : null}
        />

        {runtimeAutomation.message && (
          <div
            className={`rounded border p-3 text-xs ${
              runtimeAutomation.status === 'failed'
                ? 'border-red-800/40 bg-red-900/20 text-red-300'
                : runtimeAutomation.status === 'not_supported' || runtimeAutomation.status === 'unavailable'
                ? 'border-amber-800/40 bg-amber-900/20 text-amber-300'
                : 'border-blue-800/40 bg-blue-900/20 text-blue-300'
            }`}
          >
            <div className="font-medium">
              {runtimeAutomation.status === 'passed'
                ? 'Automated runtime validation is already in progress or complete.'
                : runtimeAutomation.status === 'failed'
                ? 'Automated runtime validation reported a failure.'
                : 'Runtime automation status.'}
            </div>
            <div className="mt-1">{runtimeAutomation.message}</div>
            {runtimeAutomation.resultPath && <div className="mt-2 text-current/80">Result artifact: {runtimeAutomation.resultPath}</div>}
          </div>
        )}

        {!runtimeAutomation.exists && runtimeAlreadyInProgress && (
          <div className="rounded border border-amber-800/40 bg-amber-900/20 p-3 text-xs text-amber-300">
            Runtime validation is already in progress, but no Playwright result artifact was detected yet. The system is waiting for manual confirmation or a later automation result.
          </div>
        )}

        {!runtimeAutomation.exists && !runtimeAlreadyInProgress && (
          <div className="rounded border border-[#1e2430] bg-[#161b22] p-3 text-xs text-slate-300">
            No Playwright runtime result is present yet. Start runtime validation only if you want the pipeline to attempt automation for this run; otherwise use the pre-filled confirmation fields below.
          </div>
        )}

        {combinedBlockers.length > 0 && (
          <div className="rounded border border-amber-800/40 bg-amber-900/20 p-3 text-xs text-amber-300">
            Pass is blocked until these fields are confirmed: {combinedBlockers.join(', ')}
          </div>
        )}
        {error && <div className="rounded border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">{error}</div>}
        {status && <div className="rounded border border-green-800/40 bg-green-900/20 p-3 text-xs text-green-300">{status}</div>}

        <label className="block">
          <div className="mb-1 text-xs text-slate-400">Observed Result</div>
          <textarea
            value={values.observedResult}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField('observedResult', event.target.value)}
            rows={5}
            className="w-full rounded border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            placeholder="Describe what actually happened when you validated the runtime behavior."
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-xs text-slate-400">Suggested Pass Summary</div>
            <input
              value={values.summary}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateField('summary', event.target.value)}
              className="w-full rounded border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-slate-400">Decision</div>
            <select
              value={values.decision}
              onChange={(event) => updateField('decision', event.target.value as RuntimeValues['decision'])}
              className="w-full rounded border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="PASS">PASS</option>
              <option value="PASS WITH KNOWN RISKS">PASS WITH KNOWN RISKS</option>
              <option value="FAIL">FAIL</option>
            </select>
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-xs text-slate-400">Optional Notes</div>
          <textarea
            value={values.notes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField('notes', event.target.value)}
            rows={3}
            className="w-full rounded border border-[#1e2430] bg-[#161b22] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            placeholder="Optional runtime note, blocker detail, or follow-up."
          />
        </label>

        <details className="rounded border border-[#1e2430] bg-[#161b22] p-3">
          <summary className="cursor-pointer text-xs text-slate-300">Preview generated `runtime-validation.md`</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{markdown}</pre>
        </details>

        <div className="text-[11px] text-slate-500">Artifact path: {artifactPath}</div>
      </div>

      <ActionResultPanel result={result} error={null} title="Runtime Validation Result" />
    </div>
  );
}
