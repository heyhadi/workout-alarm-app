import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PoseCameraView } from './PoseCameraView';
import { RepProgressRing } from './RepProgressRing';
import { getSemanticTokens } from '../../theme/helpers';
import {
  motion,
  primitives,
  radius,
  space,
  type as typeScale,
} from '../../theme/tokens';
import { EXERCISE_INSTRUCTIONS } from '../workout/exerciseInstructions';
import type { WorkoutCounter } from '../hooks/useWorkoutCounter';
import type { ExerciseType, FramingState } from '../types';

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

interface WorkoutViewProps {
  counter: WorkoutCounter;
  exercise: ExerciseType;
  /** Top-left pill, e.g. "06:30 · Squats". */
  label: string;
  /** Extra controls under the top row (practice mode's exercise picker). */
  header?: ReactNode;
  /** Overrides the cue line, e.g. practice's "Done — 10 reps counted". */
  cueOverride?: string | null;
}

/**
 * The workout surface shared by the ringing screen and practice mode.
 * The camera fills the screen edge to edge (behind the status bar) so
 * framing is readable from across the room; a coloured border shows
 * framing state; a bottom strip carries the progress ring, the count and
 * one cue. In step-backup mode the camera gives way to a walking prompt.
 */
export function WorkoutView({
  counter,
  exercise,
  label,
  header,
  cueOverride,
}: WorkoutViewProps) {
  const t = getSemanticTokens('alarm');
  const insets = useSafeAreaInsets();
  const { mode, count, target, framing, cameraLive } = counter;
  const framingUi = FRAMING_UI[framing];
  const showsFraming = cameraLive || mode === 'demo';
  const unit = mode === 'steps' ? 'steps' : 'reps';

  // Setup tips until the first rep (or step), while getting into frame,
  // then fade so the camera has the whole screen.
  const showSetup = count === 0 && (mode === 'steps' || framing !== 'in_frame');
  const [setupOpacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    Animated.timing(setupOpacity, {
      toValue: showSetup ? 1 : 0,
      duration: motion.slow,
      useNativeDriver: true,
    }).start();
  }, [showSetup, setupOpacity]);

  // One cue at a time: camera/sensor problems first, then framing, then form.
  let cue: string | null;
  let cueColor: string = primitives.energy[400];
  if (cueOverride !== undefined) {
    cue = cueOverride;
    cueColor = primitives.success[500];
  } else if (counter.awaitingPermission) {
    cue = 'Allow camera access to count reps';
    cueColor = primitives.warning[500];
  } else if (mode === 'steps') {
    if (counter.stepsUnavailable) {
      cue = 'This phone can’t count steps';
      cueColor = primitives.danger[500];
    } else {
      cue = count === 0 ? 'Walk or march in place' : null;
    }
  } else if (framingUi.cue) {
    cue = framingUi.cue;
    cueColor = framingUi.color;
  } else {
    cue = counter.demoCue;
  }

  const instructions =
    mode === 'steps'
      ? {
          setup: 'The camera can’t count right now — walk it off instead.',
          howTo: EXERCISE_INSTRUCTIONS.steps.howTo,
        }
      : EXERCISE_INSTRUCTIONS[exercise];

  return (
    <View style={[styles.container, { backgroundColor: primitives.surfaceDark }]}>
      <StatusBar style="light" />
      {cameraLive && <PoseCameraView style={StyleSheet.absoluteFill} />}

      {showsFraming && (
        <View
          pointerEvents="none"
          style={[styles.frameBorder, { borderColor: framingUi.color }]}
        />
      )}

      <View style={[styles.top, { top: insets.top + space.sm }]}>
        <View style={styles.topRow}>
          <View style={[styles.pill, { backgroundColor: STRIP_BG }]}>
            <Text style={[typeScale.bodySmall, { color: t.textPrimary }]}>{label}</Text>
          </View>
          {mode === 'demo' ? (
            <View style={[styles.pill, { backgroundColor: primitives.warning[500] }]}>
              <Text style={[typeScale.bodySmall, { color: primitives.ink[950] }]}>
                Demo mode
              </Text>
            </View>
          ) : mode === 'steps' ? (
            <View style={[styles.pill, { backgroundColor: primitives.warning[500] }]}>
              <Text style={[typeScale.bodySmall, { color: primitives.ink[950] }]}>
                Step backup
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
        {header}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.setup, { backgroundColor: STRIP_BG, opacity: setupOpacity }]}
      >
        <Text style={[typeScale.heading, { color: t.textPrimary }]}>
          {instructions.setup}
        </Text>
        <Text style={[typeScale.body, { color: t.textSecondary, marginTop: space.sm }]}>
          {instructions.howTo}
        </Text>
      </Animated.View>

      <View
        style={[
          styles.strip,
          { backgroundColor: STRIP_BG, paddingBottom: insets.bottom + space.lg },
        ]}
      >
        <RepProgressRing done={count} target={target} size={RING_SIZE} />
        <View style={styles.stripText}>
          <Text style={[typeScale.display, styles.target, { color: t.textPrimary }]}>
            {`of ${target}`}
          </Text>
          <Text style={[typeScale.body, { color: t.textSecondary }]}>
            {`${Math.max(target - count, 0)} ${unit} to go`}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  frameBorder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 6,
  },
  top: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    gap: space.sm,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  setup: {
    position: 'absolute',
    top: '22%',
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
  },
  stripText: { flex: 1, marginLeft: space.lg },
  target: { fontSize: 32, lineHeight: 36 },
});
