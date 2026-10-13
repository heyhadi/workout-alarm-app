/**
 * StepModule — backup counting when the camera can't count reps.
 *
 * Kotlin: android/.../steps/StepModule.kt (hardware step counter).
 * Emits `onStepCounted` { total } — steps since startStepCounting().
 */
import { PermissionsAndroid, Platform } from 'react-native';
import {
  getModuleEventEmitter,
  getNativeModule,
  isNativeModuleAvailable,
} from './registry';

const MODULE_NAME = 'StepModule';

/** Steps owed per rep when walking replaces the camera workout. */
export const STEPS_PER_REP = 3;

interface StepModuleSpec {
  isStepCountingAvailable(): Promise<boolean>;
  startStepCounting(): Promise<void>;
  stopStepCounting(): Promise<void>;
}

function spec(): StepModuleSpec {
  return getNativeModule<StepModuleSpec>(MODULE_NAME);
}

export function isStepModuleAvailable(): boolean {
  return isNativeModuleAvailable(MODULE_NAME);
}

/** True when the phone has a step counter and the app may read it. */
export async function prepareStepCounting(): Promise<boolean> {
  if (!isStepModuleAvailable()) return false;
  if (
    !(await spec()
      .isStepCountingAvailable()
      .catch(() => false))
  )
    return false;
  if (Platform.OS === 'android' && Platform.Version >= 29) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    ).catch(() => PermissionsAndroid.RESULTS.DENIED);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export async function startStepCounting(): Promise<void> {
  await spec().startStepCounting();
}

export async function stopStepCounting(): Promise<void> {
  await spec().stopStepCounting();
}

export function addStepCountedListener(
  listener: (payload: { total: number }) => void,
): () => void {
  const sub = getModuleEventEmitter(MODULE_NAME).addListener('onStepCounted', listener);
  return () => sub.remove();
}
