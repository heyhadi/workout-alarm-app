import { describe, expect, it } from 'vitest';
import { fasterThanLast, weekDone } from '../src/workout/progress';
import type { WorkoutSession } from '../src/types';

const at = (iso: string) => new Date(iso).getTime();
const session = (iso: string, over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: iso,
  alarmId: 'a',
  exercise: 'squats',
  repsTarget: 20,
  repsDone: 20,
  startedAt: at(iso) - 90_000,
  finishedAt: at(iso),
  durationMs: 90_000,
  skipped: false,
  ...over,
});

describe('weekDone', () => {
  // Wednesday 14 Oct 2026; the week runs Sun 11 – Sat 17.
  const now = at('2026-10-14T07:00:00');

  it('marks the days of this week with a finished workout', () => {
    const sessions = [
      session('2026-10-11T06:35:00'), // Sun
      session('2026-10-13T06:40:00'), // Tue
      session('2026-10-14T06:31:00'), // Wed
      session('2026-10-08T06:30:00'), // last week
    ];
    expect(weekDone(sessions, now)).toEqual([
      true,
      false,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it('ignores emergency exits', () => {
    expect(weekDone([session('2026-10-14T06:31:00', { skipped: true })], now)).toEqual(
      Array(7).fill(false),
    );
  });
});

describe('fasterThanLast', () => {
  const sessions = [
    session('2026-10-12T06:35:00', { durationMs: 106_000 }),
    session('2026-10-13T06:35:00', { durationMs: 120_000, exercise: 'pushups' }),
    session('2026-10-13T06:50:00', { durationMs: 60_000, skipped: true }),
  ];

  it('compares with the previous real session of the same exercise', () => {
    const current = {
      exercise: 'squats' as const,
      durationMs: 94_000,
      finishedAt: at('2026-10-14T06:35:00'),
    };
    expect(fasterThanLast(sessions, current)).toBe(12);
  });

  it('says nothing when slower, or with no history', () => {
    const slower = {
      exercise: 'squats' as const,
      durationMs: 110_000,
      finishedAt: at('2026-10-14T06:35:00'),
    };
    expect(fasterThanLast(sessions, slower)).toBeNull();
    const first = {
      exercise: 'situps' as const,
      durationMs: 50_000,
      finishedAt: at('2026-10-14T06:35:00'),
    };
    expect(fasterThanLast(sessions, first)).toBeNull();
  });
});
