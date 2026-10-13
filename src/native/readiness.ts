/**
 * Reads what the phone allows for the alarm and opens the right place to
 * allow what's missing — the data and actions behind the readiness
 * checklist (src/readiness/checklist.ts).
 */
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import {
  getAlarmReadiness,
  isRingingModuleAvailable,
  openAutostartSettings,
  openFullScreenIntentSettings,
  openOverlaySettings,
  requestIgnoreBatteryOptimizations,
} from './ringing';
import { confirmAutostart, isAutostartConfirmed } from '../storage/settings';
import {
  buildChecklist,
  type ChecklistItem,
  type ReadinessKey,
} from '../readiness/checklist';

const NEEDS_NOTIFICATION_PROMPT = Platform.OS === 'android' && Platform.Version >= 33;
const NEEDS_STEP_PROMPT = Platform.OS === 'android' && Platform.Version >= 29;

/** The checklist for this phone; empty without the native modules. */
export async function loadChecklist(): Promise<ChecklistItem[]> {
  if (!isRingingModuleAvailable()) return [];
  const [native, camera, steps] = await Promise.all([
    getAlarmReadiness(),
    Camera.getCameraPermissionsAsync(),
    NEEDS_STEP_PROMPT
      ? PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION)
      : Promise.resolve(true),
  ]);
  return buildChecklist({
    ...native,
    camera: camera.granted,
    steps,
    autostartConfirmed: isAutostartConfirmed(),
  });
}

/** Ask for a runtime permission; once "don't ask again" is set, open app info. */
async function requestOrOpenSettings(permission: string): Promise<void> {
  const result = await PermissionsAndroid.request(
    permission as Parameters<typeof PermissionsAndroid.request>[0],
  );
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    await Linking.openSettings();
  }
}

/**
 * Do whatever allows `key`: a system permission dialog, or the exact
 * settings page. The checklist rechecks when the app comes back.
 */
export async function allow(key: ReadinessKey): Promise<void> {
  switch (key) {
    case 'notifications':
      if (NEEDS_NOTIFICATION_PROMPT) {
        await requestOrOpenSettings(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } else {
        await Linking.openSettings();
      }
      return;
    case 'camera': {
      const result = await Camera.requestCameraPermissionsAsync();
      if (!result.granted && !result.canAskAgain) await Linking.openSettings();
      return;
    }
    case 'steps':
      await requestOrOpenSettings(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
      return;
    case 'fullScreen':
      return openFullScreenIntentSettings();
    case 'overlay':
      return openOverlaySettings();
    case 'battery':
      return requestIgnoreBatteryOptimizations();
    case 'autostart':
      return openAutostartSettings();
    case 'exactAlarms':
      await Linking.openSettings();
      return;
  }
}

/** The user switched Xiaomi Autostart on (Android can't tell us). */
export function markAutostartDone(): void {
  confirmAutostart();
}
