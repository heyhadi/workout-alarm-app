/**
 * AlarmModule — exact alarm scheduling via AlarmManager.setAlarmClock().
 *
 * Kotlin: android/.../alarm/AlarmModule.kt (+ AlarmReceiver.kt).
 * Emits `onAlarmFired` when the alarm fires, even if the JS runtime is dead.
 */
import type { AlarmFiredPayload, ExerciseType } from '../types';
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
}

export { nextFireTimeMs };

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
  );
}

/** Cancel a scheduled alarm. No-op if it was never scheduled. */
export async function cancelAlarm(alarmId: string): Promise<void> {
  await spec().cancelAlarm(alarmId);
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
