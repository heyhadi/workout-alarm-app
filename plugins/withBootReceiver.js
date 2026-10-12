/**
 * withBootReceiver — survive restarts, dead batteries, and clock changes.
 *
 * - Manifest: RECEIVE_BOOT_COMPLETED + BootReceiver / TimeChangeReceiver
 *   declarations (exported, with the BOOT_COMPLETED / TIME_SET /
 *   TIMEZONE_CHANGED intent filters).
 * - Copies BootReceiver.kt + TimeChangeReceiver.kt into android/.
 *
 * Both receivers re-arm from SharedPreferences written by AlarmModule —
 * no JS runtime needed, so a restart at 5:55 a.m. still rings at 6:00.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const {
  addApplicationComponent,
  addUsesPermissions,
  copyKotlinSources,
} = require('./lib');

const KOTLIN_FILES = [
  'com/workoutalarm/app/alarm/BootReceiver.kt',
  'com/workoutalarm/app/alarm/TimeChangeReceiver.kt',
];

function receiverEntry(name, actions) {
  return {
    $: {
      'android:name': name,
      'android:exported': 'true',
      'android:enabled': 'true',
    },
    'intent-filter': [
      {
        action: actions.map((a) => ({ $: { 'android:name': a } })),
      },
    ],
  };
}

const withBootReceiver = (config) => {
  config = withAndroidManifest(config, (config) => {
    addUsesPermissions(config.modResults, [
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ]);
    addApplicationComponent(
      config.modResults,
      'receiver',
      receiverEntry('com.workoutalarm.app.alarm.BootReceiver', [
        'android.intent.action.BOOT_COMPLETED',
        'android.intent.action.QUICKBOOT_POWERON',
      ]),
    );
    addApplicationComponent(
      config.modResults,
      'receiver',
      receiverEntry('com.workoutalarm.app.alarm.TimeChangeReceiver', [
        'android.intent.action.TIME_SET',
        'android.intent.action.TIMEZONE_CHANGED',
      ]),
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

module.exports = withBootReceiver;
