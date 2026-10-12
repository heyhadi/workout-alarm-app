import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { getSemanticTokens } from '../../theme/helpers';
import { primitives, radius, space, type as typeScale } from '../../theme/tokens';

/**
 * Screen 3 — Practice mode (day mode UI, camera on).
 * Camera framing guide, form feedback, test rep counting — deliberately
 * NO lockdown, so the first real morning is not a learning curve.
 */
export default function PracticeScreen() {
  const t = getSemanticTokens('day');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <Screen>
        <Text style={[typeScale.body, { color: t.textSecondary }]}>
          Checking camera permission…
        </Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Text style={[typeScale.heading, { color: t.textPrimary }]}>
          Camera access needed
        </Text>
        <Text
          style={[typeScale.body, { color: t.textSecondary, marginVertical: space.md }]}
        >
          Practice mode shows you how to frame your body so the rep counter can see you.
          Nothing is recorded — frames are analysed on-device.
        </Text>
        <PrimaryButton label="Allow camera" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <View style={styles.container}>
        <CameraView style={styles.camera} facing="front">
          {/* Framing guide: get your full body inside the dashed frame. */}
          <View style={styles.guide}>
            <View style={[styles.frame, { borderColor: primitives.energy[500] }]} />
            <Text style={[typeScale.body, styles.hint, { color: '#fff' }]}>
              Full body in frame
            </Text>
          </View>
          {/* Skeleton overlay + live form feedback arrive with the
              PoseModule dev build; the layout reserves the space. */}
          <View
            style={[styles.feedback, { backgroundColor: 'rgba(10, 22, 46, 0.72)' }]}
          >
            <Text style={[typeScale.body, { color: '#fff' }]}>
              Skeleton overlay and form cues appear here in a dev build.
            </Text>
          </View>
        </CameraView>
        <View style={[styles.footer, { backgroundColor: t.bgScreen }]}>
          <Text style={[typeScale.body, { color: t.textSecondary }]}>
            Practice has no lockdown — experiment freely. When the PoseModule is linked,
            this screen counts test reps with the same rules as the real alarm.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  guide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  frame: {
    width: '72%',
    height: '62%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  hint: {
    marginTop: space.sm,
    backgroundColor: 'rgba(10, 22, 46, 0.6)',
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  feedback: {
    position: 'absolute',
    bottom: space.lg,
    left: space.md,
    right: space.md,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  footer: { padding: space.md },
});
