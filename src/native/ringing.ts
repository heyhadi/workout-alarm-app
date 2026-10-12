/**
 * RingingModule — owns the alarm sound while it rings.
 *
 * Kotlin: android/.../ringing/RingingModule.kt (+ RingingService.kt,
 * RingingActivity.kt). A foreground service loops sound on the alarm audio
 * stream, re-asserts volume, vibrates, and shows the full-screen locked
 * activity over the lock screen. Emits `onAlarmReleased` when the workout
 * target is verified — the ONLY code path that stops the sound.
 */
import type { AlarmReleasedPayload, ExerciseType } from '../types';
import {
  getModuleEventEmitter,
  getNativeModule,
  isNativeModuleAvailable,
} from './registry';

const MODULE_NAME = 'RingingModule';

interface RingingModuleSpec {
  startRinging(
    alarmId: string,
    exercise: ExerciseType,
    repTarget: number,
  ): Promise<void>;
  releaseAlarm(
    alarmId: string,
    repsDone: number,
    durationMs: number,
  ): Promise<AlarmReleasedPayload>;
  getRingingIntent(): Promise<{
    alarmId: string;
    exercise: ExerciseType;
    repTarget: number;
  } | null>;
}

export interface StartRingingInput {
  alarmId: string;
  exercise: ExerciseType;
  repTarget: number;
}

function spec(): RingingModuleSpec {
  return getNativeModule<RingingModuleSpec>(MODULE_NAME);
}

/**
 * Begin the unskippable ringing state. There is intentionally no
 * `stopRinging` — sound ends only via `releaseAlarm()` after the workout
 * target is verified by the PoseModule.
 */
export async function startRinging(input: StartRingingInput): Promise<void> {
  await spec().startRinging(input.alarmId, input.exercise, input.repTarget);
}

/**
 * End the alarm: stops sound/vibration, clears the lock.
 * Called only after the rep target is verified. The native side also
 * emits `onAlarmReleased` with the authoritative payload for listeners.
 */
export async function releaseAlarm(
  alarmId: string,
  repsDone: number,
  durationMs: number,
): Promise<AlarmReleasedPayload> {
  return spec().releaseAlarm(alarmId, repsDone, durationMs);
}

/**
 * When the app was cold-started by the full-screen ringing intent, returns
 * the alarm payload so JS can route straight to /ringing. Null otherwise.
 */
export async function getRingingIntent(): Promise<{
  alarmId: string;
  exercise: ExerciseType;
  repTarget: number;
} | null> {
  return spec().getRingingIntent();
}

/** Subscribe to `onAlarmReleased` (authoritative release payload). */
export function addAlarmReleasedListener(
  listener: (payload: AlarmReleasedPayload) => void,
): () => void {
  const emitter = getModuleEventEmitter(MODULE_NAME);
  const sub = emitter.addListener('onAlarmReleased', listener);
  return () => sub.remove();
}

export function isRingingModuleAvailable(): boolean {
  return isNativeModuleAvailable(MODULE_NAME);
}
