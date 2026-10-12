import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { AlarmForm, type AlarmFormValue } from '../../components/AlarmForm';
import { upsertAlarm } from '../../storage/db';
import { getSettings } from '../../storage/settings';
import { isAlarmModuleAvailable, scheduleAlarm } from '../../native/alarms';

const DEFAULTS: AlarmFormValue = {
  time: '06:30',
  days: [1, 2, 3, 4, 5],
  exercise: 'squats',
  repTarget: 20,
  difficulty: 'standard',
  ringtone: 'Morning energy',
  backupExercise: 'steps',
  lockInMinutes: 30,
};

/** Create a new alarm, then schedule it natively when the bridge exists. */
export default function NewAlarmScreen() {
  const router = useRouter();

  const handleSubmit = async (value: AlarmFormValue) => {
    const now = Date.now();
    const alarm = {
      id: `alarm-${now}`,
      ...value,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await upsertAlarm(alarm);
    try {
      if (isAlarmModuleAvailable()) {
        const settings = getSettings();
        await scheduleAlarm({
          alarmId: alarm.id,
          time: alarm.time,
          days: alarm.days,
          exercise: alarm.exercise,
          repTarget: alarm.repTarget,
        });
        void settings;
      }
    } catch {
      // Expo Go / web: DB-only until a dev build links the native module.
    }
    router.back();
  };

  return (
    <Screen>
      <AlarmForm initial={DEFAULTS} submitLabel="Save alarm" onSubmit={handleSubmit} />
    </Screen>
  );
}
