import { describe, expect, it } from 'vitest';
import {
  EXERCISE_COUNTER_CONFIGS,
  RepCounter,
  type RepCounterConfig,
} from '../src/workout/repCounter';

const squats: RepCounterConfig = EXERCISE_COUNTER_CONFIGS.squats;
// down ≤ 100° = bottom, up ≥ 160° = standing, 600–6000 ms per rep.

function fullRep(counter: RepCounter, startMs: number, cycleMs = 1200): void {
  // up → descending → down → ascending → up, evenly paced.
  counter.feed(170, startMs);
  counter.feed(130, startMs);
  counter.feed(90, startMs + cycleMs / 3);
  counter.feed(120, startMs + (2 * cycleMs) / 3);
  counter.feed(165, startMs + cycleMs);
}

describe('RepCounter', () => {
  it('counts one full, well-paced rep', () => {
    const counter = new RepCounter(squats);
    fullRep(counter, 0);
    expect(counter.snapshot.reps).toBe(1);
    expect(counter.snapshot.phase).toBe('up');
  });

  it('counts consecutive reps', () => {
    const counter = new RepCounter(squats);
    fullRep(counter, 0);
    fullRep(counter, 2000);
    fullRep(counter, 4000);
    expect(counter.snapshot.reps).toBe(3);
  });

  it('ignores a partial dip that never reaches the bottom', () => {
    const counter = new RepCounter(squats);
    counter.feed(170, 0);
    counter.feed(130, 100); // descending…
    counter.feed(165, 500); // …then back up without hitting bottom
    expect(counter.snapshot.reps).toBe(0);
    expect(counter.snapshot.phase).toBe('up');
  });

  it('ignores teleporting straight to the bottom (camera glitch / cheat)', () => {
    const counter = new RepCounter(squats);
    counter.feed(170, 0);
    counter.feed(85, 100); // bottom without a descent
    expect(counter.snapshot.phase).toBe('up');
    expect(counter.snapshot.reps).toBe(0);
  });

  it('rejects reps faster than minRepMs (shaking / cheating)', () => {
    const counter = new RepCounter(squats);
    fullRep(counter, 0, 300); // 300ms < 600ms minimum
    expect(counter.snapshot.reps).toBe(0);
  });

  it('abandons a stale cycle slower than maxRepMs', () => {
    const counter = new RepCounter(squats);
    counter.feed(170, 0);
    counter.feed(130, 0); // descending starts
    counter.feed(90, 1000); // down
    // …user rests at the bottom for 10s…
    const result = counter.feed(120, 11_000);
    expect(result.counted).toBe(false);
    expect(counter.snapshot.phase).toBe('up');
    expect(counter.snapshot.reps).toBe(0);
  });

  it('ignores invalid samples without changing state', () => {
    const counter = new RepCounter(squats);
    counter.feed(170, 0);
    counter.feed(Number.NaN, 100);
    counter.feed(-5, 200);
    expect(counter.snapshot.phase).toBe('up');
    expect(counter.snapshot.reps).toBe(0);
  });

  it('does not count skipping the ascent (down straight to up)', () => {
    const counter = new RepCounter(squats);
    counter.feed(170, 0);
    counter.feed(130, 0);
    counter.feed(90, 400); // down
    counter.feed(170, 900); // teleport to standing — sloppy, no count
    expect(counter.snapshot.reps).toBe(0);
  });

  it('reset() clears phase and rep count', () => {
    const counter = new RepCounter(squats);
    fullRep(counter, 0);
    expect(counter.snapshot.reps).toBe(1);
    counter.reset();
    expect(counter.snapshot).toEqual({ phase: 'up', reps: 0 });
  });

  it('rejects invalid configs', () => {
    expect(() => new RepCounter({ ...squats, downThresholdDeg: 170 })).toThrow(
      /downThresholdDeg/,
    );
    expect(() => new RepCounter({ ...squats, minRepMs: 9000 })).toThrow(/minRepMs/);
  });

  it('ships a config for every camera exercise', () => {
    for (const ex of ['squats', 'pushups', 'jumping_jacks', 'situps'] as const) {
      const cfg = EXERCISE_COUNTER_CONFIGS[ex];
      expect(cfg.downThresholdDeg).toBeLessThan(cfg.upThresholdDeg);
      expect(cfg.minRepMs).toBeLessThan(cfg.maxRepMs);
    }
  });
});
