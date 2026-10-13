import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { type Mode } from '../../theme/helpers';
import { useTokens } from '../appearance';
import { space } from '../../theme/tokens';

interface ScreenProps {
  mode?: Mode;
  children: ReactNode;
  /** Disable the default horizontal padding (e.g. full-bleed camera). */
  noPadding?: boolean;
  /**
   * Safe-area edges to inset. Full-bleed screens (the workout camera) pass
   * fewer and offset their own overlays instead.
   */
  edges?: Edge[];
}

const ALL_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

/** App screen shell: safe area + mode background + standard padding. */
export function Screen({
  mode = 'day',
  children,
  noPadding = false,
  edges = ALL_EDGES,
}: ScreenProps) {
  const t = useTokens(mode);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bgScreen }]} edges={edges}>
      <View
        style={[
          styles.body,
          { backgroundColor: t.bgScreen },
          noPadding && styles.noPadding,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: space.md, paddingVertical: space.md },
  noPadding: { paddingHorizontal: 0, paddingVertical: 0 },
});
