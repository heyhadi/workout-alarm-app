import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { useStrings } from '../../i18n';
import { AlarmForm, type AlarmFormValue } from '../../components/AlarmForm';
import { useTokens } from '../../appearance';
import { type as typeScale } from '../../../theme/tokens';
import { getAlarm, upsertAlarm } from '../../storage/db';
import { applyAlarmSchedule } from '../../native/alarms';
import { loadChecklist } from '../../native/readiness';
import { pendingCount } from '../../readiness/checklist';
import type { Alarm } from '../../types';

/** Edit an existing alarm. Blocked by the list screen inside lock-in. */
export default function EditAlarmScreen() {
  const router = useRouter();
  const strings = useStrings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTokens('day');
  const [alarm, setAlarm] = useState<Alarm | null>(null);

  useEffect(() => {
    getAlarm(id)
      .then(setAlarm)
      .catch(() => undefined);
  }, [id]);

  if (!alarm) {
    return (
      <Screen>
        <Text style={[typeScale.body, { color: t.textSecondary }]}>
          {strings.common.loading}
        </Text>
      </Screen>
    );
  }

  const initial: AlarmFormValue = {
    time: alarm.time,
    days: alarm.days,
    exercise: alarm.exercise,
    repTarget: alarm.repTarget,
    difficulty: alarm.difficulty,
    ringtone: alarm.ringtone,
    backupExercise: alarm.backupExercise,
    lockInMinutes: alarm.lockInMinutes,
  };

  const handleSubmit = async (value: AlarmFormValue) => {
    const updated = { ...alarm, ...value, updatedAt: Date.now() };
    await upsertAlarm(updated);
    // The native alarm must follow the edit, or it still fires at the old
    // time with the old exercise.
    await applyAlarmSchedule(updated).catch(() => undefined);
    // Anything the phone still blocks → the readiness checklist, now,
    // while the user is awake — not at 6 a.m.
    const checklist = await loadChecklist().catch(() => []);
    if (pendingCount(checklist) > 0) {
      router.replace('/readiness');
    } else {
      router.back();
    }
  };

  return (
    <Screen>
      <AlarmForm
        initial={initial}
        submitLabel={strings.form.saveChanges}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}
