/**
 * PoseModule — on-device rep verification (CameraX + ML Kit Pose Detection).
 *
 * Kotlin: android/.../pose/PoseModule.kt. Frames NEVER cross the bridge:
 * only rep events do. Emits `onRepCounted` per verified rep and `onFraming`
 * when framing changes (in frame, partly in frame, nobody in frame).
 *
 * The counting rules mirror src/workout/repCounter.ts and use its
 * thresholds — the native side is authoritative at runtime; the TS class
 * exists for tests and the demo fallback.
 */
import type { ExerciseType, FramingPayload, RepCountedPayload } from '../types';
import type { RepCounterConfig } from '../workout/repCounter';
import {
  getModuleEventEmitter,
  getNativeModule,
  isNativeModuleAvailable,
} from './registry';

const MODULE_NAME = 'PoseModule';

interface PoseModuleSpec {
  startPoseDetection(
    exercise: ExerciseType,
    repTarget: number,
    config: RepCounterConfig,
  ): Promise<void>;
  stopPoseDetection(): Promise<void>;
}

function spec(): PoseModuleSpec {
  return getNativeModule<PoseModuleSpec>(MODULE_NAME);
}

/**
 * Begin feeding camera frames to the pose pipeline for this exercise.
 * `config` carries the counter thresholds, so the native counter and the
 * tested TS RepCounter share one source (EXERCISE_COUNTER_CONFIGS).
 */
export async function startPoseDetection(
  exercise: ExerciseType,
  repTarget: number,
  config: RepCounterConfig,
): Promise<void> {
  await spec().startPoseDetection(exercise, repTarget, config);
}

/** Stop the camera pipeline and release the camera. */
export async function stopPoseDetection(): Promise<void> {
  await spec().stopPoseDetection();
}

/** Subscribe to `onRepCounted` — the only rep source the app trusts. */
export function addRepCountedListener(
  listener: (payload: RepCountedPayload) => void,
): () => void {
  const emitter = getModuleEventEmitter(MODULE_NAME);
  const sub = emitter.addListener('onRepCounted', listener);
  return () => sub.remove();
}

/**
 * Subscribe to `onFraming` — drives the framing border, status pill and
 * framing cues. Reps pause while not in frame; the alarm keeps ringing.
 */
export function addFramingListener(
  listener: (payload: FramingPayload) => void,
): () => void {
  const emitter = getModuleEventEmitter(MODULE_NAME);
  const sub = emitter.addListener('onFraming', listener);
  return () => sub.remove();
}

export function isPoseModuleAvailable(): boolean {
  return isNativeModuleAvailable(MODULE_NAME);
}
