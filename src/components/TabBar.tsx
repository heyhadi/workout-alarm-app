import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTokens } from '../appearance';
import { useStrings } from '../i18n';
import { primitives } from '../../theme/tokens';

type TabId = 'index' | 'practice' | 'settings';

function TabIcon({ id, color }: { id: TabId; color: string }) {
  if (id === 'index') {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={13} r={7} stroke={color} strokeWidth={1.8} />
        <Path
          d="M12 9.5V13l2.5 2M5.5 4.5 3.8 6.2M18.5 4.5l1.7 1.7"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (id === 'practice') {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path
          d="M8 5.5v13l11-6.5-11-6.5Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.04 1.56.62.26 1.34.11 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01c.26.62.88 1.04 1.56 1.04H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51 1.04Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const LABELS: Record<TabId, 'title' | 'practice' | 'settings'> = {
  index: 'title',
  practice: 'practice',
  settings: 'settings',
};

/**
 * Custom bottom tab bar for the main tabs. Driven by the tab navigator —
 * tapping a tab switches without pushing onto the stack, so the system
 * back gesture behaves correctly.
 */
export function TabsBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTokens();
  const s = useStrings();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: t.bgScreen, borderTopColor: t.border },
      ]}
    >
      {state.routes.map((route, i) => {
        const id = route.name as TabId;
        const isActive = state.index === i;
        const color = isActive ? primitives.energy[500] : t.textSecondary;
        const label = s.alarms[LABELS[id]];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isActive && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}
          >
            <TabIcon id={id} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
