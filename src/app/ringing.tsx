import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { WorkoutView } from '../components/WorkoutView';
import { EmergencyExit } from '../components/EmergencyExit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrings } from '../i18n';
import { useWorkoutCounter } from '../hooks/useWorkoutCounter';
import { useTokens } from '../appearance';
import { type as typeScale } from '../../theme/tokens';
import { isPoseModuleAvailable, stopPoseDetection } from '../native/pose';
import {
  getActiveRinging,
  isRingingModuleAvailable,
  releaseAlarm,
} from '../native/ringing';
import { applyAlarmSchedule } from '../native/alarms';
import {
  enterLockTask,
  exitLockTask,
  isLockdownModuleAvailable,
} from '../native/lockdown';
import { getAlarm, recordSession, setAlarmEnabled } from '../storage/db';
import { getSettings, incrementTotalWorkouts } from '../storage/settings';
import type { Alarm, ExerciseType } from '../types';

/**
 * Stand-in when the alarm's row is gone (deleted mid-ring, DB not ready):
 * the ringing service still knows the exercise and target, and the
 * workout must stay completable — "Waking up…" forever is no exit.
 */
function alarmFromRinging(
  id: string,
  exercise: ExerciseType,
  repTarget: number,
  nowMs: number,
): Alarm {
  const d = new Date(nowMs);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    id,
    time,
    days: [],
    exercise,
    repTarget,
    difficulty: 'standard',
    ringtone: '',
    backupExercise: 'steps',
    lockInMinutes: 0,
    enabled: false,
    createdAt: nowMs,
    updatedAt: nowMs,
  };
}

/**
 * Screen 4 — Ringing / workout. Full-screen, locked, dark. NOTHING to tap —
 * no dismiss, no snooze. The ONLY exit is the verified target (reps on
 * camera, or steps when the camera can't count), via releaseAlarm().
 */
export default function RingingScreen() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const t = useTokens('alarm');
  const strings = useStrings();
  const [loaded, setLoaded] = useState<{ alarm: Alarm; saved: boolean } | null>(null);
  const [startedAt] = useState(() => Date.now());

  // Load the alarm, or fall back to what the ringing service knows.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const saved = await getAlarm(alarmId).catch(() => null);
      if (saved) return { alarm: saved, saved: true };
      const ringing = await getActiveRinging().catch(() => null);
      return ringing
        ? {
            alarm: alarmFromRinging(
              alarmId || ringing.alarmId,
              ringing.exercise,
              ringing.repTarget,
              startedAt,
            ),
            saved: false,
          }
        : null;
    };
    load()
      .then((result) => {
        if (!cancelled && result) setLoaded(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [alarmId, startedAt]);

  // Engage lock-task (kiosk) mode while the workout is active: Back/Home/
  // recents are swallowed and the ringing screen stays on top. Released
  // together with the alarm. First call shows a one-time OS prompt.
  useEffect(() => {
    if (!isLockdownModuleAvailable()) return;
    enterLockTask().catch(() => undefined);
    return () => {
      exitLockTask().catch(() => undefined);
    };
  }, []);

  if (!loaded) {
    return (
      <Screen mode="alarm">
        <View style={styles.center}>
          <Text style={[typeScale.body, { color: t.textSecondary }]}>
            {strings.ringing.wakingUp}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <RingingWorkout alarm={loaded.alarm} saved={loaded.saved} startedAt={startedAt} />
  );
}

/** Mounted once the alarm is known, so the counter starts in the right mode. */
function RingingWorkout({
  alarm,
  saved,
  startedAt,
}: {
  alarm: Alarm;
  saved: boolean;
  startedAt: number;
}) {
  const router = useRouter();
  const strings = useStrings();
  const insets = useSafeAreaInsets();
  const releasedRef = useRef(false);
  // Read once: the valve can't be switched on mid-ring.
  const [valveEnabled] = useState(() => getSettings().emergencyExit === 'slow');

  // Release exactly once: stop sound, log the session, arm what's next,
  // go to Done. `skipped` = released through the emergency exit.
  const release = useCallback(
    async (done: number, skipped = false) => {
      if (releasedRef.current) return;
      releasedRef.current = true;
      const finishedAt = Date.now();
      const durationMs = finishedAt - startedAt;
      try {
        if (isLockdownModuleAvailable()) {
          await exitLockTask().catch(() => undefined);
        }
        if (isRingingModuleAvailable()) {
          await releaseAlarm(alarm.id, done, durationMs);
        }
        if (isPoseModuleAvailable()) {
          await stopPoseDetection().catch(() => undefined);
        }
      } catch {
        // Native not linked — DB/session logging still proceeds.
      }
      await recordSession({
        id: `session-${finishedAt}`,
        alarmId: alarm.id,
        exercise: alarm.exercise,
        repsTarget: alarm.repTarget,
        repsDone: done,
        startedAt,
        finishedAt,
        durationMs,
        skipped,
      }).catch(() => undefined);
      if (!skipped) incrementTotalWorkouts();
      // A repeating alarm arms its next occurrence; a one-shot switches off
      // (native already forgot it in releaseAlarm).
      if (saved) {
        if (alarm.days.length > 0) {
          await applyAlarmSchedule(alarm).catch(() => undefined);
        } else {
          await setAlarmEnabled(alarm.id, false).catch(() => undefined);
        }
      }
      router.replace({
        pathname: '/done',
        params: {
          alarmId: alarm.id,
          repsDone: String(done),
          durationMs: String(durationMs),
          skipped: skipped ? '1' : '0',
          finishedAt: String(finishedAt),
        },
      });
    },
    [alarm, saved, startedAt, router],
  );

  const counter = useWorkoutCounter({
    exercise: alarm.exercise,
    repTarget: alarm.repTarget,
    active: true,
    onComplete: release,
  });

  return (
    <Screen mode="alarm" noPadding edges={['left', 'right']}>
      <WorkoutView
        counter={counter}
        exercise={alarm.exercise}
        label={`${alarm.time} · ${strings.exercise[alarm.exercise]}`}
      />
      <EmergencyExit
        enabled={valveEnabled}
        startedAt={startedAt}
        onExit={() => {
          void release(counter.count, true);
        }}
        // Just above the rep strip (ring + padding + safe area).
        linkBottom={insets.bottom + 200}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
