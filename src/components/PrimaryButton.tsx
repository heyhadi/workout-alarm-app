import { Pressable, StyleSheet, Text } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { components, radius } from '../../theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** Never render this in Alarm mode — there are no buttons while ringing. */
  disabled?: boolean;
}

/**
 * The one primary action per screen. 56dp tall, radius-lg, action/primary.
 * Deliberately NOT used on the ringing screen.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: PrimaryButtonProps) {
  const t = getSemanticTokens('day');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? t.actionPrimaryPressed : t.actionPrimary,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={[components.primaryButton.labelStyle, styles.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: components.primaryButton.height,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    textAlign: 'center',
  },
});
