import { Pressable, StyleSheet, Text } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { components, primitives, space, type as typeScale } from '../../theme/tokens';
import type { ExerciseType } from '../types';

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  squats: 'Squats',
  pushups: 'Push-ups',
  jumping_jacks: 'Jumping jacks',
  situps: 'Sit-ups',
  steps: 'Steps',
};

interface ExerciseChipProps {
  exercise: ExerciseType;
  selected: boolean;
  onSelect: (exercise: ExerciseType) => void;
}

/** Pill chip for the exercise picker. Selected = energy-50 fill + energy-600 text. */
export function ExerciseChip({ exercise, selected, onSelect }: ExerciseChipProps) {
  const t = getSemanticTokens('day');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect(exercise)}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? primitives.energy[50] : t.bgSurface,
          borderColor: selected ? primitives.energy[600] : t.border,
        },
      ]}
    >
      <Text
        style={[
          typeScale.bodySmall,
          {
            color: selected ? primitives.energy[600] : t.textPrimary,
            fontFamily: selected
              ? typeScale.label.fontFamily
              : typeScale.bodySmall.fontFamily,
          },
        ]}
      >
        {EXERCISE_LABELS[exercise]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: components.exerciseChip.borderRadius,
    paddingVertical: components.exerciseChip.paddingVertical,
    paddingHorizontal: components.exerciseChip.paddingHorizontal,
    borderWidth: 1,
    marginRight: space.sm,
    marginBottom: space.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
});
