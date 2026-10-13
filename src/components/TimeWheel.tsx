import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, type as typeScale } from '../../theme/tokens';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PAD_ROWS = (VISIBLE_ROWS - 1) / 2;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface ColumnProps {
  values: string[];
  selected: number;
  onChange: (index: number) => void;
  /** Announced by TalkBack, e.g. "Hour". */
  label: string;
}

/**
 * One snapping wheel column. A plain ScrollView (not FlatList): it lives
 * inside the form's vertical ScrollView, and ≤60 rows need no
 * virtualization. Ticks once per row crossed.
 */
function WheelColumn({ values, selected, onChange, label }: ColumnProps) {
  const t = getSemanticTokens('day');
  const scrollRef = useRef<ScrollView>(null);
  // Row under the highlight while scrolling — drives styling and haptics.
  const [centered, setCentered] = useState(selected);
  const centeredRef = useRef(selected);

  // Follow external changes (preset chips) without fighting a live scroll.
  useEffect(() => {
    if (selected !== centeredRef.current) {
      centeredRef.current = selected;
      setCentered(selected);
      scrollRef.current?.scrollTo({ y: selected * ITEM_HEIGHT, animated: true });
    }
  }, [selected]);

  const indexAt = (y: number) =>
    Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_HEIGHT)));

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = indexAt(e.nativeEvent.contentOffset.y);
    if (index !== centeredRef.current) {
      centeredRef.current = index;
      setCentered(index);
      selectionAsync().catch(() => undefined);
    }
  };

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = indexAt(e.nativeEvent.contentOffset.y);
    if (index !== selected) onChange(index);
  };

  const handleA11yAction = (e: AccessibilityActionEvent) => {
    const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
    onChange((selected + step + values.length) % values.length);
  };

  return (
    <View
      style={styles.column}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: values[selected] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleA11yAction}
    >
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={settle}
        onLayout={() =>
          scrollRef.current?.scrollTo({ y: selected * ITEM_HEIGHT, animated: false })
        }
        contentContainerStyle={{ paddingVertical: PAD_ROWS * ITEM_HEIGHT }}
      >
        {values.map((v, i) => (
          <View key={v} style={styles.row}>
            <Text
              style={[
                typeScale.display,
                i === centered
                  ? [styles.selected, { color: t.textPrimary }]
                  : [styles.other, { color: t.textSecondary }],
              ]}
            >
              {v}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

interface TimeWheelProps {
  /** "HH:mm", 24-hour. */
  value: string;
  onChange: (time: string) => void;
}

/**
 * Inline 24-hour time picker: hour and minute wheels with a highlight band
 * on the selected row. Replaces the two-step clock dialog.
 */
export function TimeWheel({ value, onChange }: TimeWheelProps) {
  const t = getSemanticTokens('day');
  const [h, m] = value.split(':').map(Number);
  const hour = Number.isFinite(h) ? h : 0;
  const minute = Number.isFinite(m) ? m : 0;

  return (
    <View
      style={[styles.wheel, { backgroundColor: t.bgSurface, borderColor: t.border }]}
    >
      <View
        pointerEvents="none"
        style={[styles.band, { backgroundColor: primitives.energy[50] }]}
      />
      <WheelColumn
        values={HOURS}
        selected={hour}
        label="Hour"
        onChange={(i) => onChange(`${HOURS[i]}:${MINUTES[minute]}`)}
      />
      <Text style={[typeScale.display, styles.colon, { color: t.textPrimary }]}>:</Text>
      <WheelColumn
        values={MINUTES}
        selected={minute}
        label="Minute"
        onChange={(i) => onChange(`${HOURS[hour]}:${MINUTES[i]}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_HEIGHT * VISIBLE_ROWS,
    borderWidth: 1,
    borderRadius: radius.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: PAD_ROWS * ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
  },
  column: { width: 88, height: ITEM_HEIGHT * VISIBLE_ROWS },
  row: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  selected: { fontSize: 34, lineHeight: 40 },
  other: { fontSize: 22, lineHeight: 28 },
  colon: { fontSize: 34, lineHeight: 40, marginHorizontal: 4 },
});
