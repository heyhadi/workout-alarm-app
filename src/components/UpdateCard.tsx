import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../appearance';
import { radius, space, type as typeScale } from '../../theme/tokens';
import {
  addDownloadProgressListener,
  checkForUpdate,
  installUpdate,
} from '../native/updates';
import type { AvailableUpdate } from '../updates/latestRelease';
import { useStrings } from '../i18n';

type InstallState = 'idle' | 'downloading' | 'needs-permission' | 'failed';

/**
 * "Update available" card for the alarm list. Checks the repo's latest
 * GitHub release once per mount; renders nothing when up to date, offline,
 * or on a local build. Never shown on the ringing screen.
 */
export function UpdateCard() {
  const t = useTokens('day');
  const strings = useStrings();
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [state, setState] = useState<InstallState>('idle');
  const [progress, setProgress] = useState(0); // 0..1 while downloading

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
    setProgress(0);
    const unsub = addDownloadProgressListener((p) => {
      if (p.total > 0) setProgress(Math.min(1, p.downloaded / p.total));
    });
    try {
      await installUpdate(update);
      setState('idle'); // Android's installer is open now
    } catch (e) {
      const code = (e as { code?: string }).code;
      setState(code === 'NEEDS_INSTALL_PERMISSION' ? 'needs-permission' : 'failed');
    } finally {
      unsub();
    }
  };

  const detail =
    state === 'downloading'
      ? `${strings.update.downloading} ${Math.round(progress * 100)}%`
      : state === 'needs-permission'
        ? strings.update.needsPermission
        : state === 'failed'
          ? strings.update.failed
          : strings.update.ready(update.title);

  return (
    <View
      style={[styles.card, { backgroundColor: t.bgSurface, borderColor: t.border }]}
    >
      <View style={styles.main}>
        <Text style={[typeScale.label, { color: t.textPrimary }]}>
          {strings.update.available}
        </Text>
        <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>{detail}</Text>
        {state === 'downloading' && (
          <View
            style={[styles.track, { backgroundColor: t.border }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
          >
            <View
              style={[
                styles.fill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: t.accentStrong },
              ]}
            />
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={state === 'downloading'}
        onPress={handleInstall}
        style={[styles.button, { borderColor: t.accentStrong }]}
      >
        <Text style={[typeScale.label, { color: t.accentStrong }]}>
          {strings.update.install}
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
  track: {
    height: 6,
    borderRadius: 3,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
