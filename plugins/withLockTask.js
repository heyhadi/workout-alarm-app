/**
 * withLockTask — lock-task (kiosk) mode during an active alarm.
 *
 * startLockTask()/stopLockTask() are runtime APIs: no manifest entries
 * are required. This plugin exists so the LockdownModule Kotlin source is
 * tracked, copied, and never lost on `prebuild --clean` — same guarantee
 * as the other native pieces.
 *
 * Note: on non-device-owner phones the first enterLockTask() shows a
 * one-time system prompt. That is expected OS behavior, not a bug.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const { copyKotlinSources } = require('./lib');

const KOTLIN_FILES = ['com/workoutalarm/app/lockdown/LockdownModule.kt'];

const withLockTask = (config) => {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      copyKotlinSources(config.modRequest.projectRoot, KOTLIN_FILES);
      return config;
    },
  ]);
  return config;
};

module.exports = withLockTask;
