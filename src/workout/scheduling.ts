/**
 * Pure alarm-fire-time math. No React Native imports — unit-tested.
 * The native AlarmModule receives the computed epoch millis; all
 * timezone/daylight logic stays in one testable place.
 */

/**
 * Next wall-clock fire time (epoch ms) for a "HH:mm" time and repeat days,
 * in the device's local timezone. Empty `days` = one-shot (today if the
 * time is still ahead, else tomorrow).
 *
 * Pure: the clock is an explicit parameter so renders stay pure and the
 * function stays unit-testable without timer mocks.
 */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function nextFireTimeMs(time: string, days: number[], nowMs: number): number {
  if (!TIME_RE.test(time)) {
    throw new Error(`nextFireTimeMs: invalid time "${time}", want HH:mm`);
  }
  const [h, m] = time.split(':').map(Number);
  const now = new Date(nowMs);
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(h, m, 0, 0);
    const applies =
      days.length === 0
        ? offset > 0 || candidate.getTime() > now.getTime()
        : days.includes(candidate.getDay());
    if (applies && candidate.getTime() > now.getTime()) {
      return candidate.getTime();
    }
  }
  // Unreachable in practice — tomorrow at the same time.
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 1);
  fallback.setHours(h, m, 0, 0);
  return fallback.getTime();
}

/**
 * True while the alarm is inside its lock-in window: it may not be
 * edited, weakened, or deleted until it fires.
 */
export function isInLockInWindow(
  time: string,
  days: number[],
  lockInMinutes: number,
  nowMs: number = Date.now(),
): boolean {
  const fireMs = nextFireTimeMs(time, days, nowMs);
  const msLeft = fireMs - nowMs;
  return msLeft > 0 && msLeft <= lockInMinutes * 60_000;
}

/** Whole days, hours and minutes until a fire time (never negative). */
export interface TimeUntil {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Countdown to a fire time, rounded down to the minute. All zero means
 * "under a minute". Each language formats it (src/i18n).
 */
export function timeUntil(fireMs: number, nowMs: number): TimeUntil {
  const totalMin = Math.floor(Math.max(0, fireMs - nowMs) / 60_000);
  return {
    days: Math.floor(totalMin / 1440),
    hours: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60,
  };
}
