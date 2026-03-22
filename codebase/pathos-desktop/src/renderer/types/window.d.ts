export {};

// ===============================================================
// WHY: Renderer TypeScript needs safe typings for preload-exposed
//      globals so UI code stays explicit about trust boundaries.
// HOW: Declare the narrow `window.pathosBackend` IPC contract here.
// ===============================================================

interface PathosAuditRecord {
  trace_id: string;
  created_at: string;
  recommendation?: string;
  confidence_band?: string;
  job_title?: string;
  company?: string;
}

interface PathosDesktopInfo {
  version: string;
  env: string;
  authRequired: boolean;
  baseUrl: string;
  serverTime: string;
}

interface PathosBackendError {
  status: number;
  code: string;
  message: string;
  requestId: string;
}

interface PathosBackendOkResult<T> {
  ok: true;
  data: T;
}

interface PathosBackendErrorResult {
  ok: false;
  error: PathosBackendError;
}

type PathosBackendResult<T> = PathosBackendOkResult<T> | PathosBackendErrorResult;

interface PathosJobSearchPayload {
  keyword: string;
  location?: string;
  remote_only?: boolean;
  page?: number;
  page_size?: number;
}

interface PathosBackendApi {
  health(): Promise<PathosBackendResult<unknown>>;
  desktopInfo(): Promise<PathosBackendResult<PathosDesktopInfo>>;
  auditRecent(limit: number): Promise<PathosBackendResult<PathosAuditRecord[]>>;
  threadRecent(limit: number): Promise<PathosBackendResult<unknown>>;
  searchJobs(payload: PathosJobSearchPayload): Promise<PathosBackendResult<unknown>>;
}

declare global {
  interface Window {
    [key: string]: any;
    __PATHOS_RENDERER_READY__?: boolean;
    PathOSRendererDiagnostics?: any;
    PathOSUsaJobsHelpers?: any;
    PathAdvisorConversationStore?: any;
    PathOSResumeCareerStore?: any;
    PathOSActiveJobContext?: any;
    PathOSBenefitsTools?: any;
    PathOSExplorePathos?: any;
    PathOSEmbeddedBar?: any;
    PathOSFocusMode?: any;
    workbench?: any;
    workbenchViewport?: any;
    benefitsToolViewport?: any;
    benefitsPopout?: any;
    alertsPopover?: any;
    usajobsStatus?: any;
    usajobsControls?: any;
    advisorOwner?: any;
    pathadvisorWindows?: any;
    pathadvisorDrafts?: any;
    pathadvisorThreads?: any;
    pathosBackend?: PathosBackendApi;
  }
}
