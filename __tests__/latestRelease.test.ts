import { describe, expect, it } from 'vitest';
import { updateFromRelease } from '../src/updates/latestRelease';

const url = (n: number) =>
  `https://github.com/heyhadi/workout-alarm-app/releases/download/build-${n}/workout-alarm-build-${n}.apk`;

const release = (n: number, assetUrl = url(n)) => ({
  tag_name: `build-${n}`,
  name: `Build ${n}`,
  assets: [{ browser_download_url: assetUrl }],
});

describe('updateFromRelease', () => {
  it('offers a newer CI build', () => {
    expect(updateFromRelease(release(12), 11)).toEqual({
      build: 12,
      apkUrl: url(12),
      title: 'Build 12',
    });
  });

  it('offers nothing when the installed build is current or newer', () => {
    expect(updateFromRelease(release(12), 12)).toBeNull();
    expect(updateFromRelease(release(12), 13)).toBeNull();
  });

  it('ignores releases that are not CI builds', () => {
    expect(updateFromRelease({ ...release(12), tag_name: 'v1.0.0' }, 1)).toBeNull();
  });

  it('only downloads APKs from this repo', () => {
    expect(
      updateFromRelease(release(12, 'https://evil.example.com/workout-alarm.apk'), 1),
    ).toBeNull();
    expect(
      updateFromRelease(
        release(
          12,
          'https://github.com/someone-else/workout-alarm-app/releases/download/build-12/a.apk',
        ),
        1,
      ),
    ).toBeNull();
  });

  it('needs an APK asset', () => {
    expect(updateFromRelease({ tag_name: 'build-12', assets: [] }, 1)).toBeNull();
    expect(updateFromRelease({ tag_name: 'build-12' }, 1)).toBeNull();
  });
});
