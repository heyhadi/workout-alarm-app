import { Tabs } from 'expo-router';
import { TabsBar } from '../../components/TabBar';

/**
 * Bottom tabs: Alarm list, Practice, Settings.
 * Real tab navigator — switching tabs doesn't pollute the back stack,
 * so the system back gesture returns to the previous screen correctly.
 * URLs are unchanged: /(tabs)/index is still `/`.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabsBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="practice" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
