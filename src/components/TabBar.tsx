import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives } from '../../theme/tokens';

type TabId = 'alarm' | 'practice' | 'settings';

const TABS: { id: TabId; label: string; route: string }[] = [
  { id: 'alarm', label: 'Alarm', route: '/' },
  { id: 'practice', label: 'Coba dulu', route: '/practice' },
  { id: 'settings', label: 'Pengaturan', route: '/settings' },
];

function TabIcon({ id, color }: { id: TabId; color: string }) {
  if (id === 'alarm') {
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

export function TabBar({ active }: { active: TabId }) {
  const router = useRouter();
  const scheme = useColorScheme();
  const t = getSemanticTokens(scheme === 'dark' ? 'alarm' : 'day');
  return (
    <View style={[styles.bar, { backgroundColor: t.bgScreen, borderTopColor: t.border }]}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const color = isActive ? primitives.energy[500] : t.textSecondary;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (!isActive) router.replace(tab.route as never);
            }}
            style={styles.tab}
          >
            <TabIcon id={tab.id} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
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
