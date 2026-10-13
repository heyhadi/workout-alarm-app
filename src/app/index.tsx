import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlarmCard } from '../components/AlarmCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { UpdateCard } from '../components/UpdateCard';
import { useAlarmReadiness } from '../hooks/useAlarmReadiness';
import { isOnboardingDone, markOnboardingDone } from '../storage/settings';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, space, type as typeScale } from '../../theme/tokens';
import { timeUntil } from '../workout/scheduling';
import { useStrings } from '../i18n';
import {
  applyAlarmSchedule,
  cancelAlarm,
  isAlarmModuleAvailable,
  nextFireTimeMs,
} from '../native/alarms';
import {
  currentStreakDays,
  deleteAlarm,
  listAlarms,
  setAlarmEnabled,
} from '../storage/db';
import type { Alarm } from '../types';

/**
 * Screen 1 — Alarm list (day mode).
 * All alarms, next-alarm countdown, streak badge. Editing locks inside the
 * lock-in window: the toggle becomes a "Locked" badge.
 */
export default function AlarmListScreen() {
  const router = useRouter();
  const t = getSemanticTokens('day');
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [streak, setStreak] = useState(0);
  const [nextFire, setNextFire] = useState<number | undefined>(undefined);
  // Clock reading taken with nextFire, so render stays pure.
  const [refreshedAt, setRefreshedAt] = useState(0);
  const strings = useStrings();
  const readiness = useAlarmReadiness();
  const notReady = readiness.pending;

  // First launch: walk through the checklist once, if anything's missing.
  useEffect(() => {
    if (readiness.items === null || isOnboardingDone()) return;
    markOnboardingDone();
    if (notReady > 0) router.push('/readiness');
  }, [readiness.items, notReady, router]);

  const [lockedById, setLockedById] = useState<Map<string, boolean>>(() => new Map());

  const refresh = useCallback(async () => {
    const rows = await listAlarms();
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
    setNextFire(next);
    setRefreshedAt(now);
    setLockedById(locked);
    setStreak(await currentStreakDays());
  }, []);

  // Refresh on focus, then every 30 s so the countdown keeps moving.
  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
      const timer = setInterval(() => {
        refresh().catch(() => undefined);
      }, 30_000);
      return () => clearInterval(timer);
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
    // Native module not linked yet (Expo Go) — DB state is the fallback.
    await applyAlarmSchedule({ ...alarm, enabled }).catch(() => undefined);
    await refresh();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typeScale.display, { color: t.textPrimary, fontSize: 32 }]}>
          {strings.alarms.title}
        </Text>
        {streak > 0 && (
          <View style={[styles.streak, { backgroundColor: primitives.energy[50] }]}>
            <Text style={[typeScale.label, { color: primitives.energy[600] }]}>
              {`🔥 ${strings.streak(streak)}`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.links}>
        {(
          [
            [strings.alarms.practice, '/practice'],
            [strings.alarms.settings, '/settings'],
          ] as const
        ).map(([label, href]) => (
          <Pressable
            key={href}
            accessibilityRole="link"
            onPress={() => router.push(href)}
            style={[
              styles.link,
              { borderColor: t.border, backgroundColor: t.bgSurface },
            ]}
          >
            <Text style={[typeScale.bodySmall, { color: t.textPrimary }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {notReady > 0 && (
        <View
          style={[
            styles.notReady,
            {
              backgroundColor: primitives.energy[50],
              borderColor: primitives.energy[600],
            },
          ]}
        >
          <Text style={[typeScale.label, { color: primitives.energy[600] }]}>
            {strings.alarms.notReadyTitle}
          </Text>
          <Text style={[typeScale.bodySmall, { color: t.textPrimary }]}>
            {strings.alarms.notReadyBody(notReady)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/readiness')}
            style={[styles.fixButton, { backgroundColor: primitives.energy[600] }]}
          >
            <Text style={[typeScale.bodySmall, { color: primitives.white }]}>
              {strings.alarms.fixNow}
            </Text>
          </Pressable>
        </View>
      )}

      <UpdateCard />

      {nextFire !== undefined && (
        <Text
          style={[typeScale.body, { color: t.textSecondary, marginBottom: space.md }]}
        >
          {strings.alarms.nextAlarm(
            strings.timeUntil(timeUntil(nextFire, refreshedAt)),
          )}
        </Text>
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
              lockLabel={locked ? strings.alarms.locked(item.time) : ''}
              onToggle={(enabled) => handleToggle(item, enabled)}
              // Inside the lock-in window the alarm can't be edited or weakened.
              onPress={() => {
                if (!locked) router.push(`/alarm/${item.id}`);
              }}
              onDelete={() => handleDelete(item)}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={[typeScale.body, { color: t.textSecondary }]}>
            {strings.alarms.empty}
          </Text>
        }
        contentContainerStyle={styles.list}
      />

      <View style={styles.cta}>
        <PrimaryButton
          label={strings.alarms.newAlarm}
          onPress={() => router.push('/alarm/new')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  streak: {
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  notReady: {
    borderWidth: 1,
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.md,
    gap: space.xs,
  },
  fixButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginTop: space.xs,
    minHeight: 36,
    justifyContent: 'center',
  },
  links: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  link: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    minHeight: 36,
    justifyContent: 'center',
  },
  list: { paddingBottom: space.xl },
  cta: { paddingTop: space.sm },
});
