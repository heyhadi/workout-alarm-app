import { StyleSheet, Text, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';

interface FormCueBannerProps {
  /** Short cue, e.g. "Go lower" or "Get back in frame". */
  cue: string | null;
}

/**
 * One-line form cue on the ringing screen ("go lower"). Null-safe:
 * renders nothing when there is no cue — the screen stays uncluttered.
 */
export function FormCueBanner({ cue }: FormCueBannerProps) {
  const t = getSemanticTokens('alarm');
  if (!cue) return null;
  return (
    <View
      style={[styles.banner, { backgroundColor: t.bgSurface }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[typeScale.heading, { color: primitives.energy[400] }]}>{cue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
});
