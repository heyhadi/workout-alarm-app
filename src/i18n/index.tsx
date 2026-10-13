/**
 * UI language. Every screen reads its words from `useStrings()`; the
 * language follows the phone unless set in Settings, and switching
 * re-renders the app immediately.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { en, type Strings } from './en';
import { id } from './id';
import { resolveLanguage, type Language } from './language';
import {
  getLanguageSetting,
  setLanguageSetting,
  type LanguageSetting,
} from '../storage/settings';

const STRINGS: Record<Language, Strings> = { en, id };

function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

/** The language "follow the phone" currently resolves to. */
export function systemLanguage(): Language {
  return resolveLanguage('system', deviceLocale());
}

/** Strings outside React (e.g. the error boundary). */
export function getStrings(): Strings {
  return STRINGS[resolveLanguage(getLanguageSetting(), deviceLocale())];
}

interface I18nValue {
  strings: Strings;
  setting: LanguageSetting;
  setSetting: (setting: LanguageSetting) => void;
}

const I18nContext = createContext<I18nValue>({
  strings: en,
  setting: 'system',
  setSetting: () => undefined,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<LanguageSetting>(getLanguageSetting);
  const value = useMemo<I18nValue>(
    () => ({
      strings: STRINGS[resolveLanguage(setting, deviceLocale())],
      setting,
      setSetting: (next) => {
        setLanguageSetting(next);
        setSettingState(next);
      },
    }),
    [setting],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** The current language's strings. */
export function useStrings(): Strings {
  return useContext(I18nContext).strings;
}

/** The language setting and its setter, for the Settings screen. */
export function useLanguageSetting(): [LanguageSetting, (s: LanguageSetting) => void] {
  const { setting, setSetting } = useContext(I18nContext);
  return [setting, setSetting];
}
