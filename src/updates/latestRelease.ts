/**
 * Reads the repo's latest GitHub release (published by CI as `build-<N>`
 * with a `workout-alarm-build-<N>.apk` asset). Pure — unit-tested.
 */

export const RELEASES_API =
  'https://api.github.com/repos/heyhadi/workout-alarm-app/releases/latest';

/** Only APKs from this repo's releases are ever downloaded. */
export const RELEASE_DOWNLOAD_PREFIX =
  'https://github.com/heyhadi/workout-alarm-app/releases/download/';

export interface AvailableUpdate {
  build: number;
  apkUrl: string;
  /** Release title, e.g. "Build 42". */
  title: string;
}

interface ReleaseJson {
  tag_name?: unknown;
  name?: unknown;
  assets?: unknown;
}

/**
 * The update to offer, or null when the latest release isn't newer than
 * `installedBuild`, isn't a CI build, or has no APK from this repo.
 */
export function updateFromRelease(
  release: ReleaseJson,
  installedBuild: number,
): AvailableUpdate | null {
  const match =
    typeof release.tag_name === 'string'
      ? /^build-(\d+)$/.exec(release.tag_name)
      : null;
  if (!match) return null;
  const build = Number(match[1]);
  if (!(build > installedBuild)) return null;

  const assets = Array.isArray(release.assets) ? release.assets : [];
  const apk = assets.find(
    (a): a is { browser_download_url: string } =>
      typeof a?.browser_download_url === 'string' &&
      a.browser_download_url.startsWith(RELEASE_DOWNLOAD_PREFIX) &&
      a.browser_download_url.endsWith('.apk'),
  );
  if (!apk) return null;

  return {
    build,
    apkUrl: apk.browser_download_url,
    title:
      typeof release.name === 'string' && release.name
        ? release.name
        : `Build ${build}`,
  };
}
