/**
 * Pure helpers over the design tokens. No React Native imports —
 * unit-tested with vitest.
 */
import { primitives, semantic, type Mode, type SemanticTokens } from './tokens';

export type { Mode, SemanticTokens };

/** Semantic token set for the given UI mode. */
export function getSemanticTokens(mode: Mode): SemanticTokens {
  return semantic[mode];
}

/** True for `#RGB`, `#RRGGBB` (case-insensitive). */
export function isValidHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** `#RRGGBB` + alpha 0..1 → `rgba(r, g, b, a)`. Throws on invalid input. */
export function hexToRgba(hex: string, alpha: number): string {
  if (!isValidHexColor(hex)) {
    throw new Error(`hexToRgba: invalid hex color "${hex}"`);
  }
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error(`hexToRgba: alpha must be in [0, 1], got ${alpha}`);
  }
  let h = hex.slice(1);
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Every primitive color in the palette, flattened. Useful for a
 * theme-integrity test that guards against typos in token values.
 */
export function allPrimitiveColors(): string[] {
  const out: string[] = [primitives.surfaceDark, primitives.white];
  const shadeGroups: Array<Record<number, string>> = [
    primitives.energy,
    primitives.ink,
  ];
  for (const group of shadeGroups) {
    out.push(...Object.values(group));
  }
  const singleGroups: Array<{ 500: string }> = [
    primitives.success,
    primitives.warning,
    primitives.danger,
    primitives.info,
  ];
  for (const group of singleGroups) {
    out.push(group[500]);
  }
  return out;
}
