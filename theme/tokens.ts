/**
 * Design tokens — Workout Alarm app.
 * Source of truth from the app plan (pages 9-10). Day mode is light and calm;
 * Alarm mode is dark, huge, and glanceable. Orange is rationed: it means
 * "act now" and never decorates.
 *
 * Mirrored as native color resources for the ringing Activity so the JS UI
 * and the native alarm screen can never drift apart (see android/ colors).
 */

export const primitives = {
  energy: {
    500: '#FF6B1A', // Primary
    600: '#E8550A', // Pressed
    400: '#FF8A4D', // Highlight
    50: '#FFF3EC', // Soft fill
  },
  ink: {
    900: '#0F2040', // Midnight
    950: '#0A162E', // Alarm bg
    700: '#33415E', // Secondary
    500: '#5A677F', // Muted text
    100: '#E6EAF0', // Borders
    50: '#F6F8FB', // Day bg
  },
  success: { 500: '#0E9F6E' }, // Done
  warning: { 500: '#F5A300' }, // Lock-in
  danger: { 500: '#E5484D' }, // Errors only
  info: { 500: '#2F6FED' }, // Info / links
  surfaceDark: '#14294D', // Dark card
  white: '#FFFFFF', // Surface
} as const;

import type { FontVariant } from 'react-native';

export type Mode = 'day' | 'alarm';

/** Light or dark appearance for day mode (alarm mode is always dark). */
export type Scheme = 'light' | 'dark';

/** Mutable on purpose: RN's TextStyle wants FontVariant[], not readonly. */
const tabularNums: FontVariant[] = ['tabular-nums'];

/** Semantic tokens — what code actually uses. */
export const semantic = {
  day: {
    bgScreen: primitives.ink[50],
    bgSurface: primitives.white,
    textPrimary: primitives.ink[900],
    textSecondary: primitives.ink[500],
    textOnAccent: primitives.white,
    border: primitives.ink[100],
    actionPrimary: primitives.energy[500],
    actionPrimaryPressed: primitives.energy[600],
    stateLocked: primitives.warning[500],
    stateDone: primitives.success[500],
    stateDanger: primitives.danger[500],
    /** Selected option fill, wheel band, soft badges. */
    accentSoft: primitives.energy[50],
    /** Selected option border/text, accent links. */
    accentStrong: primitives.energy[600],
    /** Selected option/segment: soft orange tint, orange text and border. */
    selectedBg: primitives.energy[50],
    selectedFg: primitives.energy[600],
    selectedBorder: primitives.energy[600],
  },
  /** Day screens in dark appearance: the alarm navy, softer accents. */
  dayDark: {
    bgScreen: primitives.ink[950],
    bgSurface: primitives.surfaceDark,
    textPrimary: primitives.white,
    textSecondary: '#C2CEDF',
    textOnAccent: primitives.white,
    border: primitives.ink[700],
    actionPrimary: primitives.energy[500],
    actionPrimaryPressed: primitives.energy[600],
    stateLocked: primitives.warning[500],
    stateDone: primitives.success[500],
    stateDanger: primitives.danger[500],
    // Selected = a raised, lighter navy with orange text. An orange tint
    // turns muddy brown on navy, so dark mode lifts instead of tints.
    accentSoft: '#22396A',
    accentStrong: primitives.energy[400],
    // Selected = solid orange with white text, like the primary button.
    selectedBg: primitives.energy[500],
    selectedFg: primitives.white,
    selectedBorder: primitives.energy[500],
  },
  alarm: {
    bgScreen: primitives.ink[950],
    bgSurface: primitives.surfaceDark,
    textPrimary: primitives.white,
    textSecondary: '#C2CEDF',
    textOnAccent: primitives.white,
    border: primitives.ink[700],
    actionPrimary: primitives.energy[500],
    actionPrimaryPressed: primitives.energy[600],
    stateLocked: primitives.warning[500],
    stateDone: primitives.success[500],
    stateDanger: primitives.danger[500],
    accentSoft: 'rgba(255, 107, 26, 0.16)',
    accentStrong: primitives.energy[400],
    selectedBg: primitives.energy[500],
    selectedFg: primitives.white,
    selectedBorder: primitives.energy[500],
  },
} as const;

export type SemanticTokens = (typeof semantic)[keyof typeof semantic];

/** Font families — load via expo-font before first render. */
export const fonts = {
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
  body: 'Inter_400Regular',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/** Type scale. Tabular numerals everywhere a count or clock appears. */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  alarmClock: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 60,
    fontVariant: tabularNums,
  },
  repCounter: {
    fontFamily: fonts.display,
    fontSize: 72,
    lineHeight: 72,
    fontVariant: tabularNums,
  },
  heading: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

/** 4pt spacing scale. Screen padding is always spaceMd; cards breathe with spaceLg inside. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/** Two shadows only. */
export const elevation = {
  1: {
    shadowColor: '#0F2040',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  2: {
    shadowColor: '#0F2040',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

/** Core component specs derived from tokens. */
export const components = {
  /** Primary button: 56dp tall, radius-lg, action/primary fill. One per screen.
   *  In Alarm mode there is deliberately no button component at all. */
  primaryButton: {
    height: 56,
    borderRadius: radius.lg,
    labelStyle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      lineHeight: 24,
      color: primitives.white,
    },
  },
  /** Alarm card: big tabular time left, exercise + reps under it, toggle right. */
  alarmCard: {
    borderRadius: radius.lg,
    padding: space.lg,
  },
  /** Rep progress ring: energy-500 ring on surface-dark track, rep-counter type centered. */
  repRing: {
    trackColor: primitives.surfaceDark,
    progressColor: primitives.energy[500],
    strokeWidth: 12,
    size: 240,
  },
  /** Exercise chip: pill, radius-full. */
  exerciseChip: {
    borderRadius: radius.full,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
} as const;

/** Accessibility floors. */
export const a11y = {
  minContrast: 4.5,
  minTouchTarget: 48,
} as const;

/** Motion: 150-250ms, ease-out, feedback only. */
export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
} as const;

export const tokens = {
  primitives,
  semantic,
  fonts,
  type,
  space,
  radius,
  elevation,
  components,
  a11y,
  motion,
} as const;

export default tokens;
