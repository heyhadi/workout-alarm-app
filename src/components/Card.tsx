import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';

/**
 * The day-mode building blocks shared by the alarm form and Settings:
 * a caption above a white card, blocks inside the card separated by
 * hairlines, and options that tint orange when selected.
 */

/** Uppercase caption + card. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = getSemanticTokens('day');
  return (
    <View style={styles.section}>
      <Text style={[typeScale.caption, styles.caption, { color: t.textSecondary }]}>
        {title}
      </Text>
      <Card>{children}</Card>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const t = getSemanticTokens('day');
  return (
    <View
      style={[styles.card, { backgroundColor: t.bgSurface, borderColor: t.border }]}
    >
      {children}
    </View>
  );
}

/** One padded block inside a card; every block after the first gets a hairline. */
export function Block({
  label,
  first = false,
  children,
  style,
}: {
  /** Small sub-heading inside the card ("Exercise", "Reps"). */
  label?: string;
  first?: boolean;
  children?: ReactNode;
  style?: ViewStyle;
}) {
  const t = getSemanticTokens('day');
  return (
    <View
      style={[
        styles.block,
        !first && { borderTopWidth: 1, borderTopColor: t.border },
        style,
      ]}
    >
      {label ? (
        <Text style={[typeScale.bodySmall, styles.label, { color: t.textSecondary }]}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Title + description, the text half of a settings row. */
export function RowText({ title, body }: { title: string; body?: string }) {
  const t = getSemanticTokens('day');
  return (
    <View style={styles.rowText}>
      <Text style={[typeScale.label, { color: t.textPrimary }]}>{title}</Text>
      {body ? (
        <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>{body}</Text>
      ) : null}
    </View>
  );
}

/**
 * A selectable option. `fill` = equal width in a row (reps, difficulty,
 * presets); otherwise a pill sized to its label (exercises).
 */
export function Option({
  label,
  selected,
  onPress,
  fill = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  fill?: boolean;
}) {
  const t = getSemanticTokens('day');
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        fill ? styles.fill : styles.pill,
        {
          backgroundColor: selected ? primitives.energy[50] : t.bgSurface,
          borderColor: selected ? primitives.energy[600] : t.border,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          typeScale.body,
          { color: selected ? primitives.energy[600] : t.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A row of options: equal widths, or wrapping pills. */
export function OptionRow({
  children,
  wrap = false,
}: {
  children: ReactNode;
  wrap?: boolean;
}) {
  return <View style={wrap ? styles.wrapRow : styles.fillRow}>{children}</View>;
}

const styles = StyleSheet.create({
  section: { marginTop: space.lg },
  caption: { marginBottom: space.sm },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  block: { padding: space.md },
  label: { marginBottom: space.sm },
  rowText: { flex: 1, gap: 2 },
  fillRow: { flexDirection: 'row', gap: space.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fill: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  pill: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    justifyContent: 'center',
  },
});
