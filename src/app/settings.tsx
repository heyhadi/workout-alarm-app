import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { useAlarmReadiness } from '../hooks/useAlarmReadiness';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import {
  getSettings,
  setEmergencyExit,
  setLockInMinutes,
  setStrictness,
} from '../storage/settings';
import { STEPS_PER_REP } from '../native/steps';
import type { EmergencyExitMode, StrictnessLevel } from '../types';

function SectionTitle({ children }: { children: string }) {
  const t = getSemanticTokens('day');
  return (
    <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
      {children}
    </Text>
  );
}

/**
 * Screen 6 — Settings & strictness.
 * Alarm readiness (links to the checklist), strictness level,
 * emergency-exit setup, step backup, lock-in default.
 */
export default function SettingsScreen() {
  const t = getSemanticTokens('day');
  const router = useRouter();
  const { items, pending } = useAlarmReadiness();
  // Synchronous MMKV reads belong in lazy initializers, not effects.
  const [strictness, setStrictnessState] = useState<StrictnessLevel>(
    () => getSettings().strictness,
  );
  const [emergencyExit, setEmergencyExitState] = useState<EmergencyExitMode>(
    () => getSettings().emergencyExit,
  );
  const [lockIn, setLockIn] = useState(() => getSettings().lockInMinutes);
  const pick =
    <T,>(current: T, set: (v: T) => void, persist: (v: T) => void) =>
    (v: T) => {
      set(v);
      persist(v);
    };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typeScale.display, { color: t.textPrimary, fontSize: 32 }]}>
          Settings
        </Text>

        <SectionTitle>Alarm readiness</SectionTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/readiness')}
          style={[styles.card, { backgroundColor: t.bgSurface, borderColor: t.border }]}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  items === null || items.length === 0
                    ? primitives.warning[500]
                    : pending === 0
                      ? primitives.success[500]
                      : primitives.danger[500],
              },
            ]}
          />
          <View style={styles.rowMain}>
            <Text style={[typeScale.label, { color: t.textPrimary }]}>
              {items && items.length > 0 && pending === 0
                ? 'Ready'
                : items && items.length > 0
                  ? `${pending} to fix`
                  : 'Requires a dev build'}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              Permissions the alarm needs to ring, take over the screen and be finished.
            </Text>
          </View>
        </Pressable>

        <SectionTitle>Strictness level</SectionTitle>
        {(
          [
            ['standard', 'Lock-task + recovery. Play Store friendly.'],
            ['maximum', 'Device-owner controls. Harder install and review.'],
          ] as [StrictnessLevel, string][]
        ).map(([level, detail]) => (
          <Pressable
            key={level}
            onPress={() => pick(strictness, setStrictnessState, setStrictness)(level)}
            style={[
              styles.option,
              {
                backgroundColor: t.bgSurface,
                borderColor: strictness === level ? t.actionPrimary : t.border,
              },
            ]}
          >
            <Text style={[typeScale.label, { color: t.textPrimary }]}>
              {level === 'standard' ? 'Standard' : 'Maximum'}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {detail}
            </Text>
          </Pressable>
        ))}

        <SectionTitle>Emergency exit</SectionTitle>
        {(
          [
            ['none', 'No valve at all. Absolute strictness.'],
            ['slow', 'Deliberately painful exit, set up in advance, off by default.'],
          ] as [EmergencyExitMode, string][]
        ).map(([mode, detail]) => (
          <Pressable
            key={mode}
            onPress={() =>
              pick(emergencyExit, setEmergencyExitState, setEmergencyExit)(mode)
            }
            style={[
              styles.option,
              {
                backgroundColor: t.bgSurface,
                borderColor: emergencyExit === mode ? t.actionPrimary : t.border,
              },
            ]}
          >
            <Text style={[typeScale.label, { color: t.textPrimary }]}>
              {mode === 'none' ? 'None' : 'Slow safety valve'}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {detail}
            </Text>
          </Pressable>
        ))}

        <SectionTitle>Backup if camera fails</SectionTitle>
        <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
          {`Walk it off: ${STEPS_PER_REP} steps per rep, counted by the step sensor. Used when the camera is blocked, denied or can’t see you for 2 minutes.`}
        </Text>

        <SectionTitle>Default lock-in window</SectionTitle>
        <View style={styles.rowWrap}>
          {[15, 30, 45, 60].map((mins) => (
            <Pressable
              key={mins}
              onPress={() => pick(lockIn, setLockIn, setLockInMinutes)(mins)}
              style={[
                styles.mini,
                {
                  backgroundColor: lockIn === mins ? t.stateLocked : t.bgSurface,
                  borderColor: t.border,
                },
              ]}
            >
              <Text
                style={[
                  typeScale.bodySmall,
                  { color: lockIn === mins ? t.textOnAccent : t.textPrimary },
                ]}
              >
                {`${mins}m`}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl },
  section: { marginTop: space.lg, marginBottom: space.sm },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Selectable option: title above its description.
  option: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    gap: space.xs,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: space.md },
  rowMain: { flex: 1 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  mini: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.sm,
  },
});
