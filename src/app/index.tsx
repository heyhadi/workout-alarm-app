import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlarmCard } from '../components/AlarmCard';
import { Screen } from '../components/Screen';
import { TabBar } from '../components/TabBar';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, space } from '../../theme/tokens';
import {
  cancelAlarm,
  isAlarmModuleAvailable,
  nextFireTimeMs,
  scheduleAlarm,
} from '../native/alarms';
import {
  currentStreakDays,
  deleteAlarm,
  listAlarms,
  setAlarmEnabled,
  upsertAlarm,
} from '../storage/db';
import type { Alarm } from '../types';

const SAMPLE_ALARM: Alarm = {
  id: 'sample-1',
  time: '06:30',
  days: [1, 2, 3, 4, 5],
  exercise: 'squats',
  repTarget: 20,
  difficulty: 'standard',
  ringtone: 'Morning energy',
  backupExercise: 'steps',
  lockInMinutes: 30,
  enabled: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function CountdownText({ hours, minutes }: { hours: number; minutes: number }) {
  const scheme = useColorScheme();
  const t = getSemanticTokens(scheme === 'dark' ? 'alarm' : 'day');
  return (
    <Text style={[styles.countdown, { color: t.textSecondary }]}>
      Alarm berikutnya{' '}
      <Text style={styles.countdownHot}>
        {`${hours} jam ${minutes} menit lagi`}
      </Text>
    </Text>
  );
}

/**
 * Screen 1 — Alarm list (dark home screen).
 * All alarms, next-alarm countdown, streak badge, bottom tabs.
 * Editing locks inside the lock-in window: the toggle becomes a badge.
 */
export default function AlarmListScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const mode = scheme === 'dark' ? 'alarm' : 'day';
  const t = getSemanticTokens(mode);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [streak, setStreak] = useState(0);
  const [countdown, setCountdown] = useState<{ h: number; m: number } | undefined>(
    undefined,
  );
  const [lockedById, setLockedById] = useState<Map<string, boolean>>(() => new Map());

  const refresh = useCallback(async () => {
    let rows = await listAlarms();
    if (rows.length === 0) {
      await upsertAlarm(SAMPLE_ALARM);
      rows = await listAlarms();
    }
    // Clock-dependent derivations live here (async), never during render.
    const now = Date.now();
    const locked = new Map<string, boolean>();
    let next: number | undefined;
    for (const alarm of rows) {
      if (!alarm.enabled) {
        locked.set(alarm.id, false);
        continue;
      }
      const fireMs = nextFireTimeMs(alarm.time, alarm.days, now);
      const msLeft = fireMs - now;
      locked.set(alarm.id, msLeft > 0 && msLeft < alarm.lockInMinutes * 60_000);
      if (next === undefined || fireMs < next) {
        next = fireMs;
      }
    }
    setAlarms(rows);
    if (next !== undefined) {
      const diffMs = Math.max(0, next - Date.now());
      setCountdown({
        h: Math.floor(diffMs / 3_600_000),
        m: Math.floor((diffMs % 3_600_000) / 60_000),
      });
    } else {
      setCountdown(undefined);
    }
    setLockedById(locked);
    setStreak(await currentStreakDays());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const handleDelete = async (alarm: Alarm) => {
    await deleteAlarm(alarm.id);
    try {
      if (isAlarmModuleAvailable()) {
        await cancelAlarm(alarm.id);
      }
    } catch {
      // Native module not linked yet (Expo Go) — DB state is the fallback.
    }
    await refresh();
  };

  const handleToggle = async (alarm: Alarm, enabled: boolean) => {
    await setAlarmEnabled(alarm.id, enabled);
    try {
      if (enabled && isAlarmModuleAvailable()) {
        await scheduleAlarm({
          alarmId: alarm.id,
          time: alarm.time,
          days: alarm.days,
          exercise: alarm.exercise,
          repTarget: alarm.repTarget,
        });
      } else if (isAlarmModuleAvailable()) {
        await cancelAlarm(alarm.id);
      }
    } catch {
      // Native module not linked yet (Expo Go) — DB state is the fallback.
    }
    await refresh();
  };

  return (
    <Screen mode={mode} noPadding>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.textPrimary }]}>Alarm</Text>
          {streak > 0 && (
            <View style={[styles.streak, { backgroundColor: t.bgSurface }]}>
              <Text style={styles.streakText}>{`🔥 ${streak} pagi`}</Text>
            </View>
          )}
        </View>

        {countdown !== undefined && (
          <View style={styles.countdownWrap}>
            <CountdownText hours={countdown.h} minutes={countdown.m} />
          </View>
        )}

        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const locked = lockedById.get(item.id) ?? false;
            return (
              <AlarmCard
                alarm={item}
                locked={locked}
                lockLabel={locked ? `Locked — fires ${item.time}` : ''}
                onToggle={(enabled) => handleToggle(item, enabled)}
                onPress={() => router.push(`/alarm/${item.id}`)}
                onDelete={() => handleDelete(item)}
              />
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: t.textSecondary }]}>
              Belum ada alarm. Tambah yang pertama di bawah.
            </Text>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/alarm/new')}
          style={styles.newButton}
        >
          <Text style={styles.newButtonText}>+ Alarm baru</Text>
        </Pressable>
      </View>
      <TabBar active="alarm" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 36,
    lineHeight: 40,
  },
  streak: {
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  streakText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: primitives.energy[400],
  },
  countdownWrap: {
    marginBottom: space.lg,
  },
  countdown: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 24,
  },
  countdownHot: {
    color: primitives.energy[500],
    fontFamily: 'Inter_600SemiBold',
  },
  list: { paddingBottom: space.md },
  empty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginTop: space.xl,
  },
  newButton: {
    backgroundColor: primitives.energy[500],
    borderRadius: 32,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  newButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: primitives.white,
  },
});
