import { useCallback, useEffect, useRef, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import {
  addFramingListener,
  addRepCountedListener,
  isPoseModuleAvailable,
  setPoseExercise,
  startPoseDetection,
  stopPoseDetection,
} from '../native/pose';
import {
  addStepCountedListener,
  prepareStepCounting,
  startStepCounting,
  STEPS_PER_REP,
  stopStepCounting,
} from '../native/steps';
import { RepCounter, EXERCISE_COUNTER_CONFIGS } from '../workout/repCounter';
import type { ExerciseType, FramingState } from '../types';

const DEMO_TICK_MS = 120;
/** Nobody in frame this long → fall back to steps (camera covered, dark…). */
const NO_BODY_FALLBACK_MS = 120_000;

/**
 * camera = native pose counting; steps = step-counter backup;
 * demo = synthetic reps without native modules (Expo Go).
 */
export type CounterMode = 'camera' | 'steps' | 'demo';

export interface WorkoutCounter {
  mode: CounterMode;
  /** Reps (camera/demo) or steps (steps mode) counted so far. */
  count: number;
  target: number;
  framing: FramingState;
  /** Camera mode with permission and a running camera. */
  cameraLive: boolean;
  /** Steps mode on a phone that can't count steps (or permission denied). */
  stepsUnavailable: boolean;
  /** Short coaching line from the demo simulator ("Go lower"). */
  demoCue: string | null;
  /** Camera permission still being asked for. */
  awaitingPermission: boolean;
}

interface Options {
  exercise: ExerciseType;
  repTarget: number;
  /** False until the workout should start (e.g. alarm still loading). */
  active: boolean;
  /** Called once when the target is reached, with the final count. */
  onComplete: (count: number) => void;
}

/**
 * Counts the workout for the ringing screen and practice mode alike:
 * camera reps via PoseModule, or — when the camera can't count (permission
 * denied, camera failed, nobody in frame for 2 minutes) — steps via the
 * step counter, at STEPS_PER_REP steps per rep. Never a free exit.
 */
export function useWorkoutCounter({
  exercise,
  repTarget,
  active,
  onComplete,
}: Options): WorkoutCounter {
  const [permission, requestPermission] = useCameraPermissions();
  // Fixed for the screen's life: native availability never changes.
  const [baseMode] = useState<CounterMode>(() =>
    !isPoseModuleAvailable() ? 'demo' : exercise === 'steps' ? 'steps' : 'camera',
  );
  const [reps, setReps] = useState(0);
  const [steps, setSteps] = useState(0);
  const [framing, setFraming] = useState<FramingState>(() =>
    isPoseModuleAvailable() ? 'none' : 'in_frame',
  );
  const [cameraFailed, setCameraFailed] = useState(false);
  const [noBodyFallback, setNoBodyFallback] = useState(false);
  const [stepsUnavailable, setStepsUnavailable] = useState(false);
  const [demoCue, setDemoCue] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const cameraGranted = permission?.granted ?? false;
  const cameraDenied = permission?.status === 'denied' && !permission.canAskAgain;
  // The camera can't count → steps. Reps and steps are different units, so
  // camera progress doesn't carry over.
  const mode: CounterMode =
    baseMode === 'camera' && (cameraDenied || cameraFailed || noBodyFallback)
      ? 'steps'
      : baseMode;
  const stepTarget = repTarget * STEPS_PER_REP;

  // Stable: touches only a ref.
  const finishIfDone = useCallback((value: number, goal: number) => {
    if (value >= goal && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current(value);
    }
  }, []);

  // Ask for the camera once (camera mode only).
  useEffect(() => {
    if (
      mode === 'camera' &&
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      requestPermission().catch(() => undefined);
    }
  }, [mode, permission, requestPermission]);

  // Nobody in frame for too long (camera covered, too dark) → steps.
  useEffect(() => {
    if (mode !== 'camera' || !active || !cameraGranted || framing === 'in_frame')
      return;
    const timer = setTimeout(() => setNoBodyFallback(true), NO_BODY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [mode, active, cameraGranted, framing]);

  // Camera reps: the camera session starts once and stops on teardown.
  // Switching exercise hot-swaps the counter config via setPoseExercise —
  // the camera keeps streaming. A full stop/start races the CameraX
  // teardown and can leave the preview black.
  const exerciseRef = useRef(exercise);
  const repTargetRef = useRef(repTarget);
  exerciseRef.current = exercise;
  repTargetRef.current = repTarget;

  useEffect(() => {
    if (!active || mode !== 'camera' || !cameraGranted) return;
    let cancelled = false;
    // Subscribe before starting so no early event is missed.
    const unsubRep = addRepCountedListener((p) => {
      setReps(p.total);
      finishIfDone(p.total, repTargetRef.current);
    });
    const unsubFraming = addFramingListener((p) => setFraming(p.state));
    const ex = exerciseRef.current;
    if (ex === 'steps') return;
    // A previous failure must not be terminal: every restart of this effect
    // is a fresh attempt at the camera, so clear the latch first. Otherwise
    // one transient bind error pins the screen to step-counting for the rest
    // of the session — and the exercise picker can't get the camera back.
    setCameraFailed(false);
    startPoseDetection(ex, repTargetRef.current, EXERCISE_COUNTER_CONFIGS[ex]).catch(
      () => {
        if (!cancelled) setCameraFailed(true);
      },
    );
    return () => {
      cancelled = true;
      unsubRep();
      unsubFraming();
      stopPoseDetection().catch(() => undefined);
    };
    // Intentionally not on exercise/repTarget: those hot-swap below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mode, cameraGranted, finishIfDone]);

  // Exercise switch mid-session: swap the native counter config, keep the
  // camera alive. The native side resets the count and emits total=0.
  const exerciseStartedRef = useRef<ExerciseType | null>(null);
  useEffect(() => {
    if (!active || mode !== 'camera' || !cameraGranted || exercise === 'steps') return;
    if (exerciseStartedRef.current === null) {
      exerciseStartedRef.current = exercise;
      return; // First run — the lifecycle effect above already started it.
    }
    if (exerciseStartedRef.current === exercise) return;
    exerciseStartedRef.current = exercise;
    completedRef.current = false;
    setPoseExercise(exercise, repTarget, EXERCISE_COUNTER_CONFIGS[exercise]).catch(
      () => undefined,
    );
  }, [exercise, repTarget, active, mode, cameraGranted]);

  // Step backup.
  useEffect(() => {
    if (!active || mode !== 'steps') return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    prepareStepCounting()
      .then(async (ok) => {
        if (cancelled) return;
        if (!ok) {
          setStepsUnavailable(true);
          return;
        }
        unsub = addStepCountedListener((p) => {
          setSteps(p.total);
          finishIfDone(p.total, stepTarget);
        });
        await startStepCounting();
      })
      .catch(() => {
        if (!cancelled) setStepsUnavailable(true);
      });
    return () => {
      cancelled = true;
      unsub?.();
      stopStepCounting().catch(() => undefined);
    };
  }, [active, mode, stepTarget, finishIfDone]);

  // DEMO MODE: synthetic joint angles through the real state machine.
  useEffect(() => {
    if (!active || mode !== 'demo' || exercise === 'steps') return;
    const config = EXERCISE_COUNTER_CONFIGS[exercise];
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
        setDemoCue(null);
        setReps(snapshot.reps);
        finishIfDone(snapshot.reps, repTarget);
        if (snapshot.reps >= repTarget) clearInterval(timer);
      } else if (snapshot.phase === 'descending' && now - lastCueAt > 4000) {
        lastCueAt = now;
        setDemoCue('Go lower');
      }
    }, DEMO_TICK_MS);
    return () => clearInterval(timer);
  }, [active, mode, exercise, repTarget, finishIfDone]);

  return {
    mode,
    count: mode === 'steps' ? steps : reps,
    target: mode === 'steps' ? stepTarget : repTarget,
    framing,
    cameraLive: mode === 'camera' && cameraGranted,
    stepsUnavailable,
    demoCue,
    awaitingPermission: mode === 'camera' && !cameraGranted,
  };
}
