import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import type { Difficulty, ExerciseType } from '../types';
import { ExerciseChip, EXERCISE_LABELS } from './ExerciseChip';
import { PrimaryButton } from './PrimaryButton';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const REP_PRESETS = [10, 20, 30];
const DIFFICULTIES: Difficulty[] = ['easy', 'standard', 'hard'];
const LOCK_IN_OPTIONS = [15, 30, 45, 60];

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

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Screen 2 — Create / edit alarm form.
 * Time, repeat days, exercise picker (chips), rep presets, difficulty,
 * ringtone, backup exercise, lock-in timing. No free-text reps to regret
 * at 6 a.m. — presets only, matching the mockup.
 */
export function AlarmForm({ initial, submitLabel, onSubmit }: AlarmFormProps) {
  const t = getSemanticTokens('day');
  const [value, setValue] = useState<AlarmFormValue>(initial);
  const [showPicker, setShowPicker] = useState(false);

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

  const timeToDate = (time: string): Date => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && date) {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      set('time', `${hh}:${mm}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[typeScale.caption, { color: t.textSecondary }]}>Time</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[
          styles.input,
          {
            backgroundColor: t.bgSurface,
            borderColor: t.border,
            justifyContent: 'center',
          },
        ]}
      >
        <Text style={[typeScale.display, { fontSize: 40, color: t.textPrimary }]}>
          {value.time}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={timeToDate(value.time)}
          mode="time"
          is24Hour
          display="default"
          onChange={handleTimeChange}
        />
      )}

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
        Ringtone
      </Text>
      <TextInput
        value={value.ringtone}
        onChangeText={(text) => set('ringtone', text)}
        placeholder="Morning energy"
        placeholderTextColor={t.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: t.bgSurface,
            borderColor: t.border,
            color: t.textPrimary,
          },
          typeScale.body,
        ]}
      />

      <Text style={[typeScale.caption, styles.section, { color: t.textSecondary }]}>
        Backup if camera fails
      </Text>
      <View style={styles.row}>
        <ExerciseChip
          exercise="steps"
          selected={value.backupExercise === 'steps'}
          onSelect={(ex) => set('backupExercise', ex)}
        />
        <ExerciseChip
          exercise="jumping_jacks"
          selected={value.backupExercise === 'jumping_jacks'}
          onSelect={(ex) => set('backupExercise', ex)}
        />
      </View>

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
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginTop: space.xs,
  },
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
