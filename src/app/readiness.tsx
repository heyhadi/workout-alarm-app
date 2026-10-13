import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlarmReadiness } from '../hooks/useAlarmReadiness';
import { allow, markAutostartDone } from '../native/readiness';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import type { ChecklistItem, ItemState } from '../readiness/checklist';

const STATE_UI: Record<ItemState, { color: string; mark: string }> = {
  ok: { color: primitives.success[500], mark: '✓' },
  missing: { color: primitives.danger[500], mark: '!' },
  unverifiable: { color: primitives.warning[500], mark: '?' },
};

/**
 * Get alarm-ready: one row per thing the phone must allow, each with the
 * button that allows it. Shown on first launch and after saving an alarm
 * while anything is missing; rechecks whenever the user comes back from a
 * system settings page.
 */
export default function ReadinessScreen() {
  const router = useRouter();
  const t = getSemanticTokens('day');
  const { items, pending, refresh } = useAlarmReadiness();

  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const handleAllow = (item: ChecklistItem) => {
    allow(item.key)
      .catch(() => undefined)
      .finally(() => {
        refresh().catch(() => undefined);
      });
  };

  const handleAutostartDone = () => {
    markAutostartDone();
    refresh().catch(() => undefined);
  };

  const total = items?.length ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typeScale.display, { color: t.textPrimary, fontSize: 30 }]}>
          Get alarm-ready
        </Text>
        <Text style={[typeScale.body, { color: t.textSecondary, marginTop: space.xs }]}>
          {items === null
            ? 'Checking…'
            : pending === 0
              ? 'All set — your alarm can ring, take over the screen and be finished.'
              : `${total - pending} of ${total} done · rechecks when you come back`}
        </Text>

        {items?.map((item) => {
          const ui = STATE_UI[item.state];
          return (
            <View
              key={item.key}
              style={[
                styles.row,
                { backgroundColor: t.bgSurface, borderColor: t.border },
              ]}
            >
              <View style={[styles.mark, { backgroundColor: ui.color }]}>
                <Text style={[typeScale.label, styles.markText]}>{ui.mark}</Text>
              </View>
              <View style={styles.main}>
                <Text style={[typeScale.label, { color: t.textPrimary }]}>
                  {item.title}
                </Text>
                {item.state !== 'ok' && (
                  <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
                    {item.why}
                  </Text>
                )}
              </View>
              {item.state === 'missing' && (
                <RowButton label="Allow" onPress={() => handleAllow(item)} />
              )}
              {item.state === 'unverifiable' && (
                <View style={styles.pair}>
                  <RowButton label="Open" onPress={() => handleAllow(item)} />
                  <RowButton label="Done" onPress={handleAutostartDone} />
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.cta}>
          <PrimaryButton
            label={pending === 0 ? 'Done' : 'Finish later'}
            onPress={done}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function RowButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { borderColor: primitives.energy[600] }]}
    >
      <Text style={[typeScale.bodySmall, { color: primitives.energy[600] }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
    gap: space.md,
  },
  mark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: primitives.white, fontSize: 13, lineHeight: 16 },
  main: { flex: 1 },
  pair: { gap: space.xs },
  button: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cta: { marginTop: space.xl },
});
