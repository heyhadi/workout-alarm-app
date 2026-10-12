import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { Screen } from '../components/Screen';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import {
  getSettings,
  setBackupExercise,
  setEmergencyExit,
  setLockInMinutes,
  setStrictness,
} from '../storage/settings';
import { isAlarmModuleAvailable } from '../native/alarms';
import { isLockdownModuleAvailable } from '../native/lockdown';
import type { EmergencyExitMode, ExerciseType, StrictnessLevel } from '../types';
import { ExerciseChip } from '../components/ExerciseChip';

interface HealthRow {
  label: string;
  ok: boolean | null;
  detail: string;
}

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
 * Permissions health check, strictness level, emergency-exit setup,
 * backup exercise, lock-in default, battery-exemption status.
 */
export default function SettingsScreen() {
  const t = getSemanticTokens('day');
  const [cameraPermission] = useCameraPermissions();
  // Synchronous MMKV reads belong in lazy initializers, not effects.
  const [strictness, setStrictnessState] = useState<StrictnessLevel>(
    () => getSettings().strictness,
  );
  const [emergencyExit, setEmergencyExitState] = useState<EmergencyExitMode>(
    () => getSettings().emergencyExit,
  );
  const [backup, setBackup] = useState<ExerciseType>(
    () => getSettings().backupExercise,
  );
  const [lockIn, setLockIn] = useState(() => getSettings().lockInMinutes);

  const health: HealthRow[] = [
    {
      label: 'Camera',
      ok: cameraPermission?.granted ?? null,
      detail: 'Needed for rep verification.',
    },
    {
      label: 'Exact alarms',
      ok: isAlarmModuleAvailable() ? true : null,
      detail: isAlarmModuleAvailable()
        ? 'AlarmModule linked.'
        : 'Requires a dev build — check after prebuild.',
    },
    {
      label: 'Lock-task mode',
      ok: isLockdownModuleAvailable() ? true : null,
      detail: isLockdownModuleAvailable()
        ? 'LockdownModule linked.'
        : 'Requires a dev build — check after prebuild.',
    },
    {
      label: 'Battery optimisation exemption',
      ok: null,
      detail: 'Request on first alarm save in a dev build.',
    },
  ];

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

        <SectionTitle>Permissions health</SectionTitle>
        {health.map((row) => (
          <View
            key={row.label}
            style={[
              styles.card,
              { backgroundColor: t.bgSurface, borderColor: t.border },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    row.ok === true
                      ? primitives.success[500]
                      : row.ok === false
                        ? primitives.danger[500]
                        : primitives.warning[500],
                },
              ]}
            />
            <View style={styles.rowMain}>
              <Text style={[typeScale.label, { color: t.textPrimary }]}>
                {row.label}
              </Text>
              <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
                {row.detail}
              </Text>
            </View>
          </View>
        ))}

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
              styles.card,
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
              styles.card,
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
        <View style={styles.rowWrap}>
          <ExerciseChip
            exercise="steps"
            selected={backup === 'steps'}
            onSelect={(ex) => pick(backup, setBackup, setBackupExercise)(ex)}
          />
          <ExerciseChip
            exercise="jumping_jacks"
            selected={backup === 'jumping_jacks'}
            onSelect={(ex) => pick(backup, setBackup, setBackupExercise)(ex)}
          />
        </View>

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
