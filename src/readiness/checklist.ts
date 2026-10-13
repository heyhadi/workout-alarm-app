/**
 * Alarm readiness: everything the phone must allow for the alarm to ring
 * on time, take over the screen and stay completable. Pure — unit-tested.
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
  title: string;
  /** What breaks without it, in plain words. */
  why: string;
  state: ItemState;
}

const ITEMS: { key: Exclude<ReadinessKey, 'autostart'>; title: string; why: string }[] =
  [
    {
      key: 'notifications',
      title: 'Notifications',
      why: 'Without them the alarm can’t show or open the workout.',
    },
    {
      key: 'fullScreen',
      title: 'Full-screen alarms',
      why: 'Opens the workout over the lock screen.',
    },
    {
      key: 'overlay',
      title: 'Open over other apps',
      why: 'Takes over the screen while you’re using the phone.',
    },
    {
      key: 'battery',
      title: 'Battery: no restrictions',
      why: 'Keeps the alarm from being stopped overnight.',
    },
    { key: 'camera', title: 'Camera', why: 'Counts your reps.' },
    {
      key: 'steps',
      title: 'Step counter',
      why: 'Backup when the camera can’t count.',
    },
    { key: 'exactAlarms', title: 'Exact alarms', why: 'Rings on the minute.' },
  ];

export function buildChecklist(status: ReadinessStatus): ChecklistItem[] {
  const items: ChecklistItem[] = ITEMS.map(({ key, title, why }) => ({
    key,
    title,
    why,
    state: status[key] ? 'ok' : 'missing',
  }));
  if (status.xiaomi) {
    // After "Open over other apps", before the battery row.
    items.splice(3, 0, {
      key: 'autostart',
      title: 'Xiaomi: Autostart',
      why: 'Android can’t check this one — switch it on, then tap Done.',
      state: status.autostartConfirmed ? 'ok' : 'unverifiable',
    });
  }
  return items;
}

/** Rows still needing attention (missing, or unconfirmed). */
export function pendingCount(items: ChecklistItem[]): number {
  return items.filter((item) => item.state !== 'ok').length;
}
