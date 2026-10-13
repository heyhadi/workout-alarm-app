import { describe, expect, it } from 'vitest';
import {
  isValveAvailable,
  phraseMatches,
  VALVE_AVAILABLE_AFTER_MS,
} from '../src/workout/emergencyValve';

describe('isValveAvailable', () => {
  it('never appears when switched off', () => {
    expect(isValveAvailable(false, VALVE_AVAILABLE_AFTER_MS * 10)).toBe(false);
  });

  it('only appears after the alarm has rung long enough', () => {
    expect(isValveAvailable(true, VALVE_AVAILABLE_AFTER_MS - 1)).toBe(false);
    expect(isValveAvailable(true, VALVE_AVAILABLE_AFTER_MS)).toBe(true);
  });
});

describe('phraseMatches', () => {
  const phrase = 'I am choosing to skip my workout today.';

  it('ignores case, spacing and punctuation', () => {
    expect(phraseMatches('i am  choosing to skip my workout today', phrase)).toBe(true);
    expect(phraseMatches('  I AM CHOOSING TO SKIP MY WORKOUT TODAY!! ', phrase)).toBe(true);
  });

  it('requires every word', () => {
    expect(phraseMatches('I am choosing to skip my workout', phrase)).toBe(false);
    expect(phraseMatches('skip', phrase)).toBe(false);
    expect(phraseMatches('', phrase)).toBe(false);
  });

  it('works for Indonesian', () => {
    const id = 'Saya memilih untuk melewatkan latihan hari ini.';
    expect(phraseMatches('saya memilih untuk melewatkan latihan hari ini', id)).toBe(true);
  });
});
