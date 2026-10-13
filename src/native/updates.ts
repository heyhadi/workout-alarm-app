/**
 * In-app updates from the repo's GitHub Releases (the app isn't on the
 * Play Store). Kotlin: android/.../update/UpdateModule.kt — verifies the
 * download (same app, newer, same signing key) before Android's installer
 * opens.
 */
import {
  RELEASES_API,
  updateFromRelease,
  type AvailableUpdate,
} from '../updates/latestRelease';
import { getNativeModule, isNativeModuleAvailable } from './registry';

const MODULE_NAME = 'UpdateModule';

interface UpdateModuleSpec {
  getInstalledBuild(): Promise<number>;
  downloadAndInstall(url: string): Promise<void>;
}

function spec(): UpdateModuleSpec {
  return getNativeModule<UpdateModuleSpec>(MODULE_NAME);
}

/**
 * A newer CI build, or null. Local builds (versionCode 1) never match a CI
 * build's signing key, so they don't offer updates they couldn't install.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isNativeModuleAvailable(MODULE_NAME)) return null;
  const installed = await spec().getInstalledBuild();
  if (installed <= 1) return null;
  const response = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return null;
  return updateFromRelease(await response.json(), installed);
}

/**
 * Download and hand the APK to Android's installer (the user confirms).
 * Rejects with code NEEDS_INSTALL_PERMISSION after opening the one-time
 * "Install unknown apps" setting.
 */
export async function installUpdate(update: AvailableUpdate): Promise<void> {
  await spec().downloadAndInstall(update.apkUrl);
}
