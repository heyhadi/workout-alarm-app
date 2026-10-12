/**
 * SQLite storage for alarms and workout sessions (expo-sqlite).
 * Settings/preferences live in MMKV (src/storage/settings.ts) — fast
 * key-value reads without SQL round-trips.
 */
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import type { Alarm, WorkoutSession } from '../types';

const DB_NAME = 'workout-alarm.db';

let db: SQLiteDatabase | null = null;

export function getDatabase(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DB_NAME);
  }
  return db;
}

/** Create tables if they do not exist. Idempotent — safe to call on launch. */
export async function initDatabase(): Promise<void> {
  const database = getDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY NOT NULL,
      time TEXT NOT NULL,
      days TEXT NOT NULL,
      exercise TEXT NOT NULL,
      rep_target INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      ringtone TEXT NOT NULL,
      backup_exercise TEXT NOT NULL,
      lock_in_minutes INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      alarm_id TEXT NOT NULL,
      exercise TEXT NOT NULL,
      reps_target INTEGER NOT NULL,
      reps_done INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_finished ON sessions(finished_at DESC);
  `);
}

function rowToAlarm(row: Record<string, unknown>): Alarm {
  return {
    id: row.id as string,
    time: row.time as string,
    days: JSON.parse(row.days as string) as number[],
    exercise: row.exercise as Alarm['exercise'],
    repTarget: row.rep_target as number,
    difficulty: row.difficulty as Alarm['difficulty'],
    ringtone: row.ringtone as string,
    backupExercise: row.backup_exercise as Alarm['backupExercise'],
    lockInMinutes: row.lock_in_minutes as number,
    enabled: (row.enabled as number) === 1,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export async function listAlarms(): Promise<Alarm[]> {
  const rows = await getDatabase().getAllAsync<Record<string, unknown>>(
    'SELECT * FROM alarms ORDER BY time ASC',
  );
  return rows.map(rowToAlarm);
}

export async function getAlarm(id: string): Promise<Alarm | null> {
  const row = await getDatabase().getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM alarms WHERE id = ?',
    [id],
  );
  return row ? rowToAlarm(row) : null;
}

export async function upsertAlarm(alarm: Alarm): Promise<void> {
  await getDatabase().runAsync(
    `INSERT INTO alarms (id, time, days, exercise, rep_target, difficulty, ringtone,
       backup_exercise, lock_in_minutes, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       time=excluded.time, days=excluded.days, exercise=excluded.exercise,
       rep_target=excluded.rep_target, difficulty=excluded.difficulty,
       ringtone=excluded.ringtone, backup_exercise=excluded.backup_exercise,
       lock_in_minutes=excluded.lock_in_minutes, enabled=excluded.enabled,
       updated_at=excluded.updated_at`,
    [
      alarm.id,
      alarm.time,
      JSON.stringify(alarm.days),
      alarm.exercise,
      alarm.repTarget,
      alarm.difficulty,
      alarm.ringtone,
      alarm.backupExercise,
      alarm.lockInMinutes,
      alarm.enabled ? 1 : 0,
      alarm.createdAt,
      alarm.updatedAt,
    ],
  );
}

export async function deleteAlarm(id: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM alarms WHERE id = ?', [id]);
}

export async function setAlarmEnabled(id: string, enabled: boolean): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE alarms SET enabled = ?, updated_at = ? WHERE id = ?',
    [enabled ? 1 : 0, Date.now(), id],
  );
}

export async function recordSession(session: WorkoutSession): Promise<void> {
  await getDatabase().runAsync(
    `INSERT INTO sessions (id, alarm_id, exercise, reps_target, reps_done,
       started_at, finished_at, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.alarmId,
      session.exercise,
      session.repsTarget,
      session.repsDone,
      session.startedAt,
      session.finishedAt,
      session.durationMs,
    ],
  );
}

/** Most recent sessions first — powers the streak counter and Done screen. */
export async function listRecentSessions(limit = 30): Promise<WorkoutSession[]> {
  const rows = await getDatabase().getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sessions ORDER BY finished_at DESC LIMIT ?',
    [limit],
  );
  return rows.map((row) => ({
    id: row.id as string,
    alarmId: row.alarm_id as string,
    exercise: row.exercise as WorkoutSession['exercise'],
    repsTarget: row.reps_target as number,
    repsDone: row.reps_done as number,
    startedAt: row.started_at as number,
    finishedAt: row.finished_at as number,
    durationMs: row.duration_ms as number,
  }));
}

/**
 * Consecutive days (local time) with at least one completed session,
 * counting back from today. Used by the alarm-list streak badge.
 */
export async function currentStreakDays(): Promise<number> {
  const sessions = await listRecentSessions(365);
  const days = new Set(
    sessions.map((s) => {
      const d = new Date(s.finishedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  let streak = 0;
  const cursor = new Date();
  // Allow "today not done yet" without breaking the streak.
  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
