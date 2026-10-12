/**
 * Shared domain types for the Workout Alarm app.
 * These mirror the SQLite schema in src/storage/db.ts — keep them in sync.
 */

export type ExerciseType = 'squats' | 'pushups' | 'jumping_jacks' | 'situps' | 'steps';

export type Difficulty = 'easy' | 'standard' | 'hard';

export type StrictnessLevel = 'standard' | 'maximum';

export type EmergencyExitMode = 'none' | 'slow';

export interface Alarm {
  id: string;
  /** "HH:mm" 24-hour, e.g. "06:30" */
  time: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  exercise: ExerciseType;
  repTarget: number;
  difficulty: Difficulty;
  ringtone: string;
  backupExercise: ExerciseType;
  /** Minutes before firing during which the alarm is locked (15–60). */
  lockInMinutes: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSession {
  id: string;
  alarmId: string;
  exercise: ExerciseType;
  repsTarget: number;
  repsDone: number;
  startedAt: number;
  finishedAt: number;
  /** Derived: finishedAt - startedAt */
  durationMs: number;
}

export interface AppSettings {
  strictness: StrictnessLevel;
  emergencyExit: EmergencyExitMode;
  backupExercise: ExerciseType;
  lockInMinutes: number;
}

/** Bridge events emitted natively → JS (see src/native/*). */
export type BridgeEventName =
  'onAlarmFired' | 'onRepCounted' | 'onPoseLost' | 'onAlarmReleased';

export interface AlarmFiredPayload {
  alarmId: string;
  firedAt: number;
}

export interface RepCountedPayload {
  /** Reps counted in this event (usually 1). */
  reps: number;
  /** Running total for the session. */
  total: number;
  exercise: ExerciseType;
}

export interface PoseLostPayload {
  reason: 'no_body' | 'camera_error' | 'low_light';
}

export interface AlarmReleasedPayload {
  alarmId: string;
  repsDone: number;
  durationMs: number;
}
