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
import { DeviceEventEmitter } from 'react-native';
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
  getAlarmReadiness(): Promise<AlarmReadiness>;
  pickAlarmSound(currentUri: string | null): Promise<PickedSound | null>;
  getSoundTitle(uri: string | null): Promise<string>;
  openFullScreenIntentSettings(): Promise<void>;
  getActiveRinging(): Promise<{
    alarmId: string;
    exercise: ExerciseType;
    repTarget: number;
  } | null>;
}

/**
 * What the phone lets the alarm do. Any false means it can ring without
 * ever showing the workout screen (or miss its time).
 */
export interface AlarmReadiness {
  notifications: boolean;
  /** Android 14+: allowed to open full-screen over the lock screen. */
  fullScreen: boolean;
  exactAlarms: boolean;
}

export interface PickedSound {
  /** Null when "Default" was picked: follow the phone's alarm sound. */
  uri: string | null;
  title: string;
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

/**
 * Fallback: asks the ringing service directly what it is ringing for,
 * without depending on the Activity intent. Catches cases where the
 * intent was missed (e.g. consumed before JS read it).
 */
export async function getActiveRinging(): Promise<{
  alarmId: string;
  exercise: ExerciseType;
  repTarget: number;
} | null> {
  return spec().getActiveRinging();
}

export async function getAlarmReadiness(): Promise<AlarmReadiness> {
  return spec().getAlarmReadiness();
}

/** Open the system page for "full-screen notifications" (Android 14+). */
export async function openFullScreenIntentSettings(): Promise<void> {
  await spec().openFullScreenIntentSettings();
}

/**
 * Android's alarm-sound picker. Resolves the pick, or null if the user
 * backed out (keep the current sound). Silent is never offered.
 */
export async function pickAlarmSound(
  currentUri: string | null,
): Promise<PickedSound | null> {
  return spec().pickAlarmSound(currentUri);
}

/** Display name for a sound URI ("Phone default" for null). */
export async function getSoundTitle(uri: string | null): Promise<string> {
  return spec().getSoundTitle(uri);
}

/** Subscribe to `onAlarmReleased` (authoritative release payload). */
export function addAlarmReleasedListener(
  listener: (payload: AlarmReleasedPayload) => void,
): () => void {
  const emitter = getModuleEventEmitter(MODULE_NAME);
  const sub = emitter.addListener('onAlarmReleased', listener);
  return () => sub.remove();
}

/**
 * Fired by MainActivity.onNewIntent when the alarm's full-screen intent
 * arrives while the app is already alive (foreground or background).
 * The AppState 'active' listener misses this when the app is already
 * foregrounded, so this event is the reliable signal to route to /ringing.
 */
export function addRingingIntentListener(listener: () => void): () => void {
  const sub = DeviceEventEmitter.addListener('onRingingIntent', listener);
  return () => sub.remove();
}

export function isRingingModuleAvailable(): boolean {
  return isNativeModuleAvailable(MODULE_NAME);
}
