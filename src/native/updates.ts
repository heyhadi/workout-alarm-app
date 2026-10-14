/**
 * In-app updates from the repo's GitHub Releases (the app isn't on the
 * Play Store). Kotlin: android/.../update/UpdateModule.kt — verifies the
 * download (same app, newer, same signing key) before Android's installer
 * opens.
 */
import {
  RELEASES_API,
  RELEASE_DOWNLOAD_PREFIX,
  updateFromRelease,
  type AvailableUpdate,
} from '../updates/latestRelease';
import {
  getModuleEventEmitter,
  getNativeModule,
  isNativeModuleAvailable,
} from './registry';

const MODULE_NAME = 'UpdateModule';

/**
 * Dev-only fake update, so the updater UI can be exercised anywhere.
 *
 * The real path needs Android — UpdateModule is Kotlin — plus a CI-stamped
 * versionCode. On iOS or in a local build `checkForUpdate()` bails out long
 * before the card can render. This bypasses both and fakes the download too,
 * including the throttled progress events, so the whole flow is verifiable.
 *
 * `__DEV__` is statically false in release bundles and Metro drops the whole
 * branch, so a mock can never ship. Set to `null` for the real path.
 */
const MOCK_UPDATE: AvailableUpdate | null = __DEV__
  ? {
      build: 74, // one past the latest published release
      apkUrl: `${RELEASE_DOWNLOAD_PREFIX}build-73/workout-alarm-build-73.apk`,
      title: 'Build 74',
    }
  : null;

/** Progress subscribers, only consulted while mocking. */
const mockProgress = new Set<(progress: DownloadProgress) => void>();

/**
 * Fake a download over ~6s in 20 chunks, emitting at most every 256 KB —
 * the same throttle the Kotlin side applies.
 */
function runMockDownload(): Promise<void> {
  const total = 182_403_692; // real build-73 APK size, so the bar looks honest
  const chunk = total / 20;
  let downloaded = 0;
  let emitted = 0;
  return new Promise((resolve) => {
    const tick = () => {
      downloaded = Math.min(total, downloaded + chunk);
      if (downloaded - emitted >= 256 * 1024 || downloaded >= total) {
        emitted = downloaded;
        for (const listener of mockProgress) {
          listener({ downloaded, total });
        }
      }
      if (downloaded >= total) {
        resolve();
      } else {
        setTimeout(tick, 300);
      }
    };
    tick();
  });
}

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
  if (MOCK_UPDATE) return MOCK_UPDATE;
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
  if (update === MOCK_UPDATE) {
    await runMockDownload();
    return;
  }
  await spec().downloadAndInstall(update.apkUrl);
}

export interface DownloadProgress {
  /** Bytes downloaded so far. */
  downloaded: number;
  /** Total bytes, or -1 when the server didn't send a length. */
  total: number;
}

/**
 * Subscribe to `onDownloadProgress` while an update downloads.
 * Events are throttled natively (~every 256 KB).
 */
export function addDownloadProgressListener(
  listener: (progress: DownloadProgress) => void,
): () => void {
  if (MOCK_UPDATE) {
    mockProgress.add(listener);
    return () => mockProgress.delete(listener);
  }
  const emitter = getModuleEventEmitter(MODULE_NAME);
  const sub = emitter.addListener('onDownloadProgress', listener);
  return () => sub.remove();
}
