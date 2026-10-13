/**
 * Fast key-value settings via react-native-mmkv.
 * Alarms/sessions live in SQLite (db.ts); everything here is a preference
 * or lightweight counter that benefits from synchronous reads.
 */
import { createMMKV } from 'react-native-mmkv';
import type {
  AppSettings,
  EmergencyExitMode,
  ExerciseType,
  StrictnessLevel,
} from '../types';

const storage = createMMKV({ id: 'workout-alarm-settings' });

const Keys = {
  strictness: 'strictness',
  emergencyExit: 'emergencyExit',
  backupExercise: 'backupExercise',
  lockInMinutes: 'lockInMinutes',
  onboardingDone: 'onboardingDone',
  totalWorkouts: 'totalWorkouts',
  autostartConfirmed: 'autostartConfirmed',
} as const;

const DEFAULTS: AppSettings = {
  strictness: 'standard',
  emergencyExit: 'none',
  backupExercise: 'steps',
  lockInMinutes: 30,
};

export function getSettings(): AppSettings {
  return {
    strictness:
      (storage.getString(Keys.strictness) as StrictnessLevel) ?? DEFAULTS.strictness,
    emergencyExit:
      (storage.getString(Keys.emergencyExit) as EmergencyExitMode) ??
      DEFAULTS.emergencyExit,
    backupExercise:
      (storage.getString(Keys.backupExercise) as ExerciseType) ??
      DEFAULTS.backupExercise,
    lockInMinutes: storage.getNumber(Keys.lockInMinutes) ?? DEFAULTS.lockInMinutes,
  };
}

export function setStrictness(level: StrictnessLevel): void {
  storage.set(Keys.strictness, level);
}

export function setEmergencyExit(mode: EmergencyExitMode): void {
  storage.set(Keys.emergencyExit, mode);
}

export function setBackupExercise(exercise: ExerciseType): void {
  storage.set(Keys.backupExercise, exercise);
}

export function setLockInMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 60) {
    throw new Error('lockInMinutes must be an integer between 15 and 60');
  }
  storage.set(Keys.lockInMinutes, minutes);
}

export function isOnboardingDone(): boolean {
  return storage.getBoolean(Keys.onboardingDone) === true;
}

export function markOnboardingDone(): void {
  storage.set(Keys.onboardingDone, true);
}

export function getTotalWorkouts(): number {
  return storage.getNumber(Keys.totalWorkouts) ?? 0;
}

export function incrementTotalWorkouts(): number {
  const next = getTotalWorkouts() + 1;
  storage.set(Keys.totalWorkouts, next);
  return next;
}

/** Xiaomi Autostart can't be read by apps: the user confirms it instead. */
export function isAutostartConfirmed(): boolean {
  return storage.getBoolean(Keys.autostartConfirmed) === true;
}

export function confirmAutostart(): void {
  storage.set(Keys.autostartConfirmed, true);
}
