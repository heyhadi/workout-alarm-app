import { useState } from 'react';
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
          {strings.settings.title}
        </Text>

        <SectionTitle>{strings.settings.language}</SectionTitle>
        <View
          style={[
            styles.group,
            { backgroundColor: t.bgSurface, borderColor: t.border },
          ]}
        >
          {(['system', 'en', 'id'] as LanguageSetting[]).map((option, index) => {
            const selected = language === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setLanguage(option)}
                style={[
                  styles.groupRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: t.border },
                ]}
              >
                <View style={styles.rowMain}>
                  <Text style={[typeScale.label, { color: t.textPrimary }]}>
                    {strings.settings.languageOptions[option]}
                  </Text>
                  {option === 'system' && (
                    <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
                      {strings.settings.languageOptions[systemLanguage()]}
                    </Text>
                  )}
                </View>
                {selected && (
                  <Text style={[typeScale.heading, { color: t.actionPrimary }]}>✓</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>{strings.settings.readiness}</SectionTitle>
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
                ? strings.settings.ready
                : items && items.length > 0
                  ? strings.settings.toFix(pending)
                  : strings.settings.devBuild}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {strings.settings.readinessBody}
            </Text>
          </View>
        </Pressable>

        <SectionTitle>{strings.settings.strictness}</SectionTitle>
        {(['standard', 'maximum'] as StrictnessLevel[]).map((level) => (
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
              {strings.settings.strictnessOptions[level].title}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {strings.settings.strictnessOptions[level].detail}
            </Text>
          </Pressable>
        ))}

        <SectionTitle>{strings.settings.emergency}</SectionTitle>
        {(['none', 'slow'] as EmergencyExitMode[]).map((mode) => (
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
              {strings.settings.emergencyOptions[mode].title}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {strings.settings.emergencyOptions[mode].detail}
            </Text>
          </Pressable>
        ))}

        <SectionTitle>{strings.form.backup}</SectionTitle>
        <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
          {strings.form.backupBody(STEPS_PER_REP)}
        </Text>

        <SectionTitle>{strings.settings.lockIn}</SectionTitle>
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
                {strings.form.minutes(mins)}
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
  // Grouped list (language): one card, hairline-separated rows.
  group: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 56,
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
