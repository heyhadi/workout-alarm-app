import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import {
  components,
  elevation,
  primitives,
  space,
  type as typeScale,
} from '../../theme/tokens';
import type { Alarm } from '../types';
import { EXERCISE_LABELS } from './ExerciseChip';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface AlarmCardProps {
  alarm: Alarm;
  /** True while inside the lock-in window: toggle replaced by a badge. */
  locked: boolean;
  lockLabel: string;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
}

/**
 * One alarm row: big tabular time, exercise + reps + days beneath,
 * toggle on the right — or a "Locked" badge inside the lock-in window.
 */
export function AlarmCard({
  alarm,
  locked,
  lockLabel,
  onToggle,
  onPress,
}: AlarmCardProps) {
  const t = getSemanticTokens('day');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: t.bgSurface }, elevation[1]]}
    >
      <View style={styles.main}>
        <Text
          style={[
            typeScale.display,
            { color: t.textPrimary, fontSize: 32, lineHeight: 36 },
          ]}
        >
          {alarm.time}
        </Text>
        <Text
          style={[typeScale.bodySmall, { color: t.textSecondary, marginTop: space.xs }]}
        >
          {`${EXERCISE_LABELS[alarm.exercise]} · ${alarm.repTarget} reps`}
        </Text>
        <View style={styles.days}>
          {DAY_LETTERS.map((letter, i) => {
            const active = alarm.days.includes(i);
            return (
              <View
                key={i}
                style={[
                  styles.dayDot,
                  {
                    backgroundColor: active ? t.actionPrimary : 'transparent',
                    borderColor: t.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayLetter,
                    { color: active ? t.textOnAccent : t.textSecondary },
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
          <View style={[styles.lockBadge, { backgroundColor: t.stateLocked }]}>
            <Text style={[styles.lockText, { color: t.textOnAccent }]}>
              {lockLabel}
            </Text>
          </View>
        ) : (
          <Switch
            value={alarm.enabled}
            onValueChange={onToggle}
            trackColor={{ true: primitives.energy[500], false: t.border }}
            thumbColor={t.textOnAccent}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: components.alarmCard.borderRadius,
    padding: components.alarmCard.padding,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  main: { flex: 1 },
  days: { flexDirection: 'row', marginTop: space.sm, gap: 4 },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLetter: { fontSize: 11, fontFamily: typeScale.label.fontFamily },
  side: { marginLeft: space.md, alignItems: 'flex-end', justifyContent: 'center' },
  lockBadge: {
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  lockText: { fontSize: 12, fontFamily: typeScale.label.fontFamily },
});
