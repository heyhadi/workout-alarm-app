import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTokens } from '../appearance';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import { currentStreakDays, getAlarm, listRecentSessions } from '../storage/db';
import { getTotalWorkouts } from '../storage/settings';
import { fasterThanLast, weekDone } from '../workout/progress';
import type { ExerciseType } from '../types';
import { useStrings } from '../i18n';

const RING = 120;
const STROKE = 10;
const RING_R = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Screen 5 — Done. The release moment, continuing from the workout: the rep
 * ring closes with a check, then reps and time, the streak with this week's
 * mornings, and — when true — how much faster than last time. Follows the
 * light/dark appearance. An emergency exit shows "Skipped." with an amber
 * ring and no check.
 */
export default function DoneScreen() {
  const router = useRouter();
  const t = useTokens('day');
  const strings = useStrings();
  const params = useLocalSearchParams<{
    alarmId: string;
    repsDone: string;
    durationMs: string;
    skipped?: string;
    finishedAt?: string;
  }>();
  const wasSkipped = params.skipped === '1';
  const durationMs = Number(params.durationMs) || 0;
  const [finishedAt] = useState(() => Number(params.finishedAt) || Date.now());
  // Synchronous store reads belong in lazy initializers, not effects.
  const [total] = useState(() => getTotalWorkouts());
  const [streak, setStreak] = useState(0);
  const [exercise, setExercise] = useState<ExerciseType | null>(null);
  const [week, setWeek] = useState<boolean[]>(() => Array(7).fill(false));
  const [faster, setFaster] = useState<number | null>(null);

  // Ring draws closed, then the check pops in.
  const [ringProgress] = useState(() => new Animated.Value(0));
  const [checkScale] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.timing(ringProgress, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(checkScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [ringProgress, checkScale]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [alarm, sessions, days] = await Promise.all([
        getAlarm(params.alarmId).catch(() => null),
        listRecentSessions(60).catch(() => []),
        currentStreakDays().catch(() => 0),
      ]);
      if (cancelled) return;
      setStreak(days);
      const days7 = weekDone(sessions, finishedAt);
      // This morning is done the moment you're here — even if the save lagged.
      if (!wasSkipped) days7[new Date(finishedAt).getDay()] = true;
      setWeek(days7);
      if (alarm) {
        setExercise(alarm.exercise);
        if (!wasSkipped) {
          setFaster(
            fasterThanLast(sessions, {
              exercise: alarm.exercise,
              durationMs,
              finishedAt,
            }),
          );
        }
      }
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [params.alarmId, finishedAt, durationMs, wasSkipped]);

  const ringColor = wasSkipped ? primitives.warning[500] : primitives.energy[500];
  const today = new Date(finishedAt).getDay();
  const s = strings.done;

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.hero}>
          <Svg width={RING} height={RING}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              stroke={t.border}
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              stroke={ringColor}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={ringProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [CIRCUMFERENCE, 0],
              })}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          {!wasSkipped && (
            <Animated.View
              style={[styles.check, { transform: [{ scale: checkScale }] }]}
            >
              <Svg width={RING} height={RING} viewBox="0 0 120 120">
                <Path
                  d="M40 61l14 14 27-29"
                  fill="none"
                  stroke={t.textPrimary}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          )}
        </View>

        <Text style={[typeScale.display, styles.center, { color: t.textPrimary }]}>
          {wasSkipped ? s.skippedTitle : s.released}
        </Text>
        <Text style={[typeScale.body, styles.center, { color: t.textSecondary }]}>
          {wasSkipped ? s.skippedBody : s.upAt(hhmm(finishedAt))}
        </Text>

        <View style={styles.tiles}>
          <View
            style={[
              styles.tile,
              { backgroundColor: t.bgSurface, borderColor: t.border },
            ]}
          >
            <Text style={[typeScale.heading, styles.big, { color: t.textPrimary }]}>
              {params.repsDone}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {exercise ? strings.exercise[exercise].toLowerCase() : s.reps}
            </Text>
          </View>
          <View
            style={[
              styles.tile,
              { backgroundColor: t.bgSurface, borderColor: t.border },
            ]}
          >
            <Text style={[typeScale.heading, styles.big, { color: t.textPrimary }]}>
              {clock(durationMs)}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
              {s.minutes}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.streak,
            { backgroundColor: t.bgSurface, borderColor: t.border },
          ]}
        >
          <View style={styles.streakHead}>
            <Text style={[typeScale.label, { color: t.textPrimary }]}>
              {s.streak(streak)}
            </Text>
            <Text style={[typeScale.bodySmall, { color: t.accentStrong }]}>
              {s.total(total)}
            </Text>
          </View>
          <View style={styles.week}>
            {strings.dayLetters.map((letter, i) => {
              const done = week[i];
              return (
                <View
                  key={i}
                  style={[
                    styles.day,
                    done
                      ? { backgroundColor: primitives.energy[500] }
                      : { borderWidth: 1, borderColor: t.border },
                    i === today && { borderWidth: 2, borderColor: t.textPrimary },
                  ]}
                >
                  <Text
                    style={[
                      typeScale.bodySmall,
                      { color: done ? primitives.white : t.textSecondary },
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {faster !== null && (
          <Text style={[typeScale.label, styles.center, styles.faster]}>
            {s.faster(faster)}
          </Text>
        )}
      </View>

      <PrimaryButton label={strings.common.done} onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xl,
    marginBottom: space.md,
  },
  check: { position: 'absolute' },
  center: { textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  big: { fontSize: 28, lineHeight: 34 },
  streak: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
  },
  streakHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  day: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faster: { color: primitives.success[500], marginTop: space.md },
});
