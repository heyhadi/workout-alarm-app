import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen } from '../components/Screen';
import { RepProgressRing } from '../components/RepProgressRing';
import { FormCueBanner } from '../components/FormCueBanner';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, space, type as typeScale } from '../../theme/tokens';
import {
  addRepCountedListener,
  addPoseLostListener,
  isPoseModuleAvailable,
  startPoseDetection,
  stopPoseDetection,
} from '../native/pose';
import { isRingingModuleAvailable, releaseAlarm } from '../native/ringing';
import { getAlarm, recordSession } from '../storage/db';
import { incrementTotalWorkouts } from '../storage/settings';
import { EXERCISE_LABELS } from '../components/ExerciseChip';
import { RepCounter, EXERCISE_COUNTER_CONFIGS } from '../workout/repCounter';
import type { Alarm } from '../types';

const DEMO_TICK_MS = 120;

/**
 * Screen 4 — Ringing / workout. Full-screen, locked, dark.
 * Clock, exercise name, huge rep counter, camera view, one form cue.
 * NOTHING else — no buttons, no dismiss, no snooze. The ONLY exit is
 * the verified rep target, via releaseAlarm().
 *
 * Without the native bridges (Expo Go), a clearly-labelled DEMO MODE
 * simulates verified reps with the same state machine so the flow can
 * be exercised end to end.
 */
export default function RingingScreen() {
  const router = useRouter();
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const t = getSemanticTokens('alarm');
  const [permission, requestPermission] = useCameraPermissions();
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [reps, setReps] = useState(0);
  const [cue, setCue] = useState<string | null>(null);
  // NativeModules is a stable host object; availability never changes at runtime.
  const [demoMode] = useState(() => !isPoseModuleAvailable());
  const releasedRef = useRef(false);
  const alarmRef = useRef<Alarm | null>(null);
  const startedAtRef = useRef(0);

  // Load the alarm; mark the moment ringing began.
  useEffect(() => {
    startedAtRef.current = Date.now();
    getAlarm(alarmId)
      .then((a) => {
        setAlarm(a);
        alarmRef.current = a;
      })
      .catch(() => undefined);
  }, [alarmId]);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission().catch(() => undefined);
    }
  }, [permission, requestPermission]);

  // Release exactly once: stop sound, log the session, go to Done.
  // Stable across renders (refs + router only) so effects can depend on it.
  const release = useCallback(
    async (repsDone: number) => {
      if (releasedRef.current || !alarmRef.current) return;
      releasedRef.current = true;
      const finishedAt = Date.now();
      const startedAt = startedAtRef.current || finishedAt;
      const durationMs = finishedAt - startedAt;
      try {
        if (isRingingModuleAvailable()) {
          await releaseAlarm(alarmRef.current.id, repsDone, durationMs);
        }
        if (isPoseModuleAvailable()) {
          await stopPoseDetection().catch(() => undefined);
        }
      } catch {
        // Native not linked — DB/session logging still proceeds.
      }
      await recordSession({
        id: `session-${finishedAt}`,
        alarmId: alarmRef.current.id,
        exercise: alarmRef.current.exercise,
        repsTarget: alarmRef.current.repTarget,
        repsDone,
        startedAt,
        finishedAt,
        durationMs,
      }).catch(() => undefined);
      incrementTotalWorkouts();
      router.replace({
        pathname: '/done',
        params: {
          alarmId: alarmRef.current.id,
          repsDone: String(repsDone),
          durationMs: String(durationMs),
        },
      });
    },
    [router],
  );

  // Wire the pose pipeline (or the demo simulator).
  useEffect(() => {
    if (!alarm) return;
    const native = isPoseModuleAvailable();

    if (native) {
      let unsubRep: (() => void) | undefined;
      let unsubLost: (() => void) | undefined;
      startPoseDetection(alarm.exercise, alarm.repTarget)
        .then(() => {
          unsubRep = addRepCountedListener((p) => {
            setReps(p.total);
            if (p.total >= alarm.repTarget) {
              void release(p.total);
            }
          });
          unsubLost = addPoseLostListener((p) => {
            setCue(
              p.reason === 'no_body'
                ? 'Get back in frame'
                : p.reason === 'low_light'
                  ? 'Too dark — move to light'
                  : 'Camera issue — keep going',
            );
          });
        })
        .catch(() => undefined);
      return () => {
        unsubRep?.();
        unsubLost?.();
        stopPoseDetection().catch(() => undefined);
      };
    }

    // DEMO MODE: synthetic joint angles through the real state machine.
    // (Steps has no camera counting; its cue is derived during render.)
    if (alarm.exercise === 'steps') {
      return;
    }
    const config = EXERCISE_COUNTER_CONFIGS[alarm.exercise];
    const counter = new RepCounter(config);
    const top = config.upThresholdDeg + 5;
    const bottom = config.downThresholdDeg - 5;
    let angle = top;
    let direction: 1 | -1 = -1;
    let lastCueAt = 0;
    const timer = setInterval(() => {
      const now = Date.now();
      angle += direction * 14;
      if (angle <= bottom) {
        angle = bottom;
        direction = 1;
      } else if (angle >= top) {
        angle = top;
        direction = -1;
      }
      const { counted, snapshot } = counter.feed(angle, now);
      if (counted) {
        setReps(snapshot.reps);
        setCue(null);
        if (snapshot.reps >= alarm.repTarget) {
          clearInterval(timer);
          void release(snapshot.reps);
        }
      } else if (snapshot.phase === 'descending' && now - lastCueAt > 4000) {
        lastCueAt = now;
        setCue('Go lower');
      }
    }, DEMO_TICK_MS);
    return () => clearInterval(timer);
  }, [alarm, release]);

  if (!alarm) {
    return (
      <Screen mode="alarm">
        <View style={styles.center}>
          <Text style={[typeScale.body, { color: t.textSecondary }]}>Waking up…</Text>
        </View>
      </Screen>
    );
  }

  // Steps never opens the camera: surface the fallback cue in render,
  // no state needed.
  const effectiveCue =
    cue ??
    (alarm.exercise === 'steps'
      ? 'Demo mode — steps counted by sensor in a dev build'
      : null);

  return (
    <Screen mode="alarm" noPadding>
      <View style={[styles.container, { backgroundColor: t.bgScreen }]}>
        {demoMode && (
          <View style={styles.demoBadge}>
            <Text style={[typeScale.caption, { color: primitives.warning[500] }]}>
              Demo mode — dev build required for verified counting
            </Text>
          </View>
        )}
        <Text style={[typeScale.alarmClock, { color: t.textPrimary }]}>
          {alarm.time}
        </Text>
        <Text
          style={[typeScale.heading, { color: t.textSecondary, marginTop: space.sm }]}
        >
          {EXERCISE_LABELS[alarm.exercise]}
        </Text>

        <View style={styles.ring}>
          <RepProgressRing done={reps} target={alarm.repTarget} />
        </View>

        <View style={styles.cameraWrap}>
          {permission?.granted ? (
            <CameraView style={styles.camera} facing="front" />
          ) : (
            <View style={[styles.camera, styles.cameraPlaceholder]}>
              <Text style={[typeScale.body, { color: t.textSecondary }]}>
                Full body in frame
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cue}>
          <FormCueBanner cue={effectiveCue} />
        </View>

        <Text style={[typeScale.caption, styles.footer, { color: t.textSecondary }]}>
          No stop. No snooze. Finish the reps to release.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: space.xl,
    paddingHorizontal: space.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  demoBadge: { marginBottom: space.sm },
  ring: { marginVertical: space.lg },
  cameraWrap: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cue: { marginTop: space.md, minHeight: 64, justifyContent: 'center' },
  footer: { marginTop: 'auto', marginBottom: space.md },
});
