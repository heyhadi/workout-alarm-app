/**
 * withRingingService — the unskippable ringing state.
 *
 * - Manifest: foreground-service permissions, the RingingService
 *   declaration (mediaPlayback type), USE_FULL_SCREEN_INTENT,
 *   POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK.
 * - MainActivity: show over the lock screen when launched by the
 *   full-screen ringing intent (ACTION_RINGING).
 * - Copies RingingService.kt + RingingModule.kt into android/.
 */
const {
  withAndroidManifest,
  withDangerousMod,
  withMainActivity,
} = require('@expo/config-plugins');
const {
  addApplicationComponent,
  addUsesPermissions,
  copyKotlinSources,
} = require('./lib');

const KOTLIN_FILES = [
  'com/workoutalarm/app/ringing/RingingService.kt',
  'com/workoutalarm/app/ringing/RingingModule.kt',
];

const RINGING_ACTION = 'com.workoutalarm.app.RINGING';

const withRingingService = (config) => {
  config = withAndroidManifest(config, (config) => {
    addUsesPermissions(config.modResults, [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
    ]);
    addApplicationComponent(config.modResults, 'service', {
      $: {
        'android:name': 'com.workoutalarm.app.ringing.RingingService',
        'android:foregroundServiceType': 'mediaPlayback',
        'android:exported': 'false',
      },
    });
    return config;
  });

  // MainActivity shows over the lock screen for the ringing intent.
  config = withMainActivity(config, (config) => {
    const { contents } = config.modResults;
    const anchor = 'super.onCreate(';
    if (!contents.includes(anchor)) {
      console.warn(
        '[withRingingService] super.onCreate anchor not found; skipping lock-screen flags',
      );
      return config;
    }
    if (contents.includes(RINGING_ACTION)) {
      return config; // already applied
    }
    config.modResults.contents = contents.replace(
      /super\.onCreate\([^)]*\)/,
      (match) =>
        `${match}\n    // Workout Alarm: full-screen ringing over the lock screen.\n` +
        `    if (intent?.action == "${RINGING_ACTION}") {\n` +
        `      setShowWhenLocked(true)\n` +
        `      setTurnScreenOn(true)\n` +
        `    }`,
    );
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      copyKotlinSources(config.modRequest.projectRoot, KOTLIN_FILES);
      return config;
    },
  ]);

  return config;
};

module.exports = withRingingService;
