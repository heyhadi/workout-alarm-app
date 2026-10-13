import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../appearance';
import { space, type as typeScale } from '../../theme/tokens';
import type { Difficulty, ExerciseType } from '../types';
import { STEPS_PER_REP } from '../native/steps';
import { Block, Option, OptionRow, RowText, Section } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { TimeWheel } from './TimeWheel';
import { SoundPicker } from './SoundPicker';
import { nextFireTimeMs, timeUntil } from '../workout/scheduling';
import { useStrings } from '../i18n';

const REP_PRESETS = [10, 20, 30];
const DIFFICULTIES: Difficulty[] = ['easy', 'standard', 'hard'];
const LOCK_IN_OPTIONS = [15, 30, 45, 60];
/** Exercises the camera can count (steps is the backup, not a choice). */
const CAMERA_EXERCISES: ExerciseType[] = [
  'squats',
  'pushups',
  'jumping_jacks',
  'situps',
];
const PRESET_TIMES = ['05:30', '06:00', '06:30', '07:00'];
const COUNTDOWN_REFRESH_MS = 30_000;

export interface AlarmFormValue {
  time: string;
  days: number[];
  exercise: ExerciseType;
  repTarget: number;
  difficulty: Difficulty;
  ringtone: string;
  backupExercise: ExerciseType;
  lockInMinutes: number;
}

interface AlarmFormProps {
  initial: AlarmFormValue;
  submitLabel: string;
  onSubmit: (value: AlarmFormValue) => void;
}

/**
 * Screen 2 — Create / edit alarm form, as cards: time (wheel, live "rings
 * in", presets), repeat days, workout (exercise, reps, difficulty), sound,
 * safety (camera backup, lock window). Save is pinned at the bottom.
 * No free-text reps to regret at 6 a.m. — presets only.
 */
export function AlarmForm({ initial, submitLabel, onSubmit }: AlarmFormProps) {
  const t = useTokens('day');
  const strings = useStrings();
  const [value, setValue] = useState<AlarmFormValue>(initial);
  // Clock for the "Rings in…" line; ticks so the countdown stays honest
  // while the form sits open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), COUNTDOWN_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const set = <K extends keyof AlarmFormValue>(key: K, v: AlarmFormValue[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  const toggleDay = (day: number) =>
    set(
      'days',
      value.days.includes(day)
        ? value.days.filter((d) => d !== day)
        : [...value.days, day].sort(),
    );

  const handleSubmit = () => {
    onSubmit(value);
  };

  const ringsIn = strings.timeUntil(
    timeUntil(nextFireTimeMs(value.time, value.days, now), now),
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title={strings.form.time}>
          <Block first>
            <TimeWheel value={value.time} onChange={(time) => set('time', time)} />
            <Text
              style={[typeScale.label, styles.ringsIn, { color: t.accentStrong }]}
              accessibilityLiveRegion="polite"
            >
              {strings.form.ringsIn(ringsIn)}
            </Text>
            <OptionRow>
              {PRESET_TIMES.map((time) => (
                <Option
                  key={time}
                  fill
                  label={time}
                  selected={value.time === time}
                  onPress={() => set('time', time)}
                />
              ))}
            </OptionRow>
          </Block>
        </Section>

        <Section title={strings.form.repeat}>
          <Block first>
            <View style={styles.days}>
              {strings.dayLetters.map((letter, i) => {
                const active = value.days.includes(i);
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    onPress={() => toggleDay(i)}
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: active ? t.actionPrimary : t.bgSurface,
                        borderColor: active ? t.actionPrimary : t.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typeScale.body,
                        { color: active ? t.textOnAccent : t.textPrimary },
                      ]}
                    >
                      {letter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Block>
        </Section>

        <Section title={strings.form.workout}>
          <Block first label={strings.form.exercise}>
            <OptionRow wrap>
              {CAMERA_EXERCISES.map((e) => (
                <Option
                  key={e}
                  label={strings.exercise[e]}
                  selected={value.exercise === e}
                  onPress={() => set('exercise', e)}
                />
              ))}
            </OptionRow>
          </Block>
          <Block label={strings.form.reps}>
            <OptionRow>
              {REP_PRESETS.map((n) => (
                <Option
                  key={n}
                  fill
                  label={String(n)}
                  selected={value.repTarget === n}
                  onPress={() => set('repTarget', n)}
                />
              ))}
            </OptionRow>
          </Block>
          <Block label={strings.form.difficulty}>
            <OptionRow>
              {DIFFICULTIES.map((d) => (
                <Option
                  key={d}
                  fill
                  label={strings.difficulty[d]}
                  selected={value.difficulty === d}
                  onPress={() => set('difficulty', d)}
                />
              ))}
            </OptionRow>
          </Block>
        </Section>

        <Section title={strings.form.sound}>
          <SoundPicker
            value={value.ringtone}
            onChange={(ringtone) => set('ringtone', ringtone)}
          />
        </Section>

        <Section title={strings.form.safety}>
          <Block first>
            <RowText
              title={strings.form.cameraBackup}
              body={strings.form.backupBody(STEPS_PER_REP)}
            />
          </Block>
          <Block>
            <Text
              style={[typeScale.label, styles.blockTitle, { color: t.textPrimary }]}
            >
              {strings.form.lockWindow}
            </Text>
            <OptionRow>
              {LOCK_IN_OPTIONS.map((mins) => (
                <Option
                  key={mins}
                  fill
                  label={strings.form.minutes(mins)}
                  selected={value.lockInMinutes === mins}
                  onPress={() => set('lockInMinutes', mins)}
                />
              ))}
            </OptionRow>
            <Text
              style={[typeScale.bodySmall, styles.note, { color: t.textSecondary }]}
            >
              {strings.form.lockNote(value.lockInMinutes)}
            </Text>
          </Block>
        </Section>
      </ScrollView>

      {/* Pinned: saving is always one tap away, whatever you scrolled to. */}
      <View style={[styles.footer, { borderTopColor: t.border }]}>
        <PrimaryButton label={submitLabel} onPress={handleSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: space.lg },
  ringsIn: { marginTop: space.md, marginBottom: space.md },
  // All seven days on one line at any width: spread, never wrap.
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: { marginBottom: space.sm },
  note: { marginTop: space.sm },
  footer: { borderTopWidth: 1, paddingTop: space.md },
});
