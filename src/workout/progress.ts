/**
 * What the Done screen celebrates, from saved sessions. Pure — unit-tested.
 * Emergency-exit (skipped) sessions never count.
 */
import type { ExerciseType, WorkoutSession } from '../types';

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * This week's mornings, Sunday first (matching Date.getDay()): true where
 * at least one real workout was finished that day.
 */
export function weekDone(sessions: WorkoutSession[], nowMs: number): boolean[] {
  const done = new Set(
    sessions.filter((s) => !s.skipped).map((s) => dayKey(s.finishedAt)),
  );
  const start = new Date(nowMs);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return done.has(dayKey(day.getTime()));
  });
}

/**
 * Whole seconds faster than the previous real session of the same exercise,
 * or null when there's no earlier one or this wasn't faster.
 */
export function fasterThanLast(
  sessions: WorkoutSession[],
  current: { exercise: ExerciseType; durationMs: number; finishedAt: number },
): number | null {
  const previous = sessions
    .filter(
      (s) =>
        !s.skipped &&
        s.exercise === current.exercise &&
        s.finishedAt < current.finishedAt,
    )
    .sort((a, b) => b.finishedAt - a.finishedAt)[0];
  if (!previous) return null;
  const seconds = Math.floor((previous.durationMs - current.durationMs) / 1000);
  return seconds >= 1 ? seconds : null;
}
