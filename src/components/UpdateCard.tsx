import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';
import { checkForUpdate, installUpdate } from '../native/updates';
import type { AvailableUpdate } from '../updates/latestRelease';

type InstallState = 'idle' | 'downloading' | 'needs-permission' | 'failed';

/**
 * "Update available" card for the alarm list. Checks the repo's latest
 * GitHub release once per mount; renders nothing when up to date, offline,
 * or on a local build. Never shown on the ringing screen.
 */
export function UpdateCard() {
  const t = getSemanticTokens('day');
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [state, setState] = useState<InstallState>('idle');

  useEffect(() => {
    let cancelled = false;
    checkForUpdate()
      .then((u) => {
        if (!cancelled) setUpdate(u);
      })
      .catch(() => undefined); // offline or rate-limited: try next time
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  const handleInstall = async () => {
    setState('downloading');
    try {
      await installUpdate(update);
      setState('idle'); // Android's installer is open now
    } catch (e) {
      const code = (e as { code?: string }).code;
      setState(code === 'NEEDS_INSTALL_PERMISSION' ? 'needs-permission' : 'failed');
    }
  };

  const detail =
    state === 'downloading'
      ? 'Downloading…'
      : state === 'needs-permission'
        ? 'Allow installs from Workout Alarm in the settings that opened, then tap Install again.'
        : state === 'failed'
          ? 'Couldn’t install the update. Check your connection and try again.'
          : `${update.title} is ready to install.`;

  return (
    <View
      style={[styles.card, { backgroundColor: t.bgSurface, borderColor: t.border }]}
    >
      <View style={styles.main}>
        <Text style={[typeScale.label, { color: t.textPrimary }]}>
          Update available
        </Text>
        <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>{detail}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={state === 'downloading'}
        onPress={handleInstall}
        style={[styles.button, { borderColor: primitives.energy[600] }]}
      >
        <Text style={[typeScale.label, { color: primitives.energy[600] }]}>
          Install
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    gap: space.md,
  },
  main: { flex: 1 },
  button: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    minHeight: 40,
    justifyContent: 'center',
  },
});
