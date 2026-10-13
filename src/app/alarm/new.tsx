import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { AlarmForm, type AlarmFormValue } from '../../components/AlarmForm';
import { upsertAlarm } from '../../storage/db';
import { applyAlarmSchedule } from '../../native/alarms';
import { ensureAlarmPermissions } from '../../native/alarmPermissions';

const DEFAULTS: AlarmFormValue = {
  time: '06:30',
  days: [1, 2, 3, 4, 5],
  exercise: 'squats',
  repTarget: 20,
  difficulty: 'standard',
  ringtone: '',
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
    // Expo Go / web: DB-only until a dev build links the native module.
    await applyAlarmSchedule(alarm).catch(() => undefined);
    await ensureAlarmPermissions();
    router.back();
  };

  return (
    <Screen>
      <AlarmForm initial={DEFAULTS} submitLabel="Save alarm" onSubmit={handleSubmit} />
    </Screen>
  );
}
