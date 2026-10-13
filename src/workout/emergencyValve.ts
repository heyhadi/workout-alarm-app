/**
 * Emergency exit — the deliberately slow way out when a workout truly
 * can't happen (injury, sick, camera and step counter both failing).
 * Never a snooze in disguise: off by default, only after the alarm has
 * rung for a while, a long hold, an exact sentence, and the morning
 * doesn't count toward the streak. Pure — unit-tested.
 */

/** The link only appears once the alarm has rung this long. */
export const VALVE_AVAILABLE_AFTER_MS = 10 * 60_000;
/** Then the exit button must be held this long without letting go. */
export const VALVE_HOLD_MS = 60_000;

export function isValveAvailable(enabled: boolean, ringingForMs: number): boolean {
  return enabled && ringingForMs >= VALVE_AVAILABLE_AFTER_MS;
}

/** Case, spacing and punctuation don't matter; every word does. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function phraseMatches(typed: string, phrase: string): boolean {
  return normalize(typed) === normalize(phrase) && normalize(phrase).length > 0;
}
