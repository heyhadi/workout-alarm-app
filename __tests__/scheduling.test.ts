import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  formatTimeUntil,
  isInLockInWindow,
  nextFireTimeMs,
} from '../src/workout/scheduling';

afterEach(() => {
  vi.useRealTimers();
});

function mockNow(iso: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe('nextFireTimeMs', () => {
  it('fires today when the time is still ahead', () => {
    // Monday 2026-10-12 05:00 local
    mockNow('2026-10-12T05:00:00');
    const fire = nextFireTimeMs('06:30', [1], Date.now());
    const d = new Date(fire);
    expect(d.getHours()).toBe(6);
    expect(d.getMinutes()).toBe(30);
    expect(d.getDay()).toBe(1);
    expect(fire).toBeGreaterThan(Date.now());
  });

  it('fires next week when today’s time already passed', () => {
    mockNow('2026-10-12T07:00:00'); // Monday, after 06:30
    const fire = nextFireTimeMs('06:30', [1], Date.now());
    const d = new Date(fire);
    expect(d.getDay()).toBe(1);
    // Next Monday = 7 days out
    expect(fire - Date.now()).toBeGreaterThan(6 * 24 * 3_600_000);
  });

  it('one-shot alarm fires tomorrow when the time passed today', () => {
    mockNow('2026-10-12T07:00:00');
    const fire = nextFireTimeMs('06:30', [], Date.now());
    const d = new Date(fire);
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(6);
  });

  it('rejects invalid times', () => {
    expect(() => nextFireTimeMs('25:00', [1], Date.now())).toThrow(/invalid time/);
    expect(() => nextFireTimeMs('6:30', [1], Date.now())).toThrow(/invalid time/);
  });
});

describe('isInLockInWindow', () => {
  it('is locked 20 minutes before firing with a 30-minute window', () => {
    mockNow('2026-10-12T06:10:00');
    expect(isInLockInWindow('06:30', [1], 30)).toBe(true);
  });

  it('is not locked 40 minutes before firing', () => {
    mockNow('2026-10-12T05:50:00');
    expect(isInLockInWindow('06:30', [1], 30)).toBe(false);
  });
});

describe('formatTimeUntil', () => {
  const now = new Date('2026-10-12T23:18:00').getTime();
  const at = (mins: number) => now + mins * 60_000;

  it('shows hours and minutes under a day', () => {
    expect(formatTimeUntil(at(7 * 60 + 12), now)).toBe('7 h 12 min');
  });

  it('shows minutes only under an hour', () => {
    expect(formatTimeUntil(at(45), now)).toBe('45 min');
  });

  it('shows days and hours for repeat alarms days away', () => {
    expect(formatTimeUntil(at(2 * 1440 + 3 * 60 + 30), now)).toBe('2 d 3 h');
    expect(formatTimeUntil(at(6 * 1440), now)).toBe('6 d');
  });

  it('never goes negative', () => {
    expect(formatTimeUntil(now + 20_000, now)).toBe('under a minute');
    expect(formatTimeUntil(now - 60_000, now)).toBe('under a minute');
  });
});
