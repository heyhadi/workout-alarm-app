import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { loadChecklist } from '../native/readiness';
import { pendingCount, type ChecklistItem } from '../readiness/checklist';

/**
 * The live readiness checklist. Rechecks on focus and whenever the app
 * comes back to the foreground — i.e. after the user returns from a
 * system settings page.
 */
export function useAlarmReadiness() {
  const [items, setItems] = useState<ChecklistItem[] | null>(null);

  const refresh = useCallback(async () => {
    setItems(await loadChecklist().catch(() => []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh]);

  return {
    /** Null until the first check finishes. */
    items,
    pending: items ? pendingCount(items) : 0,
    refresh,
  };
}
