/**
 * Pure joint-angle rep-counting state machine.
 *
 * The native PoseModule (CameraX + ML Kit) feeds one joint angle per frame —
 * e.g. knee angle for squats, elbow angle for push-ups — and this machine
 * decides when a full, honest rep happened. No React Native imports: this file
 * is unit-tested with vitest and also mirrors the logic the Kotlin bridge
 * applies before emitting `onRepCounted`.
 *
 * A rep counts only when ALL of these hold:
 *  1. Range: the angle travelled from above `upThresholdDeg` to below
 *     `downThresholdDeg` and back (a partial dip never counts).
 *  2. Tempo: the whole cycle took between `minRepMs` and `maxRepMs`.
 *     Faster = shaking/cheating, slower = stale (user rested mid-rep).
 *  3. Order: phases must progress up → descending → down → ascending → up.
 */

import type { ExerciseType } from '../types';

export interface RepCounterConfig {
  exercise: ExerciseType;
  /** Angle (deg) at or below which the "bottom" of the rep is reached. */
  downThresholdDeg: number;
  /** Angle (deg) at or above which the "top" (full extension) is reached. */
  upThresholdDeg: number;
  /** Fastest believable rep — anything quicker is rejected as cheating. */
  minRepMs: number;
  /** Slowest believable rep — anything slower resets the cycle as stale. */
  maxRepMs: number;
}

export type RepPhase = 'up' | 'descending' | 'down' | 'ascending';

export interface RepCounterSnapshot {
  phase: RepPhase;
  reps: number;
}

export interface FeedResult {
  /** True when this sample completed a valid rep. */
  counted: boolean;
  snapshot: RepCounterSnapshot;
}

/**
 * Per-exercise configs. Angles are illustrative defaults tuned during
 * pose testing (plan page 12: "a counter that misses real reps at 6 a.m.
 * is uninstalled by day three") — calibrate per exercise in practice mode.
 */
export const EXERCISE_COUNTER_CONFIGS: Record<
  Exclude<ExerciseType, 'steps'>,
  RepCounterConfig
> = {
  squats: {
    exercise: 'squats',
    downThresholdDeg: 100, // hips below knee line ≈ knee angle < 100°
    upThresholdDeg: 160, // standing ≈ knee angle > 160°
    minRepMs: 600,
    maxRepMs: 6000,
  },
  pushups: {
    exercise: 'pushups',
    downThresholdDeg: 100, // deep dip ≈ elbow angle < 100°
    upThresholdDeg: 160, // full extension ≈ elbow angle > 160°
    minRepMs: 500,
    maxRepMs: 6000,
  },
  jumping_jacks: {
    exercise: 'jumping_jacks',
    downThresholdDeg: 40, // arms down ≈ shoulder abduction < 40°
    upThresholdDeg: 140, // arms overhead ≈ > 140°
    minRepMs: 400,
    maxRepMs: 4000,
  },
  situps: {
    exercise: 'situps',
    downThresholdDeg: 70, // torso curled ≈ hip angle < 70°
    upThresholdDeg: 150, // lying back ≈ hip angle > 150°
    minRepMs: 700,
    maxRepMs: 8000,
  },
};

export class RepCounter {
  private phase: RepPhase = 'up';
  private reps = 0;
  private cycleStartMs: number | null = null;

  constructor(private readonly config: RepCounterConfig) {
    if (config.downThresholdDeg >= config.upThresholdDeg) {
      throw new Error('RepCounter: downThresholdDeg must be < upThresholdDeg');
    }
    if (config.minRepMs >= config.maxRepMs) {
      throw new Error('RepCounter: minRepMs must be < maxRepMs');
    }
  }

  get snapshot(): RepCounterSnapshot {
    return { phase: this.phase, reps: this.reps };
  }

  reset(): void {
    this.phase = 'up';
    this.reps = 0;
    this.cycleStartMs = null;
  }

  /**
   * Feed one joint-angle sample. Returns whether a rep was counted.
   * Invalid samples (NaN, negative) are ignored without state change.
   */
  feed(angleDeg: number, nowMs: number): FeedResult {
    if (!Number.isFinite(angleDeg) || angleDeg < 0) {
      return { counted: false, snapshot: this.snapshot };
    }

    const { downThresholdDeg, upThresholdDeg, minRepMs, maxRepMs } = this.config;

    // Stale-cycle guard: a rep that takes too long is abandoned, not banked.
    // The stale sample itself is discarded — after seconds of no tracking
    // we don't trust a single frame to start a new cycle.
    if (
      this.cycleStartMs !== null &&
      nowMs - this.cycleStartMs > maxRepMs &&
      this.phase !== 'up'
    ) {
      this.phase = 'up';
      this.cycleStartMs = null;
      return { counted: false, snapshot: this.snapshot };
    }

    switch (this.phase) {
      case 'up':
        if (angleDeg <= downThresholdDeg) {
          // Teleported straight to the bottom — no cycle, ignore.
          break;
        }
        if (angleDeg < upThresholdDeg) {
          this.phase = 'descending';
          this.cycleStartMs = nowMs;
        }
        break;

      case 'descending':
        if (angleDeg <= downThresholdDeg) {
          this.phase = 'down';
        } else if (angleDeg >= upThresholdDeg) {
          // Gave up mid-descent: not a rep, back to rest.
          this.phase = 'up';
          this.cycleStartMs = null;
        }
        break;

      case 'down':
        if (angleDeg >= upThresholdDeg) {
          // Skipped the ascent — treat as sloppy, no count.
          this.phase = 'up';
          this.cycleStartMs = null;
        } else if (angleDeg > downThresholdDeg) {
          this.phase = 'ascending';
        }
        break;

      case 'ascending': {
        if (angleDeg <= downThresholdDeg) {
          this.phase = 'down';
          break;
        }
        if (angleDeg >= upThresholdDeg) {
          const elapsed =
            this.cycleStartMs === null ? Infinity : nowMs - this.cycleStartMs;
          this.phase = 'up';
          this.cycleStartMs = null;
          if (elapsed >= minRepMs && elapsed <= maxRepMs) {
            this.reps += 1;
            return { counted: true, snapshot: this.snapshot };
          }
          // Too fast (cheat) or too slow (stale): motion happened, no rep.
        }
        break;
      }
    }

    return { counted: false, snapshot: this.snapshot };
  }
}
