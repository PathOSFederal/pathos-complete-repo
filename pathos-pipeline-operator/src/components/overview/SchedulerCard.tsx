import { Clock, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import type { ServiceState, SchedulerLock } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';

interface SchedulerCardProps {
  serviceState: ServiceState | null;
  schedulerLocked: boolean;
  schedulerLock: SchedulerLock | null;
}

export function SchedulerCard({ serviceState, schedulerLocked, schedulerLock }: SchedulerCardProps) {
  const serviceStatus = serviceState?.status ?? 'unknown';
  const isRunning = serviceStatus === 'running';
  const isClean = serviceStatus === 'stopped_clean';
  const isLocked = schedulerLocked;

  return (
    <div className="bg-[#0f1117] border border-[#1e2430] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-200">Scheduler / Service</h3>
        </div>
        {isRunning ? (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Running
          </span>
        ) : isClean ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle className="w-3 h-3" />
            Stopped clean
          </span>
        ) : (
          <span className="text-xs text-slate-500">{serviceStatus}</span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {serviceState && (
          <>
            {serviceState.run_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Last run</span>
                <span className="mono text-slate-300">{serviceState.run_id}</span>
              </div>
            )}
            {serviceState.last_update_at && (
              <div className="flex justify-between">
                <span className="text-slate-500">Last update</span>
                <span className="text-slate-400">{formatRelativeTime(serviceState.last_update_at)}</span>
              </div>
            )}
            {serviceState.last_exit_code !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500">Exit code</span>
                <span className={serviceState.last_exit_code === 0 ? 'text-green-400' : 'text-red-400'}>
                  {serviceState.last_exit_code}
                </span>
              </div>
            )}
          </>
        )}

        {/* Scheduler lock */}
        <div className="pt-2 border-t border-[#1e2430]">
          {isLocked ? (
            <div className="flex items-center gap-2 text-amber-400">
              <Lock className="w-3 h-3 shrink-0" />
              <span>
                Scheduler locked
                {schedulerLock?.run_id && (
                  <span className="text-amber-500/80"> · {schedulerLock.run_id}</span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle className="w-3 h-3 shrink-0" />
              <span>No scheduler lock</span>
            </div>
          )}
        </div>

        {/* Stale lock warning */}
        {isLocked && schedulerLock?.acquired_at && (
          <div className="flex items-start gap-2 p-2 bg-amber-900/20 border border-amber-800/30 rounded text-amber-400">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <div>
              <div>Locked {formatRelativeTime(schedulerLock.acquired_at)}</div>
              <div className="text-amber-500/70 mt-0.5">
                Run <code className="mono">pp scheduler-unlock -IfStale</code> if stale
              </div>
            </div>
          </div>
        )}

        {!serviceState && (
          <div className="text-slate-600 italic">
            Service state unavailable. No scheduler values are shown unless real log/state files exist.
          </div>
        )}
      </div>
    </div>
  );
}
