import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { radius, space, type as typeScale } from '../../theme/tokens';
import { soundUriOf } from '../native/alarms';
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
  const available = isRingingModuleAvailable();
  const uri = soundUriOf(value);
  const [title, setTitle] = useState('Phone default');

  useEffect(() => {
    if (!available) return;
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
    setTitle(picked.title);
    onChange(picked.uri ?? '');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Alarm sound: ${title}`}
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
            Choosing a sound needs a dev build.
          </Text>
        )}
      </View>
      {available && (
        <Text style={[typeScale.label, { color: t.actionPrimary }]}>Change</Text>
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
