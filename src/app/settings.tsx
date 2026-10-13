import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { useAlarmReadiness } from '../hooks/useAlarmReadiness';
import { systemLanguage, useLanguageSetting, useStrings } from '../i18n';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import {
  getSettings,
  setEmergencyExit,
  setLockInMinutes,
  setStrictness,
  type LanguageSetting,
} from '../storage/settings';
import { STEPS_PER_REP } from '../native/steps';
import type { EmergencyExitMode, StrictnessLevel } from '../types';

const LOCK_IN_OPTIONS = [15, 30, 45, 60];

function SectionTitle({ children }: { children: string }) {
  const t = getSemanticTokens('day');
  return (
    <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
      {children}
    </Text>
  );
}

/** One card, hairline-separated rows — every section on this screen uses it. */
function Group({ children }: { children: ReactNode }) {
  const t = getSemanticTokens('day');
  return (
    <View
      style={[styles.group, { backgroundColor: t.bgSurface, borderColor: t.border }]}
    >
      {children}
    </View>
  );
}

interface Choice<T> {
  value: T;
  title: string;
  detail?: string;
}

/** Single choice: rows in a Group, an orange check on the selected one. */
function ChoiceGroup<T extends string>({
  choices,
  selected,
  onSelect,
}: {
  choices: Choice<T>[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const t = getSemanticTokens('day');
  return (
    <Group>
      {choices.map((choice, index) => {
        const isSelected = choice.value === selected;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onSelect(choice.value)}
            style={[
              styles.row,
              index > 0 && [styles.divider, { borderTopColor: t.border }],
            ]}
          >
            <View style={styles.rowMain}>
              <Text style={[typeScale.label, { color: t.textPrimary }]}>
                {choice.title}
              </Text>
              {choice.detail ? (
                <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
                  {choice.detail}
                </Text>
              ) : null}
            </View>
            <Text style={[typeScale.heading, styles.check, { color: t.actionPrimary }]}>
              {isSelected ? '✓' : ''}
            </Text>
          </Pressable>
        );
      })}
    </Group>
  );
}

/**
 * Screen 6 — Settings & strictness.
 * Language, alarm readiness (links to the checklist), strictness level,
 * emergency-exit setup, step backup, lock-in default.
 */
export default function SettingsScreen() {
  const t = getSemanticTokens('day');
  const strings = useStrings();
  const [language, setLanguage] = useLanguageSetting();
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

  const s = strings.settings;
  const hasReadiness = items !== null && items.length > 0;
  const readinessColor = !hasReadiness
    ? primitives.warning[500]
    : pending === 0
      ? primitives.success[500]
      : primitives.danger[500];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typeScale.display, { color: t.textPrimary, fontSize: 32 }]}>
          {s.title}
        </Text>

        <SectionTitle>{s.language}</SectionTitle>
        <ChoiceGroup<LanguageSetting>
          selected={language}
          onSelect={setLanguage}
          choices={[
            {
              value: 'system',
              title: s.languageOptions.system,
              detail: s.languageOptions[systemLanguage()],
            },
            { value: 'en', title: s.languageOptions.en },
            { value: 'id', title: s.languageOptions.id },
          ]}
        />

        <SectionTitle>{s.readiness}</SectionTitle>
        <Group>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/readiness')}
            style={styles.row}
          >
            <View style={[styles.dot, { backgroundColor: readinessColor }]} />
            <View style={styles.rowMain}>
              <Text style={[typeScale.label, { color: t.textPrimary }]}>
                {!hasReadiness
                  ? s.devBuild
                  : pending === 0
                    ? s.ready
                    : s.toFix(pending)}
              </Text>
              <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
                {s.readinessBody}
              </Text>
            </View>
            <Text style={[typeScale.heading, styles.check, { color: t.textSecondary }]}>
              ›
            </Text>
          </Pressable>
        </Group>

        <SectionTitle>{s.strictness}</SectionTitle>
        <ChoiceGroup<StrictnessLevel>
          selected={strictness}
          onSelect={(level) => {
            setStrictnessState(level);
            setStrictness(level);
          }}
          choices={(['standard', 'maximum'] as StrictnessLevel[]).map((level) => ({
            value: level,
            ...s.strictnessOptions[level],
          }))}
        />

        <SectionTitle>{s.emergency}</SectionTitle>
        <ChoiceGroup<EmergencyExitMode>
          selected={emergencyExit}
          onSelect={(mode) => {
            setEmergencyExitState(mode);
            setEmergencyExit(mode);
          }}
          choices={(['none', 'slow'] as EmergencyExitMode[]).map((mode) => ({
            value: mode,
            ...s.emergencyOptions[mode],
          }))}
        />

        <SectionTitle>{strings.form.backup}</SectionTitle>
        <Group>
          <View style={styles.row}>
            <Text
              style={[typeScale.bodySmall, styles.rowMain, { color: t.textSecondary }]}
            >
              {strings.form.backupBody(STEPS_PER_REP)}
            </Text>
          </View>
        </Group>

        <SectionTitle>{s.lockIn}</SectionTitle>
        <Group>
          <View style={styles.segments}>
            {LOCK_IN_OPTIONS.map((mins, index) => {
              const isSelected = lockIn === mins;
              return (
                <Pressable
                  key={mins}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => {
                    setLockIn(mins);
                    setLockInMinutes(mins);
                  }}
                  style={[
                    styles.segment,
                    index > 0 && [styles.segmentDivider, { borderLeftColor: t.border }],
                    isSelected && { backgroundColor: primitives.energy[50] },
                  ]}
                >
                  <Text
                    style={[
                      isSelected ? typeScale.label : typeScale.bodySmall,
                      { color: isSelected ? primitives.energy[600] : t.textPrimary },
                    ]}
                  >
                    {strings.form.minutes(mins)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Group>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl },
  section: { marginTop: space.lg, marginBottom: space.sm },
  group: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    minHeight: 56,
    gap: space.md,
  },
  divider: { borderTopWidth: 1 },
  rowMain: { flex: 1 },
  check: { width: 20, textAlign: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  segments: { flexDirection: 'row' },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentDivider: { borderLeftWidth: 1 },
});
