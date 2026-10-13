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

// The live React context in both architectures. `reactInstanceManager` is
// the old-architecture accessor: on RN 0.86 (bridgeless) it never yields
// the running context, so the event was silently dropped and an alarm that
// fired with the app open never reached /ringing.
const REACT_CONTEXT_EXPR =
  '(application as com.facebook.react.ReactApplication).reactHost?.currentReactContext';
const LEGACY_REACT_CONTEXT_EXPR = 'reactInstanceManager.currentReactContext';

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
      // Already applied — only upgrade output from an earlier plugin version.
      config.modResults.contents = contents.replace(
        LEGACY_REACT_CONTEXT_EXPR,
        REACT_CONTEXT_EXPR,
      );
      return config;
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
    // onNewIntent: when the app is already alive, the full-screen intent
    // reuses MainActivity via onNewIntent — without setIntent(), the
    // activity keeps the stale launcher intent and getRingingIntent()
    // never sees ACTION_RINGING (alarm rings with no workout screen).
    // We also emit a JS event: when the app is already foregrounded,
    // AppState never transitions to 'active', so JS would never re-check.
    const newIntentAnchor = 'override fun onCreate(';
    let updated = config.modResults.contents;
    if (!updated.includes('override fun onNewIntent(')) {
      updated = updated.replace(
        newIntentAnchor,
        'override fun onNewIntent(intent: android.content.Intent) {\n' +
          '    super.onNewIntent(intent)\n' +
          '    // Workout Alarm: keep the latest intent so getRingingIntent() sees it.\n' +
          '    setIntent(intent)\n' +
          '    if (intent.action == "' +
          RINGING_ACTION +
          '") {\n' +
          '      setShowWhenLocked(true)\n' +
          '      setTurnScreenOn(true)\n' +
          '      // Workout Alarm: app was already alive — push the event to JS\n' +
          '      // so the router can jump to /ringing without an AppState change.\n' +
          '      try {\n' +
          '        ' +
          REACT_CONTEXT_EXPR +
          '\n' +
          '          ?.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)\n' +
          '          ?.emit("onRingingIntent", null)\n' +
          '      } catch (_: Exception) { }\n' +
          '    }\n' +
          '  }\n\n  ' +
          newIntentAnchor,
      );
      config.modResults.contents = updated;
    }
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
