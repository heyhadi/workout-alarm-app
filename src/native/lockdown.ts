/**
 * LockdownModule — lock-task (kiosk) mode during an active alarm.
 *
 * Kotlin: android/.../lockdown/LockdownModule.kt. While an alarm is active,
 * Back/Home gestures are swallowed and the ringing activity stays on top.
 * Released only together with the alarm itself.
 */
import { getNativeModule, isNativeModuleAvailable } from './registry';

const MODULE_NAME = 'LockdownModule';

interface LockdownModuleSpec {
  enterLockTask(): Promise<boolean>;
  exitLockTask(): Promise<void>;
}

function spec(): LockdownModuleSpec {
  return getNativeModule<LockdownModuleSpec>(MODULE_NAME);
}

/**
 * Enter lock-task mode. Resolves true when the activity is pinned.
 * On non-device-owner phones Android shows a one-time system prompt —
 * expected on first use, handled by the native side.
 */
export async function enterLockTask(): Promise<boolean> {
  return spec().enterLockTask();
}

/** Exit lock-task mode. Called as part of alarm release only. */
export async function exitLockTask(): Promise<void> {
  await spec().exitLockTask();
}

export function isLockdownModuleAvailable(): boolean {
  return isNativeModuleAvailable(MODULE_NAME);
}
