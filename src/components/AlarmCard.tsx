import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { primitives, space } from '../../theme/tokens';
import type { Alarm } from '../types';
import { EXERCISE_LABELS } from './ExerciseChip';

/** Indonesian day initials, Sunday-first to match JS Date.getDay(). */
const DAY_LETTERS = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

interface AlarmCardProps {
  alarm: Alarm;
  /** True while inside the lock-in window: toggle replaced by a badge. */
  locked: boolean;
  lockLabel: string;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
  onDelete: () => void;
}

/**
 * Dark alarm card for the home screen: big tabular time, toggle on the
 * right, exercise + rep target beneath, Indonesian day-of-week dots.
 * Swipe left to reveal delete (disabled while locked: no dodging the
 * workout by deleting inside the lock-in window).
 */
export function AlarmCard({
  alarm,
  locked,
  lockLabel,
  onToggle,
  onPress,
  onDelete,
}: AlarmCardProps) {
  const renderRightActions = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delete alarm ${alarm.time}`}
      onPress={onDelete}
      style={styles.deleteAction}
    >
      <Text style={styles.deleteLabel}>Delete</Text>
    </Pressable>
  );

  const card = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, !alarm.enabled && styles.cardDisabled]}
    >
      <View style={styles.main}>
        <Text style={styles.time}>{alarm.time}</Text>
        <Text style={styles.meta}>
          {`${EXERCISE_LABELS[alarm.exercise]} · ${alarm.repTarget} rep`}
        </Text>
        <View style={styles.days}>
          {DAY_LETTERS.map((letter, i) => {
            const active = alarm.days.includes(i);
            return (
              <View
                key={i}
                style={[styles.dayDot, active && styles.dayDotActive]}
              >
                <Text
                  style={[
                    styles.dayLetter,
                    active && styles.dayLetterActive,
                  ]}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.side}>
        {locked ? (
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>{lockLabel}</Text>
          </View>
        ) : (
          <Switch
            value={alarm.enabled}
            onValueChange={onToggle}
            trackColor={{
              true: primitives.energy[500],
              false: primitives.ink[700],
            }}
            thumbColor={primitives.white}
          />
        )}
      </View>
    </Pressable>
  );

  if (locked) {
    return card;
  }
  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      {card}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: primitives.surfaceDark,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  main: { flex: 1 },
  time: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 44,
    lineHeight: 48,
    color: primitives.white,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#8A94A8',
    marginTop: 4,
  },
  days: { flexDirection: 'row', marginTop: 12, gap: 8 },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: primitives.ink[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: primitives.energy[500],
    borderColor: primitives.energy[500],
  },
  dayLetter: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A8',
  },
  dayLetterActive: {
    color: primitives.white,
  },
  side: {
    marginLeft: space.md,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: primitives.danger[500],
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: space.lg,
    marginBottom: space.md,
    marginLeft: space.sm,
    minWidth: 96,
  },
  deleteLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: primitives.white,
  },
  lockBadge: {
    backgroundColor: primitives.warning[500],
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  lockText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: primitives.white,
  },
});
