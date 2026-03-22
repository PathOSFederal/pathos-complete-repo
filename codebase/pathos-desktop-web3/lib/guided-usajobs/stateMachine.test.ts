/**
 * ============================================================================
 * GUIDED USAJOBS STATE MACHINE TESTS (Day 44)
 * ============================================================================
 *
 * Verifies explicit state transitions for Guided USAJOBS click-to-explain.
 */

import { describe, it, expect } from 'vitest';
import { getGuidedUsaJobsNextState } from './stateMachine';

describe('getGuidedUsaJobsNextState', function () {
  it('should move from IDLE to ARMED on ARM', function () {
    const result = getGuidedUsaJobsNextState('IDLE', 'ARM');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('ARMED');
  });

  it('should move from ARMED to CAPTURING on START_CAPTURE', function () {
    const result = getGuidedUsaJobsNextState('ARMED', 'START_CAPTURE');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('CAPTURING');
  });

  it('should move from CAPTURING to SELECTING on START_SELECTING', function () {
    const result = getGuidedUsaJobsNextState('CAPTURING', 'START_SELECTING');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('SELECTING');
  });

  it('should move from SELECTING to CAPTURED on CAPTURE_REGION', function () {
    const result = getGuidedUsaJobsNextState('SELECTING', 'CAPTURE_REGION');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('CAPTURED');
  });

  it('should move from CAPTURED to ANALYZING on START_ANALYSIS', function () {
    const result = getGuidedUsaJobsNextState('CAPTURED', 'START_ANALYSIS');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('ANALYZING');
  });

  it('should move from ANALYZING to RESPONDING on RENDER_RESPONSE', function () {
    const result = getGuidedUsaJobsNextState('ANALYZING', 'RENDER_RESPONSE');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('RESPONDING');
  });

  it('should move from RESPONDING to COMPLETE on COMPLETE', function () {
    const result = getGuidedUsaJobsNextState('RESPONDING', 'COMPLETE');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('COMPLETE');
  });

  it('should allow re-arming from COMPLETE', function () {
    const result = getGuidedUsaJobsNextState('COMPLETE', 'ARM');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('ARMED');
  });

  it('should allow re-arming from ERROR', function () {
    const result = getGuidedUsaJobsNextState('ERROR', 'ARM');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('ARMED');
  });

  it('should always return to IDLE on DISARM', function () {
    const result = getGuidedUsaJobsNextState('ANALYZING', 'DISARM');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('IDLE');
  });

  it('should move to ERROR on CAPTURE_FAILED', function () {
    const result = getGuidedUsaJobsNextState('CAPTURING', 'CAPTURE_FAILED');
    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe('ERROR');
  });

  it('should reject invalid transitions', function () {
    const result = getGuidedUsaJobsNextState('IDLE', 'START_SELECTING');
    expect(result.allowed).toBe(false);
    expect(result.nextState).toBe('IDLE');
  });
});
