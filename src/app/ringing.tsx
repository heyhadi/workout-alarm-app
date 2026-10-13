import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { Screen } from '../components/Screen';
import { PoseCameraView } from '../components/PoseCameraView';
import { RepProgressRing } from '../components/RepProgressRing';
import { getSemanticTokens } from '../../theme/helpers';
import {
  motion,
  primitives,
  radius,
  space,
  type as typeScale,
} from '../../theme/tokens';
import {
  addFramingListener,
  addRepCountedListener,
  isPoseModuleAvailable,
  startPoseDetection,
  stopPoseDetection,
} from '../native/pose';
import { isRingingModuleAvailable, releaseAlarm } from '../native/ringing';
import {
  enterLockTask,
  exitLockTask,
  isLockdownModuleAvailable,
} from '../native/lockdown';
import { getAlarm, recordSession } from '../storage/db';
import { incrementTotalWorkouts } from '../storage/settings';
import { EXERCISE_LABELS } from '../components/ExerciseChip';
import { RepCounter, EXERCISE_COUNTER_CONFIGS } from '../workout/repCounter';
import { EXERCISE_INSTRUCTIONS } from '../workout/exerciseInstructions';
import type { Alarm, FramingState } from '../types';

const DEMO_TICK_MS = 120;
const RING_SIZE = 140;
const STRIP_BG = 'rgba(10, 22, 46, 0.85)';

/** Border, pill and framing-cue colour + copy per framing state. */
const FRAMING_UI: Record<
  FramingState,
  { color: string; onColor: string; pill: string; cue: string | null }
> = {
  in_frame: {
    color: primitives.success[500],
    onColor: primitives.ink[950],
    pill: 'In frame',
    cue: null,
  },
  partial: {
    color: primitives.warning[500],
    onColor: primitives.ink[950],
    pill: 'Partly in frame',
    cue: 'Step back a little',
  },
  none: {
    color: primitives.danger[500],
    onColor: primitives.white,
    pill: 'Not in frame',
    cue: 'Step into frame',
  },
};

/**
 * Screen 4 — Ringing / workout. Full-screen, locked, dark.
 * The camera fills the screen so framing is readable from across the room;
 * a coloured border shows framing state, and a bottom strip carries the
 * rep ring, the count and one cue. NOTHING else — no buttons, no dismiss,
 * no snooze. The ONLY exit is the verified rep target, via releaseAlarm().
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
  const [demoCue, setDemoCue] = useState<string | null>(null);
  // NativeModules is a stable host object; availability never changes at runtime.
  const [demoMode] = useState(() => !isPoseModuleAvailable());
  // Demo mode has no camera to frame: treat it as always in frame.
  const [framing, setFraming] = useState<FramingState>(() =>
    isPoseModuleAvailable() ? 'none' : 'in_frame',
  );
  const [cameraFailed, setCameraFailed] = useState(false);
  const releasedRef = useRef(false);
  const alarmRef = useRef<Alarm | null>(null);
  const startedAtRef = useRef(0);
  const cameraGranted = permission?.granted ?? false;

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
        if (isLockdownModuleAvailable()) {
          await exitLockTask().catch(() => undefined);
        }
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

    if (isPoseModuleAvailable()) {
      // The camera can't open without permission — start (or restart)
      // once it is granted, so the first-ever ring isn't a dead end.
      if (!cameraGranted) return;
      let cancelled = false;
      // Subscribe before starting so no early event is missed.
      const unsubRep = addRepCountedListener((p) => {
        setReps(p.total);
        if (p.total >= alarm.repTarget) {
          void release(p.total);
        }
      });
      const unsubFraming = addFramingListener((p) => setFraming(p.state));
      startPoseDetection(alarm.exercise, alarm.repTarget).catch(() => {
        if (!cancelled) setCameraFailed(true);
      });
      return () => {
        cancelled = true;
        unsubRep();
        unsubFraming();
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
        setDemoCue(null);
        if (snapshot.reps >= alarm.repTarget) {
          clearInterval(timer);
          void release(snapshot.reps);
        }
      } else if (snapshot.phase === 'descending' && now - lastCueAt > 4000) {
        lastCueAt = now;
        setDemoCue('Go lower');
      }
    }, DEMO_TICK_MS);
    return () => clearInterval(timer);
  }, [alarm, release, cameraGranted]);

  // Setup tips show until the first rep, while you're getting into frame,
  // then fade so the camera has the whole screen.
  const showSetup = reps === 0 && framing !== 'in_frame';
  const [setupOpacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    Animated.timing(setupOpacity, {
      toValue: showSetup ? 1 : 0,
      duration: motion.slow,
      useNativeDriver: true,
    }).start();
  }, [showSetup, setupOpacity]);

  if (!alarm) {
    return (
      <Screen mode="alarm">
        <View style={styles.center}>
          <Text style={[typeScale.body, { color: t.textSecondary }]}>Waking up…</Text>
        </View>
      </Screen>
    );
  }

  const cameraLive = !demoMode && cameraGranted && !cameraFailed;
  const framingUi = FRAMING_UI[framing];

  // One cue at a time: camera problems first, then framing, then form.
  let cue: string | null;
  let cueColor: string = primitives.energy[400];
  if (cameraFailed) {
    cue = 'Camera didn’t start';
    cueColor = primitives.danger[500];
  } else if (!demoMode && !cameraGranted) {
    cue = 'Allow camera access to count reps';
    cueColor = primitives.warning[500];
  } else if (framingUi.cue) {
    cue = framingUi.cue;
    cueColor = framingUi.color;
  } else if (alarm.exercise === 'steps') {
    cue = 'Demo mode — steps counted by sensor in a dev build';
  } else {
    cue = demoCue;
  }

  const instructions = EXERCISE_INSTRUCTIONS[alarm.exercise];
  const remaining = Math.max(alarm.repTarget - reps, 0);

  return (
    <Screen mode="alarm" noPadding>
      <View style={[styles.container, { backgroundColor: primitives.surfaceDark }]}>
        {cameraLive && <PoseCameraView style={StyleSheet.absoluteFill} />}

        {(cameraLive || demoMode) && (
          <View
            pointerEvents="none"
            style={[styles.frameBorder, { borderColor: framingUi.color }]}
          />
        )}

        <View style={styles.topRow}>
          <View style={[styles.pill, { backgroundColor: STRIP_BG }]}>
            <Text style={[typeScale.bodySmall, { color: t.textPrimary }]}>
              {`${alarm.time} · ${EXERCISE_LABELS[alarm.exercise]}`}
            </Text>
          </View>
          {demoMode ? (
            <View style={[styles.pill, { backgroundColor: primitives.warning[500] }]}>
              <Text style={[typeScale.bodySmall, { color: primitives.ink[950] }]}>
                Demo mode
              </Text>
            </View>
          ) : (
            cameraLive && (
              <View style={[styles.pill, { backgroundColor: framingUi.color }]}>
                <Text style={[typeScale.bodySmall, { color: framingUi.onColor }]}>
                  {framingUi.pill}
                </Text>
              </View>
            )
          )}
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.setup, { backgroundColor: STRIP_BG, opacity: setupOpacity }]}
        >
          <Text style={[typeScale.heading, { color: t.textPrimary }]}>
            {instructions.setup}
          </Text>
          <Text
            style={[typeScale.body, { color: t.textSecondary, marginTop: space.sm }]}
          >
            {instructions.howTo}
          </Text>
        </Animated.View>

        <View style={[styles.strip, { backgroundColor: STRIP_BG }]}>
          <RepProgressRing done={reps} target={alarm.repTarget} size={RING_SIZE} />
          <View style={styles.stripText}>
            <Text style={[typeScale.display, styles.target, { color: t.textPrimary }]}>
              {`of ${alarm.repTarget}`}
            </Text>
            <Text style={[typeScale.body, { color: t.textSecondary }]}>
              {`${remaining} to go`}
            </Text>
            {cue && (
              <Text
                style={[typeScale.heading, { color: cueColor, marginTop: space.xs }]}
                accessibilityLiveRegion="polite"
              >
                {cue}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frameBorder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 6,
  },
  topRow: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  setup: {
    position: 'absolute',
    top: '18%',
    left: space.md,
    right: space.md,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  stripText: { flex: 1, marginLeft: space.lg },
  target: { fontSize: 32, lineHeight: 36 },
});
