/**
 * PoseModule — on-device rep verification (CameraX + ML Kit Pose Detection).
 *
 * Kotlin: android/.../pose/PoseModule.kt. Frames NEVER cross the bridge:
 * only rep events do. Emits `onRepCounted` per verified rep and `onPoseLost`
 * when no body is visible (camera covered, too dark, user walked away).
 *
 * The counting rules mirror src/workout/repCounter.ts — the native side is
 * authoritative at runtime; the TS class exists for tests and the web
 * fallback preview.
 */
import type { ExerciseType, PoseLostPayload, RepCountedPayload } from '../types';
import {
  getModuleEventEmitter,
  getNativeModule,
  isNativeModuleAvailable,
} from './registry';

const MODULE_NAME = 'PoseModule';

interface PoseModuleSpec {
  startPoseDetection(exercise: ExerciseType, repTarget: number): Promise<void>;
  stopPoseDetection(): Promise<void>;
}

function spec(): PoseModuleSpec {
  return getNativeModule<PoseModuleSpec>(MODULE_NAME);
}

/** Begin feeding camera frames to the pose pipeline for this exercise. */
export async function startPoseDetection(
  exercise: ExerciseType,
  repTarget: number,
): Promise<void> {
  await spec().startPoseDetection(exercise, repTarget);
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
 * Subscribe to `onPoseLost` — drive the "get back in frame" UI and the
 * form-cue banner. The alarm keeps ringing; silence is never the answer
 * to a lost pose.
 */
export function addPoseLostListener(
  listener: (payload: PoseLostPayload) => void,
): () => void {
  const emitter = getModuleEventEmitter(MODULE_NAME);
  const sub = emitter.addListener('onPoseLost', listener);
  return () => sub.remove();
}

export function isPoseModuleAvailable(): boolean {
  return isNativeModuleAvailable(MODULE_NAME);
}
