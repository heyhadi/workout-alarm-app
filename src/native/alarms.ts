/**
 * AlarmModule — exact alarm scheduling via AlarmManager.setAlarmClock().
 *
 * Kotlin: android/.../alarm/AlarmModule.kt (+ AlarmReceiver.kt).
 * Emits `onAlarmFired` when the alarm fires, even if the JS runtime is dead.
 */
import type { Alarm, AlarmFiredPayload, ExerciseType } from '../types';
import { nextFireTimeMs } from '../workout/scheduling';
import {
  getModuleEventEmitter,
  getNativeModule,
  isNativeModuleAvailable,
} from './registry';

const MODULE_NAME = 'AlarmModule';

interface AlarmModuleSpec {
  scheduleAlarm(
    alarmId: string,
    triggerAtMillis: number,
    exercise: ExerciseType,
    repTarget: number,
    soundUri: string | null,
  ): Promise<void>;
  cancelAlarm(alarmId: string): Promise<void>;
}

export interface ScheduleAlarmInput {
  alarmId: string;
  /** "HH:mm" 24-hour local time. */
  time: string;
  /** 0 = Sunday … 6 = Saturday. Empty = one-shot today/tomorrow. */
  days: number[];
  exercise: ExerciseType;
  repTarget: number;
  /** Alarm sound URI; null = the phone's default alarm sound. */
  soundUri?: string | null;
}

export { nextFireTimeMs };

/**
 * The alarm's chosen sound URI, or null for the phone default. Alarms saved
 * before the sound picker hold free text ("Morning energy") — not a URI.
 */
export function soundUriOf(ringtone: string): string | null {
  return ringtone.includes('://') ? ringtone : null;
}

function spec(): AlarmModuleSpec {
  return getNativeModule<AlarmModuleSpec>(MODULE_NAME);
}

/** Schedule (or re-schedule) an exact alarm. Replaces any existing one. */
export async function scheduleAlarm(input: ScheduleAlarmInput): Promise<void> {
  const triggerAtMillis = nextFireTimeMs(input.time, input.days, Date.now());
  await spec().scheduleAlarm(
    input.alarmId,
    triggerAtMillis,
    input.exercise,
    input.repTarget,
    input.soundUri ?? null,
  );
}

/** Cancel a scheduled alarm. No-op if it was never scheduled. */
export async function cancelAlarm(alarmId: string): Promise<void> {
  await spec().cancelAlarm(alarmId);
}

/**
 * Make the native schedule match an alarm's saved state: enabled alarms are
 * armed for their next occurrence, disabled ones cancelled. Call after every
 * create, edit, toggle and release. No-op without the native module.
 */
export async function applyAlarmSchedule(alarm: Alarm): Promise<void> {
  if (!isAlarmModuleAvailable()) return;
  if (alarm.enabled) {
    await scheduleAlarm({
      alarmId: alarm.id,
      time: alarm.time,
      days: alarm.days,
      exercise: alarm.exercise,
      repTarget: alarm.repTarget,
      soundUri: soundUriOf(alarm.ringtone),
    });
  } else {
    await cancelAlarm(alarm.id);
  }
}

/**
 * Re-arm every saved alarm on launch, so the native schedule always matches
 * the database (e.g. alarms saved before the per-alarm store existed).
 * Skips the alarm that is ringing right now: re-arming it for tomorrow
 * would forgive the workout still owed.
 */
export async function syncAlarmSchedules(
  alarms: Alarm[],
  ringingAlarmId: string | null,
): Promise<void> {
  for (const alarm of alarms) {
    if (alarm.id === ringingAlarmId) continue;
    await applyAlarmSchedule(alarm);
  }
}

/**
 * Subscribe to `onAlarmFired`. Returns an unsubscribe function.
 * The payload arrives even when the app was killed — the receiver
 * starts the ringing service before JS is ready.
 */
export function addAlarmFiredListener(
  listener: (payload: AlarmFiredPayload) => void,
): () => void {
  const emitter = getModuleEventEmitter(MODULE_NAME);
  const sub = emitter.addListener('onAlarmFired', listener);
  return () => sub.remove();
}

export function isAlarmModuleAvailable(): boolean {
  return isNativeModuleAvailable(MODULE_NAME);
}
