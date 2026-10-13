/** Language resolution — pure, unit-tested. */
export type Language = 'en' | 'id';

/** Indonesian when the phone's locale is Indonesian (id, or legacy "in"). */
export function languageForLocale(locale: string | undefined): Language {
  const tag = (locale ?? '').toLowerCase();
  return tag.startsWith('id') || tag.startsWith('in') ? 'id' : 'en';
}

export function resolveLanguage(
  setting: 'system' | Language,
  deviceLocale: string | undefined,
): Language {
  return setting === 'system' ? languageForLocale(deviceLocale) : setting;
}
