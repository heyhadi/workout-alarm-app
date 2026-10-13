import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import { useStrings } from '../i18n';
import {
  isValveAvailable,
  phraseMatches,
  VALVE_HOLD_MS,
} from '../workout/emergencyValve';

const TICK_MS = 250;
const AVAILABILITY_CHECK_MS = 15_000;

type Stage = 'closed' | 'hold' | 'type';

interface EmergencyExitProps {
  /** Off unless the user opted in (Settings → Emergency exit). */
  enabled: boolean;
  /** When the alarm started ringing on this screen. */
  startedAt: number;
  /** Release the alarm as skipped. */
  onExit: () => void;
  /** Distance from the bottom for the link (sits above the rep strip). */
  linkBottom: number;
}

/**
 * The deliberately slow way out (see src/workout/emergencyValve.ts):
 * a small link that appears only after 10 minutes of ringing, then a
 * 60-second hold that resets if you let go, then an exact sentence.
 * Renders nothing at all until it's available.
 */
export function EmergencyExit({
  enabled,
  startedAt,
  onExit,
  linkBottom,
}: EmergencyExitProps) {
  const t = getSemanticTokens('alarm');
  const strings = useStrings();
  const e = strings.emergency;
  const [available, setAvailable] = useState(false);
  const [stage, setStage] = useState<Stage>('closed');
  const [heldMs, setHeldMs] = useState(0);
  const [typed, setTyped] = useState('');
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-check availability as the alarm keeps ringing.
  useEffect(() => {
    if (!enabled) return;
    const check = () => setAvailable(isValveAvailable(true, Date.now() - startedAt));
    const timer = setInterval(check, AVAILABILITY_CHECK_MS);
    const first = setTimeout(check, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [enabled, startedAt]);

  useEffect(
    () => () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    },
    [],
  );

  if (!available) return null;

  const stopHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
  };

  const startHold = () => {
    stopHold();
    const began = Date.now();
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - began;
      setHeldMs(elapsed);
      if (elapsed >= VALVE_HOLD_MS) {
        stopHold();
        setStage('type');
      }
    }, TICK_MS);
  };

  // Letting go before the full hold starts it over.
  const releaseHold = () => {
    if (stage !== 'hold') return;
    stopHold();
    setHeldMs(0);
  };

  const close = () => {
    stopHold();
    setHeldMs(0);
    setTyped('');
    setStage('closed');
  };

  if (stage === 'closed') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setStage('hold')}
        style={[styles.link, { bottom: linkBottom }]}
      >
        <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>{e.link}</Text>
      </Pressable>
    );
  }

  const progress = Math.min(heldMs / VALVE_HOLD_MS, 1);
  const secondsLeft = Math.ceil((VALVE_HOLD_MS - heldMs) / 1000);
  const matches = phraseMatches(typed, e.phrase);

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={styles.overlayScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: t.bgSurface }]}>
          <Text style={[typeScale.heading, { color: t.textPrimary }]}>{e.title}</Text>
          <Text
            style={[typeScale.body, { color: t.textSecondary, marginTop: space.sm }]}
          >
            {e.body}
          </Text>

          {stage === 'hold' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={e.hold}
              onPressIn={startHold}
              onPressOut={releaseHold}
              style={[styles.hold, { borderColor: primitives.warning[500] }]}
            >
              <View
                style={[
                  styles.holdFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: primitives.warning[500],
                  },
                ]}
              />
              <Text style={[typeScale.label, { color: t.textPrimary }]}>
                {heldMs > 0 ? e.holding(secondsLeft) : e.hold}
              </Text>
            </Pressable>
          ) : (
            <View style={{ marginTop: space.lg }}>
              <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
                {e.typePrompt}
              </Text>
              <Text
                style={[typeScale.label, { color: t.textPrimary, marginTop: space.xs }]}
              >
                {e.phrase}
              </Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                autoCorrect={false}
                autoCapitalize="none"
                // No paste shortcut: the point is to type it.
                contextMenuHidden
                style={[
                  typeScale.body,
                  styles.input,
                  { color: t.textPrimary, borderColor: primitives.warning[500] },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!matches}
                onPress={onExit}
                style={[
                  styles.exit,
                  {
                    backgroundColor: matches ? primitives.danger[500] : 'transparent',
                    borderColor: primitives.danger[500],
                  },
                ]}
              >
                <Text
                  style={[
                    typeScale.label,
                    { color: matches ? primitives.white : primitives.danger[500] },
                  ]}
                >
                  {e.exit}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
            <Text style={[typeScale.label, { color: primitives.energy[400] }]}>
              {e.cancel}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(10, 22, 46, 0.92)',
  },
  overlayScroll: { flexGrow: 1, justifyContent: 'center', padding: space.md },
  card: { borderRadius: radius.lg, padding: space.lg },
  hold: {
    marginTop: space.lg,
    height: 64,
    borderWidth: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.35 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginTop: space.sm,
  },
  exit: {
    marginTop: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { alignSelf: 'center', marginTop: space.md, padding: space.sm },
});
