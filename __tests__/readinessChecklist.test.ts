import { describe, expect, it } from 'vitest';
import {
  buildChecklist,
  pendingCount,
  type ReadinessStatus,
} from '../src/readiness/checklist';

const allowed: ReadinessStatus = {
  notifications: true,
  fullScreen: true,
  overlay: true,
  battery: true,
  camera: true,
  steps: true,
  exactAlarms: true,
  xiaomi: false,
  autostartConfirmed: false,
};

describe('buildChecklist', () => {
  it('is all ok when everything is allowed', () => {
    const items = buildChecklist(allowed);
    expect(items.every((i) => i.state === 'ok')).toBe(true);
    expect(pendingCount(items)).toBe(0);
  });

  it('marks each denied permission missing', () => {
    const items = buildChecklist({ ...allowed, overlay: false, battery: false });
    expect(items.filter((i) => i.state === 'missing').map((i) => i.key)).toEqual([
      'overlay',
      'battery',
    ]);
    expect(pendingCount(items)).toBe(2);
  });

  it('only lists Xiaomi Autostart on Xiaomi, unverifiable until confirmed', () => {
    expect(buildChecklist(allowed).some((i) => i.key === 'autostart')).toBe(false);

    const unconfirmed = buildChecklist({ ...allowed, xiaomi: true });
    const autostart = unconfirmed.find((i) => i.key === 'autostart');
    expect(autostart?.state).toBe('unverifiable');
    expect(pendingCount(unconfirmed)).toBe(1);

    const confirmed = buildChecklist({
      ...allowed,
      xiaomi: true,
      autostartConfirmed: true,
    });
    expect(pendingCount(confirmed)).toBe(0);
  });
});
