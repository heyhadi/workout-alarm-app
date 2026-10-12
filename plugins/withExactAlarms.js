/**
 * withExactAlarms — exact-alarm scheduling.
 *
 * - Manifest: SCHEDULE_EXACT_ALARM + USE_EXACT_ALARM (Android 12+).
 * - Copies AlarmModule.kt + AlarmReceiver.kt into android/.
 *
 * The user grants "Alarms & reminders" on first schedule; without it
 * setAlarmClock() degrades and the plan's on-time guarantee is void —
 * the Settings screen surfaces this in the permissions health check.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const {
  addApplicationComponent,
  addUsesPermissions,
  copyKotlinSources,
} = require('./lib');

const KOTLIN_FILES = [
  'com/workoutalarm/app/alarm/AlarmModule.kt',
  'com/workoutalarm/app/alarm/AlarmReceiver.kt',
];

const withExactAlarms = (config) => {
  config = withAndroidManifest(config, (config) => {
    addUsesPermissions(config.modResults, [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
    ]);
    // AlarmReceiver is fired by our own exact-alarm PendingIntent: it must be
    // declared (no intent-filter needed for an explicit broadcast).
    addApplicationComponent(config.modResults, 'receiver', {
      $: {
        'android:name': 'com.workoutalarm.app.alarm.AlarmReceiver',
        'android:exported': 'false',
        'android:enabled': 'true',
      },
    });
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

module.exports = withExactAlarms;
