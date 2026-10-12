import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { AlarmForm, type AlarmFormValue } from '../../components/AlarmForm';
import { getSemanticTokens } from '../../../theme/helpers';
import { type as typeScale } from '../../../theme/tokens';
import { getAlarm, upsertAlarm } from '../../storage/db';
import type { Alarm } from '../../types';

/** Edit an existing alarm. Blocked by the list screen inside lock-in. */
export default function EditAlarmScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = getSemanticTokens('day');
  const [alarm, setAlarm] = useState<Alarm | null>(null);

  useEffect(() => {
    getAlarm(id)
      .then(setAlarm)
      .catch(() => undefined);
  }, [id]);

  if (!alarm) {
    return (
      <Screen>
        <Text style={[typeScale.body, { color: t.textSecondary }]}>Loading…</Text>
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
    await upsertAlarm({ ...alarm, ...value, updatedAt: Date.now() });
    router.back();
  };

  return (
    <Screen>
      <AlarmForm initial={initial} submitLabel="Save changes" onSubmit={handleSubmit} />
    </Screen>
  );
}
