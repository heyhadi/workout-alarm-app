import { describe, expect, it } from 'vitest';
import {
  allPrimitiveColors,
  getSemanticTokens,
  hexToRgba,
  isValidHexColor,
} from '../theme/helpers';
import { primitives, space } from '../theme/tokens';

describe('design tokens', () => {
  it('matches the plan’s exact primitive values', () => {
    expect(primitives.energy[500]).toBe('#FF6B1A');
    expect(primitives.energy[600]).toBe('#E8550A');
    expect(primitives.energy[400]).toBe('#FF8A4D');
    expect(primitives.energy[50]).toBe('#FFF3EC');
    expect(primitives.ink[900]).toBe('#0F2040');
    expect(primitives.ink[950]).toBe('#0A162E');
    expect(primitives.ink[700]).toBe('#33415E');
    expect(primitives.ink[500]).toBe('#5A677F');
    expect(primitives.ink[100]).toBe('#E6EAF0');
    expect(primitives.ink[50]).toBe('#F6F8FB');
    expect(primitives.success[500]).toBe('#0E9F6E');
    expect(primitives.warning[500]).toBe('#F5A300');
    expect(primitives.danger[500]).toBe('#E5484D');
    expect(primitives.info[500]).toBe('#2F6FED');
    expect(primitives.surfaceDark).toBe('#14294D');
    expect(primitives.white).toBe('#FFFFFF');
  });

  it('every primitive color is a valid hex color', () => {
    for (const color of allPrimitiveColors()) {
      expect(isValidHexColor(color), color).toBe(true);
    }
  });

  it('day mode is light, alarm mode is dark', () => {
    const day = getSemanticTokens('day');
    const alarm = getSemanticTokens('alarm');
    expect(day.bgScreen).toBe(primitives.ink[50]);
    expect(alarm.bgScreen).toBe(primitives.ink[950]);
    expect(day.bgSurface).toBe(primitives.white);
    expect(alarm.bgSurface).toBe(primitives.surfaceDark);
  });

  it('action + state tokens are mode-independent (one meaning, one color)', () => {
    const day = getSemanticTokens('day');
    const alarm = getSemanticTokens('alarm');
    expect(day.actionPrimary).toBe(alarm.actionPrimary);
    expect(day.stateLocked).toBe(alarm.stateLocked);
    expect(day.stateDone).toBe(alarm.stateDone);
  });

  it('spacing scale is 4pt-based', () => {
    for (const value of Object.values(space)) {
      expect(value % 4).toBe(0);
    }
    expect(space.md).toBe(16); // screen padding
    expect(space.lg).toBe(24); // card padding
  });
});

describe('hexToRgba', () => {
  it('converts 6-digit hex with alpha', () => {
    expect(hexToRgba('#FF6B1A', 0.5)).toBe('rgba(255, 107, 26, 0.5)');
  });

  it('expands 3-digit hex', () => {
    expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('rejects invalid input', () => {
    expect(() => hexToRgba('FF6B1A', 0.5)).toThrow();
    expect(() => hexToRgba('#GGGGGG', 0.5)).toThrow();
    expect(() => hexToRgba('#FF6B1A', 2)).toThrow();
  });
});

describe('dark appearance', () => {
  it('switches day mode to the dark set, never the alarm screen', () => {
    expect(getSemanticTokens('day', 'light').bgSurface).toBe(primitives.white);
    expect(getSemanticTokens('day', 'dark').bgSurface).toBe(primitives.surfaceDark);
    expect(getSemanticTokens('alarm', 'light')).toBe(
      getSemanticTokens('alarm', 'dark'),
    );
  });

  it('defines every token in every set', () => {
    const keys = Object.keys(getSemanticTokens('day')).sort();
    expect(Object.keys(getSemanticTokens('day', 'dark')).sort()).toEqual(keys);
    expect(Object.keys(getSemanticTokens('alarm')).sort()).toEqual(keys);
  });
});
