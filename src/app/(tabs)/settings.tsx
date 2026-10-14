import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Block, RowText, Section } from '../components/Card';
import { useAlarmReadiness } from '../hooks/useAlarmReadiness';
import { systemLanguage, useLanguageSetting, useStrings } from '../i18n';
import { useAppearanceSetting, useTokens } from '../appearance';
import { primitives, space, type as typeScale } from '../../theme/tokens';
import {
  getSettings,
  setEmergencyExit,
  setLockInMinutes,
  type AppearanceSetting,
  type LanguageSetting,
} from '../storage/settings';
import { STEPS_PER_REP } from '../native/steps';

const LOCK_IN_OPTIONS = [15, 30, 45, 60];

/** Joined equal-width segments filling a card (language, lock-in window). */
function Segments<T extends string | number>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const t = useTokens('day');
  return (
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
              index > 0 && { borderLeftWidth: 1, borderLeftColor: t.border },
              isSelected && { backgroundColor: t.selectedBg },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                typeScale.body,
                { color: isSelected ? t.selectedFg : t.textPrimary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Screen 6 — Settings. Language, alarm readiness (links to the
 * checklist), emergency exit (off by default), step backup, lock-in
 * default. Every option here is live — no placeholders.
 */
export default function SettingsScreen() {
  const t = useTokens('day');
  const strings = useStrings();
  const s = strings.settings;
  const e = strings.emergency;
  const [language, setLanguage] = useLanguageSetting();
  const [appearance, setAppearance] = useAppearanceSetting();
  const router = useRouter();
  const { items, pending } = useAlarmReadiness();
  // Synchronous MMKV reads belong in lazy initializers, not effects.
  const [lockIn, setLockIn] = useState(() => getSettings().lockInMinutes);
  const [valveOn, setValveOn] = useState(() => getSettings().emergencyExit === 'slow');

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

        <Section title={s.language}>
          <Segments<LanguageSetting>
            selected={language}
            onSelect={setLanguage}
            options={(['system', 'en', 'id'] as LanguageSetting[]).map((value) => ({
              value,
              label: s.languageShort[value],
            }))}
          />
        </Section>
        {language === 'system' && (
          <Text style={[typeScale.bodySmall, styles.hint, { color: t.textSecondary }]}>
            {s.followingPhone(s.languageOptions[systemLanguage()])}
          </Text>
        )}

        <Section title={s.appearance}>
          <Segments<AppearanceSetting>
            selected={appearance}
            onSelect={setAppearance}
            options={(['system', 'light', 'dark'] as AppearanceSetting[]).map(
              (value) => ({
                value,
                label: s.appearanceShort[value],
              }),
            )}
          />
        </Section>

        <Section title={s.readiness}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/readiness')}
            style={styles.row}
          >
            <View style={[styles.dot, { backgroundColor: readinessColor }]} />
            <RowText
              title={
                !hasReadiness ? s.devBuild : pending === 0 ? s.ready : s.toFix(pending)
              }
              body={!hasReadiness ? undefined : pending === 0 ? s.readyBody : s.fixBody}
            />
            <Text style={[typeScale.heading, { color: t.textSecondary }]}>›</Text>
          </Pressable>
        </Section>

        <Section title={e.setting}>
          <Block first style={styles.rowBlock}>
            <RowText title={e.toggleTitle} body={e.toggleBody} />
            <Switch
              value={valveOn}
              onValueChange={(on) => {
                setValveOn(on);
                setEmergencyExit(on ? 'slow' : 'none');
              }}
              trackColor={{ true: primitives.energy[500], false: t.border }}
              thumbColor={primitives.white}
              accessibilityLabel={e.toggleTitle}
            />
          </Block>
          <Block>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {valveOn ? e.stateOn : e.stateOff}
            </Text>
          </Block>
        </Section>

        <Section title={strings.form.backup}>
          <Block first>
            <RowText title={s.backupTitle} body={s.backupBody(STEPS_PER_REP)} />
          </Block>
        </Section>

        <Section title={s.lockIn}>
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
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl },
  hint: { marginTop: space.xs, marginLeft: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    gap: space.md,
    minHeight: 64,
  },
  rowBlock: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 14, height: 14, borderRadius: 7 },
  segments: { flexDirection: 'row' },
  segment: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
});
