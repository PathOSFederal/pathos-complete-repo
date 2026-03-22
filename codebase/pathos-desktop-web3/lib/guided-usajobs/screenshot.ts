/**
 * ============================================================================
 * GUIDED USAJOBS SCREENSHOT HELPERS (Day 44)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Capture an ephemeral, local-only screenshot for the selected region.
 * This respects the USAJOBS trust boundary by never reading the DOM and
 * never persisting the image to storage.
 *
 * IMPORTANT:
 * - Screen capture must be user-initiated via getDisplayMedia.
 * - No DOM access or persistence, ever.
 *
 * @version Day 44 - Guided USAJOBS Click-to-Explain v1
 * ============================================================================
 */

import type { GuidedUsaJobsRegion } from '@/lib/guided-usajobs/types';

/**
 * Result of a screenshot capture attempt.
 */
export interface GuidedUsaJobsScreenshotResult {
  dataUrl: string;
  wasBlocked: boolean;
}

interface GuidedUsaJobsCaptureParams {
  region: GuidedUsaJobsRegion;
  video: HTMLVideoElement | null;
  maxDimension: number;
}

/**
 * Capture a local screenshot for the selected region.
 *
 * NOTE:
 * If video capture is unavailable, we fall back to a placeholder image that
 * explicitly signals missing pixels.
 */
export async function captureGuidedUsaJobsScreenshot(
  params: GuidedUsaJobsCaptureParams,
): Promise<GuidedUsaJobsScreenshotResult> {
  if (!params.video) {
    return {
      dataUrl: buildPlaceholderImage(params.region, true),
      wasBlocked: true,
    };
  }

  try {
    const video = params.video;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;

    if (videoWidth === 0 || videoHeight === 0 || displayWidth === 0 || displayHeight === 0) {
      return {
        dataUrl: buildPlaceholderImage(params.region, true),
        wasBlocked: true,
      };
    }

    const scaleX = videoWidth / displayWidth;
    const scaleY = videoHeight / displayHeight;

    const region = params.region;
    const sourceX = Math.max(0, Math.floor(region.x * scaleX));
    const sourceY = Math.max(0, Math.floor(region.y * scaleY));
    const sourceWidth = Math.max(1, Math.floor(region.width * scaleX));
    const sourceHeight = Math.max(1, Math.floor(region.height * scaleY));

    const maxDimension = Math.max(1, params.maxDimension);
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.floor(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.floor(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        dataUrl: buildPlaceholderImage(params.region, true),
        wasBlocked: true,
      };
    }

    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    return {
      dataUrl: canvas.toDataURL('image/png'),
      wasBlocked: false,
    };
  } catch (error) {
    console.error('[guided-usajobs] Screenshot capture failed:', error);
    return {
      dataUrl: buildPlaceholderImage(params.region, true),
      wasBlocked: true,
    };
  }
}

/**
 * Build a placeholder image when pixel capture is blocked.
 */
function buildPlaceholderImage(region: GuidedUsaJobsRegion, blocked: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(region.width));
  canvas.height = Math.max(1, Math.floor(region.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px sans-serif';
  ctx.fillText('Guided USAJOBS capture', 8, 18);

  if (blocked) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Pixel capture blocked by browser', 8, 36);
  }

  ctx.fillStyle = '#94a3b8';
  ctx.fillText(
    'Region: ' + Math.round(region.width) + ' x ' + Math.round(region.height),
    8,
    54,
  );

  return canvas.toDataURL('image/png');
}
