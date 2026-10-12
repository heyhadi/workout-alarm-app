import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { getSemanticTokens } from '../../theme/helpers';
import { elevation, primitives, space, type as typeScale } from '../../theme/tokens';
import { currentStreakDays, getAlarm } from '../storage/db';
import { getTotalWorkouts } from '../storage/settings';
import { EXERCISE_LABELS } from '../components/ExerciseChip';

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

/**
 * Screen 5 — Done. The release moment: time taken, reps, streak,
 * total morning workouts. One button back to the list.
 */
export default function DoneScreen() {
  const router = useRouter();
  const t = getSemanticTokens('day');
  const { alarmId, repsDone, durationMs } = useLocalSearchParams<{
    alarmId: string;
    repsDone: string;
    durationMs: string;
  }>();
  const [streak, setStreak] = useState(0);
  // Synchronous store reads belong in lazy initializers, not effects.
  const [total] = useState(() => getTotalWorkouts());
  const [exerciseLabel, setExerciseLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    currentStreakDays()
      .then((s) => {
        if (!cancelled) setStreak(s);
      })
      .catch(() => undefined);
    getAlarm(alarmId)
      .then((a) => {
        if (!cancelled && a) setExerciseLabel(EXERCISE_LABELS[a.exercise]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [alarmId]);

  const stats: [string, string][] = [
    ['Reps', `${repsDone}${exerciseLabel ? ` ${exerciseLabel}` : ''}`],
    ['Time', formatDuration(Number(durationMs) || 0)],
    ['Streak', `${streak} morning${streak === 1 ? '' : 's'}`],
    ['Total workouts', String(total)],
  ];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[typeScale.display, { color: t.textPrimary }]}>Released.</Text>
        <Text style={[typeScale.body, { color: t.textSecondary, marginTop: space.sm }]}>
          No snooze survived. The phone is yours again.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: t.bgSurface }, elevation[1]]}>
        {stats.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={[typeScale.body, { color: t.textSecondary }]}>{label}</Text>
            <Text style={[typeScale.heading, { color: t.textPrimary }]}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.shareNote}>
        <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
          Shareable streak card ships in a later milestone.
        </Text>
      </View>

      <View style={styles.cta}>
        <PrimaryButton label="Done" onPress={() => router.replace('/')} />
      </View>

      <View style={[styles.accent, { backgroundColor: primitives.success[500] }]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: space.xl, marginBottom: space.lg },
  card: {
    borderRadius: 16,
    padding: space.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  shareNote: { marginTop: space.md, alignItems: 'center' },
  cta: { marginTop: 'auto', paddingBottom: space.md },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});
