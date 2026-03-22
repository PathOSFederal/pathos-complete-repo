/**
 * ============================================================================
 * DESKTOP SHELL WINDOW TYPES (Day 45)
 * ============================================================================
 *
 * PURPOSE:
 * Provide TypeScript typings for the Electron preload bridge exposed on window.
 *
 * WHY THIS FILE EXISTS:
 * - Keeps renderer calls strongly typed.
 * - Prevents accidental use of non-whitelisted IPC methods.
 * ============================================================================
 */

export {};

declare global {
  interface Window {
    pathosDesktop?: {
      /**
       * Minimal "are you there" check for the preload bridge.
       */
      ping: () => Promise<{ ok: boolean; ts: number }>;
      /**
       * Ask the Electron main process to attach the USAJOBS BrowserView.
       */
      loadUsajobs: () => Promise<{ ok: boolean; message?: string }>;
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
  }
}
