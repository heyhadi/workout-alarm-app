/**
 * Alarm readiness: everything the phone must allow for the alarm to ring
 * on time, take over the screen and stay completable. Pure — unit-tested.
 * Row titles and explanations live in the i18n strings, keyed by `key`.
 */

export type ReadinessKey =
  | 'notifications'
  | 'fullScreen'
  | 'overlay'
  | 'battery'
  | 'autostart'
  | 'camera'
  | 'steps'
  | 'exactAlarms';

export interface ReadinessStatus {
  notifications: boolean;
  fullScreen: boolean;
  overlay: boolean;
  battery: boolean;
  camera: boolean;
  steps: boolean;
  exactAlarms: boolean;
  /** Xiaomi phone: Autostart matters but Android can't report it. */
  xiaomi: boolean;
  /** The user confirmed they switched Autostart on. */
  autostartConfirmed: boolean;
}

/** ok · missing · unverifiable (the system can't tell us; user confirms). */
export type ItemState = 'ok' | 'missing' | 'unverifiable';

export interface ChecklistItem {
  key: ReadinessKey;
  state: ItemState;
}

/** Display order (Xiaomi Autostart is inserted after "overlay"). */
const KEYS: Exclude<ReadinessKey, 'autostart'>[] = [
  'notifications',
  'fullScreen',
  'overlay',
  'battery',
  'camera',
  'steps',
  'exactAlarms',
];

export function buildChecklist(status: ReadinessStatus): ChecklistItem[] {
  const items: ChecklistItem[] = KEYS.map((key) => ({
    key,
    state: status[key] ? 'ok' : 'missing',
  }));
  if (status.xiaomi) {
    // After "Open over other apps", before the battery row.
    items.splice(3, 0, {
      key: 'autostart',
      state: status.autostartConfirmed ? 'ok' : 'unverifiable',
    });
  }
  return items;
}

/** Rows still needing attention (missing, or unconfirmed). */
export function pendingCount(items: ChecklistItem[]): number {
  return items.filter((item) => item.state !== 'ok').length;
}
