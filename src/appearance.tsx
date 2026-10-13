/**
 * Light/dark appearance. Day screens read colours from `useTokens()`;
 * the setting follows the phone unless fixed in Settings, and switching
 * re-renders immediately. The workout screen is always dark.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  getSemanticTokens,
  type Mode,
  type Scheme,
  type SemanticTokens,
} from '../theme/helpers';
import {
  getAppearanceSetting,
  setAppearanceSetting,
  type AppearanceSetting,
} from './storage/settings';

interface AppearanceValue {
  scheme: Scheme;
  setting: AppearanceSetting;
  setSetting: (setting: AppearanceSetting) => void;
}

const AppearanceContext = createContext<AppearanceValue>({
  scheme: 'light',
  setting: 'system',
  setSetting: () => undefined,
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [setting, setSettingState] = useState<AppearanceSetting>(getAppearanceSetting);
  const scheme: Scheme =
    setting === 'system' ? (system === 'dark' ? 'dark' : 'light') : setting;
  const value = useMemo<AppearanceValue>(
    () => ({
      scheme,
      setting,
      setSetting: (next) => {
        setAppearanceSetting(next);
        setSettingState(next);
      },
    }),
    [scheme, setting],
  );
  return (
    <AppearanceContext.Provider value={value}>
      {/* Status bar text contrasts with the day background. */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </AppearanceContext.Provider>
  );
}

/** Colour tokens for a mode in the current appearance. */
export function useTokens(mode: Mode = 'day'): SemanticTokens {
  return getSemanticTokens(mode, useContext(AppearanceContext).scheme);
}

/** The appearance setting and its setter, for the Settings screen. */
export function useAppearanceSetting(): [
  AppearanceSetting,
  (s: AppearanceSetting) => void,
] {
  const { setting, setSetting } = useContext(AppearanceContext);
  return [setting, setSetting];
}
