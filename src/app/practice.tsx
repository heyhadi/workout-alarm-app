import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { WorkoutView } from '../components/WorkoutView';
import { useStrings } from '../i18n';
import { useWorkoutCounter } from '../hooks/useWorkoutCounter';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import type { ExerciseType } from '../types';

const PRACTICE_REPS = 10;
const EXERCISES: ExerciseType[] = ['squats', 'pushups', 'jumping_jacks', 'situps'];

/**
 * Screen 3 — Practice mode. The real workout screen and the real counter —
 * same camera, framing and thresholds as the alarm — with no lockdown and
 * no alarm, so the first real morning is not a learning curve. Pick an
 * exercise and count 10 reps; switching exercise starts a fresh count.
 */
export default function PracticeScreen() {
  const [exercise, setExercise] = useState<ExerciseType>('squats');
  // A new key per pick remounts the counter: fresh count, fresh camera start.
  const [round, setRound] = useState(0);

  const pick = (next: ExerciseType) => {
    setExercise(next);
    setRound((r) => r + 1);
  };

  return (
    <Screen mode="alarm" noPadding edges={['left', 'right']}>
      <PracticeRound
        key={`${exercise}-${round}`}
        exercise={exercise}
        onPick={pick}
        onAgain={() => setRound((r) => r + 1)}
      />
    </Screen>
  );
}

function PracticeRound({
  exercise,
  onPick,
  onAgain,
}: {
  exercise: ExerciseType;
  onPick: (e: ExerciseType) => void;
  onAgain: () => void;
}) {
  const strings = useStrings();
  const [done, setDone] = useState(false);
  const counter = useWorkoutCounter({
    exercise,
    repTarget: PRACTICE_REPS,
    active: true,
    onComplete: () => setDone(true),
  });

  const header = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {EXERCISES.map((e) => {
        const active = e === exercise;
        return (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onPick(e)}
            style={[
              styles.chip,
              {
                backgroundColor: active
                  ? primitives.energy[500]
                  : 'rgba(10, 22, 46, 0.85)',
              },
            ]}
          >
            <Text style={[typeScale.bodySmall, { color: primitives.white }]}>
              {strings.exercise[e]}
            </Text>
          </Pressable>
        );
      })}
      {done && (
        <Pressable
          accessibilityRole="button"
          onPress={onAgain}
          style={[styles.chip, { backgroundColor: primitives.success[500] }]}
        >
          <Text style={[typeScale.bodySmall, { color: primitives.ink[950] }]}>
            {strings.practice.again}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );

  return (
    <WorkoutView
      counter={counter}
      exercise={exercise}
      label={strings.practice.label}
      header={header}
      cueOverride={done ? strings.practice.done(counter.count) : undefined}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
});
