import { describe, expect, it } from 'vitest';
import { languageForLocale, resolveLanguage } from '../src/i18n/language';
import { en } from '../src/i18n/en';
import { id } from '../src/i18n/id';

describe('language', () => {
  it('follows an Indonesian phone', () => {
    expect(languageForLocale('id-ID')).toBe('id');
    expect(languageForLocale('in-ID')).toBe('id'); // legacy Android code
    expect(languageForLocale('en-US')).toBe('en');
    expect(languageForLocale(undefined)).toBe('en');
  });

  it('lets a fixed choice override the phone', () => {
    expect(resolveLanguage('en', 'id-ID')).toBe('en');
    expect(resolveLanguage('id', 'en-US')).toBe('id');
    expect(resolveLanguage('system', 'id-ID')).toBe('id');
  });
});

describe('strings', () => {
  it('formats countdowns in both languages', () => {
    const t = { days: 0, hours: 7, minutes: 12 };
    expect(en.timeUntil(t)).toBe('7 h 12 min');
    expect(id.timeUntil(t)).toBe('7 jam 12 menit');
    expect(id.timeUntil({ days: 0, hours: 0, minutes: 0 })).toBe('kurang dari 1 menit');
  });

  it('has a day letter for every weekday', () => {
    expect(en.dayLetters).toHaveLength(7);
    expect(id.dayLetters).toHaveLength(7);
  });
});
