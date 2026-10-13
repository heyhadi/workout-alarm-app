import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { radius, space, type as typeScale } from '../../theme/tokens';
import { soundUriOf } from '../native/alarms';
import { useStrings } from '../i18n';
import {
  getSoundTitle,
  isRingingModuleAvailable,
  pickAlarmSound,
} from '../native/ringing';

interface SoundPickerProps {
  /** Stored alarm sound: a content URI, or anything else for the default. */
  value: string;
  onChange: (ringtone: string) => void;
}

/**
 * "Sound" row on the alarm form. Opens Android's own alarm-sound picker
 * (no silent option) and shows the chosen sound's name.
 */
export function SoundPicker({ value, onChange }: SoundPickerProps) {
  const t = getSemanticTokens('day');
  const strings = useStrings();
  const available = isRingingModuleAvailable();
  const uri = soundUriOf(value);
  // Named sounds come from Android; the default is ours to translate.
  const [pickedTitle, setTitle] = useState<string | null>(null);
  const title = uri && pickedTitle ? pickedTitle : strings.sound.phoneDefault;

  useEffect(() => {
    if (!available || !uri) return;
    let cancelled = false;
    getSoundTitle(uri)
      .then((name) => {
        if (!cancelled) setTitle(name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [available, uri]);

  const handlePress = async () => {
    const picked = await pickAlarmSound(uri).catch(() => null);
    if (!picked) return; // backed out: keep the current sound
    setTitle(picked.uri ? picked.title : null);
    onChange(picked.uri ?? '');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.sound.label(title)}
      disabled={!available}
      onPress={handlePress}
      style={[styles.row, { backgroundColor: t.bgSurface, borderColor: t.border }]}
    >
      <View style={styles.main}>
        <Text style={[typeScale.body, { color: t.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {!available && (
          <Text style={[typeScale.bodySmall, { color: t.textSecondary }]}>
            {strings.sound.needsDevBuild}
          </Text>
        )}
      </View>
      {available && (
        <Text style={[typeScale.label, { color: t.actionPrimary }]}>
          {strings.sound.change}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 48,
    marginTop: space.xs,
  },
  main: { flex: 1, marginRight: space.md },
});
