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
  type LanguageSetting,
} from '../storage/settings';
import { STEPS_PER_REP } from '../native/steps';
import type { EmergencyExitMode } from '../types';

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

/** Equal-width segments in a Group (language, lock-in window). */
function Segments<T extends string | number>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const t = getSemanticTokens('day');
  return (
    <Group>
      <View style={styles.segments}>
        {options.map((option, index) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => onSelect(option.value)}
              style={[
                styles.segment,
                index > 0 && [styles.segmentDivider, { borderLeftColor: t.border }],
                isSelected && { backgroundColor: primitives.energy[50] },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  isSelected ? typeScale.label : typeScale.bodySmall,
                  { color: isSelected ? primitives.energy[600] : t.textPrimary },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Group>
  );
}

/**
 * Screen 6 — Settings.
 * Language, alarm readiness (links to the checklist), step backup,
 * emergency exit (off by default), lock-in default. Every option here is live — no placeholders.
 */
export default function SettingsScreen() {
  const t = getSemanticTokens('day');
  const strings = useStrings();
  const [language, setLanguage] = useLanguageSetting();
  const router = useRouter();
  const { items, pending } = useAlarmReadiness();
  // Synchronous MMKV reads belong in lazy initializers, not effects.
  const [lockIn, setLockIn] = useState(() => getSettings().lockInMinutes);
  const [emergencyExit, setEmergencyExitState] = useState<EmergencyExitMode>(
    () => getSettings().emergencyExit,
  );

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
        <Segments<LanguageSetting>
          selected={language}
          onSelect={setLanguage}
          options={(['system', 'en', 'id'] as LanguageSetting[]).map((value) => ({
            value,
            label: s.languageShort[value],
          }))}
        />
        {language === 'system' && (
          <Text style={[typeScale.bodySmall, styles.hint, { color: t.textSecondary }]}>
            {s.followingPhone(s.languageOptions[systemLanguage()])}
          </Text>
        )}

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

        <SectionTitle>{strings.emergency.setting}</SectionTitle>
        <Segments<EmergencyExitMode>
          selected={emergencyExit}
          onSelect={(mode) => {
            setEmergencyExitState(mode);
            setEmergencyExit(mode);
          }}
          options={(['none', 'slow'] as EmergencyExitMode[]).map((value) => ({
            value,
            label: strings.emergency.options[value],
          }))}
        />
        <Text style={[typeScale.bodySmall, styles.hint, { color: t.textSecondary }]}>
          {strings.emergency.settingBody}
        </Text>

        <SectionTitle>{s.lockIn}</SectionTitle>
        <Segments<number>
          selected={lockIn}
          onSelect={(mins) => {
            setLockIn(mins);
            setLockInMinutes(mins);
          }}
          options={LOCK_IN_OPTIONS.map((mins) => ({
            value: mins,
            label: strings.form.minutes(mins),
          }))}
        />
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
  hint: { marginTop: space.xs, marginLeft: space.xs },
});
