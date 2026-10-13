import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import type { Difficulty, ExerciseType } from '../types';
import { STEPS_PER_REP } from '../native/steps';
import { ExerciseChip, EXERCISE_LABELS } from './ExerciseChip';
import { PrimaryButton } from './PrimaryButton';
import { TimeWheel } from './TimeWheel';
import { SoundPicker } from './SoundPicker';
import { formatTimeUntil, nextFireTimeMs } from '../workout/scheduling';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const REP_PRESETS = [10, 20, 30];
const DIFFICULTIES: Difficulty[] = ['easy', 'standard', 'hard'];
const LOCK_IN_OPTIONS = [15, 30, 45, 60];
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
 * Screen 2 — Create / edit alarm form.
 * Time (inline wheel + live "rings in" countdown), repeat days, exercise picker (chips), rep presets, difficulty,
 * alarm sound, backup, lock-in timing. No free-text reps to regret
 * at 6 a.m. — presets only, matching the mockup.
 */
export function AlarmForm({ initial, submitLabel, onSubmit }: AlarmFormProps) {
  const t = getSemanticTokens('day');
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

  const ringsIn = formatTimeUntil(nextFireTimeMs(value.time, value.days, now), now);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[typeScale.caption, { color: t.textSecondary }]}>Time</Text>
      <TimeWheel value={value.time} onChange={(time) => set('time', time)} />
      <Text
        style={[typeScale.label, styles.ringsIn, { color: primitives.energy[600] }]}
        accessibilityLiveRegion="polite"
      >
        {`Rings in ${ringsIn}`}
      </Text>
      <View style={styles.row}>
        {PRESET_TIMES.map((time) => {
          const active = value.time === time;
          return (
            <Pressable
              key={time}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => set('time', time)}
              style={[
                styles.preset,
                {
                  backgroundColor: active ? primitives.energy[50] : t.bgSurface,
                  borderColor: active ? primitives.energy[600] : t.border,
                },
              ]}
            >
              <Text
                style={[
                  typeScale.bodySmall,
                  { color: active ? primitives.energy[600] : t.textPrimary },
                ]}
              >
                {time}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Repeat
      </Text>
      <View style={styles.row}>
        {DAY_LETTERS.map((letter, i) => {
          const active = value.days.includes(i);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => toggleDay(i)}
              style={[
                styles.dayDot,
                {
                  backgroundColor: active ? t.actionPrimary : t.bgSurface,
                  borderColor: t.border,
                },
              ]}
            >
              <Text style={{ color: active ? t.textOnAccent : t.textPrimary }}>
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Exercise
      </Text>
      <View style={styles.row}>
        {(Object.keys(EXERCISE_LABELS) as ExerciseType[])
          .filter((e) => e !== 'steps')
          .map((e) => (
            <ExerciseChip
              key={e}
              exercise={e}
              selected={value.exercise === e}
              onSelect={(ex) => set('exercise', ex)}
            />
          ))}
      </View>

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Reps
      </Text>
      <View style={styles.row}>
        {REP_PRESETS.map((n) => {
          const active = value.repTarget === n;
          return (
            <Pressable
              key={n}
              onPress={() => set('repTarget', n)}
              style={[
                styles.preset,
                {
                  backgroundColor: active ? primitives.energy[50] : t.bgSurface,
                  borderColor: active ? primitives.energy[600] : t.border,
                },
              ]}
            >
              <Text
                style={[
                  typeScale.heading,
                  { color: active ? primitives.energy[600] : t.textPrimary },
                ]}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Difficulty
      </Text>
      <View style={styles.row}>
        {DIFFICULTIES.map((d) => {
          const active = value.difficulty === d;
          return (
            <Pressable
              key={d}
              onPress={() => set('difficulty', d)}
              style={[
                styles.preset,
                {
                  backgroundColor: active ? t.textPrimary : t.bgSurface,
                  borderColor: t.border,
                },
              ]}
            >
              <Text
                style={[
                  typeScale.bodySmall,
                  { color: active ? t.bgSurface : t.textPrimary },
                ]}
              >
                {d}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Sound
      </Text>
      <SoundPicker
        value={value.ringtone}
        onChange={(ringtone) => set('ringtone', ringtone)}
      />

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Backup if camera fails
      </Text>
      <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
        {`Walk it off: ${STEPS_PER_REP} steps per rep, counted by the step sensor. Used when the camera is blocked, denied or can’t see you for 2 minutes.`}
      </Text>

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Locks before firing
      </Text>
      <View style={styles.row}>
        {LOCK_IN_OPTIONS.map((mins) => {
          const active = value.lockInMinutes === mins;
          return (
            <Pressable
              key={mins}
              onPress={() => set('lockInMinutes', mins)}
              style={[
                styles.preset,
                {
                  backgroundColor: active ? t.stateLocked : t.bgSurface,
                  borderColor: t.border,
                },
              ]}
            >
              <Text
                style={[
                  typeScale.bodySmall,
                  { color: active ? t.textOnAccent : t.textPrimary },
                ]}
              >
                {`${mins}m`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={[typeScale.bodySmall, { color: t.textSecondary, marginTop: space.xs }]}
      >
        Locks 30 min before it fires — inside the window the alarm cannot be edited,
        weakened, or deleted.
      </Text>

      <View style={styles.cta}>
        <PrimaryButton label={submitLabel} onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl },
  section: { marginTop: space.lg, marginBottom: space.sm },
  ringsIn: { marginTop: space.sm, marginBottom: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  dayDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.sm,
  },
  preset: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.sm,
    marginBottom: space.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  cta: { marginTop: space.xl },
});
