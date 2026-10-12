/**
 * Small helper to resolve a Kotlin TurboModule / legacy native module by name.
 * Throws NativeBridgeNotAvailableError when the module is missing so call
 * sites fail loudly during development instead of silently doing nothing.
 */
import { NativeEventEmitter, NativeModules } from 'react-native';
import { NativeBridgeNotAvailableError } from './errors';

/**
 * Structural twin of the (non-exported) NativeModule type that
 * NativeEventEmitter's constructor expects.
 */
interface EmitterCapableModule {
  addListener: (eventType: string) => void;
  removeListeners: (count: number) => void;
}

export function getNativeModule<T>(name: string): T {
  const mod = (NativeModules as Record<string, unknown>)[name];
  if (mod === undefined || mod === null) {
    throw new NativeBridgeNotAvailableError(name);
  }
  return mod as T;
}

/**
 * True when the module is linked (dev builds). False in Expo Go / web,
 * where call sites should degrade gracefully.
 */
export function isNativeModuleAvailable(name: string): boolean {
  const mod = (NativeModules as Record<string, unknown>)[name];
  return mod !== undefined && mod !== null;
}

/** Event emitter for a linked native module's bridge events. */
export function getModuleEventEmitter(name: string): NativeEventEmitter {
  const mod = getNativeModule<EmitterCapableModule>(name);
  return new NativeEventEmitter(mod);
}
