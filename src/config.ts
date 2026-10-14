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

/** Installed version and build number, shown in Settings. */
export interface AppVersion {
  /** Human-readable version from app.json, e.g. "1.0.73". */
  version: string;
  /**
   * Android versionCode. CI stamps it with the run number — the same build
   * number the in-app updater compares against GitHub releases. `null` on
   * local builds, where Gradle leaves it at the default.
   */
  build: number | null;
}

function readAppVersion(): AppVersion {
  const expoConfig = Constants.expoConfig;
  const build = expoConfig?.android?.versionCode;
  return {
    version: expoConfig?.version ?? '0.0.0',
    build: typeof build === 'number' ? build : null,
  };
}

/** Static for the app's lifetime — read once at module load. */
export const appVersion: AppVersion = readAppVersion();
