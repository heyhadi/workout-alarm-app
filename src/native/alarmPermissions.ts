/**
 * Ask for everything an alarm needs up front, while the user is awake and
 * setting it — not at 6 a.m. on the ringing screen, where a denied prompt
 * is a dead end.
 */
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import {
  getAlarmReadiness,
  isRingingModuleAvailable,
  openFullScreenIntentSettings,
  openOverlaySettings,
} from './ringing';

export async function ensureAlarmPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Android 13+: without notifications the full-screen alarm can't show.
  if (Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ).catch(() => undefined);
  }
  await Camera.requestCameraPermissionsAsync().catch(() => undefined);
  // Android 10+: the step-counter backup for when the camera can't count.
  if (Platform.Version >= 29) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    ).catch(() => undefined);
  }

  if (!isRingingModuleAvailable()) return;
  const readiness = await getAlarmReadiness().catch(() => null);
  if (!readiness) return;
  // One prompt at a time; Settings lists anything still missing.
  if (readiness.fullScreen && !readiness.overlay) {
    Alert.alert(
      'Let the alarm take over the screen',
      'Allow “Display over other apps” so the workout opens even while you’re using the phone. On Xiaomi, also allow “Display pop-up windows while running in the background”.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open settings',
          onPress: () => {
            openOverlaySettings().catch(() => undefined);
          },
        },
      ],
    );
    return;
  }
  if (!readiness.fullScreen) {
    Alert.alert(
      'Allow full-screen alarms',
      'Without this, the alarm rings but the workout screen won’t open over the lock screen.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open settings',
          onPress: () => {
            openFullScreenIntentSettings().catch(() => undefined);
          },
        },
      ],
    );
  }
}
