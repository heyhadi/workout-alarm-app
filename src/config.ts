/**
 * App configuration. No secrets here — nothing in this file (or the repo)
 * may contain API keys, tokens, or credentials. Build-time values come from
 * `app.json` extras / EAS environment variables, never hardcoded.
 */
import Constants from 'expo-constants';

interface AppConfig {
  /** Environment label shown in dev builds. */
  env: string;
  /** Base URL for any future backend (none in v1 — on-device only). */
  apiBaseUrl: string | null;
}

function readExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const value = extra?.[key];
  return typeof value === 'string' ? value : undefined;
}

export const config: AppConfig = {
  env: readExtra('env') ?? (__DEV__ ? 'development' : 'production'),
  apiBaseUrl: readExtra('apiBaseUrl') ?? null,
};
