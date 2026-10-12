import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getSemanticTokens } from '../../theme/helpers';
import { components, primitives, type as typeScale } from '../../theme/tokens';

interface RepProgressRingProps {
  done: number;
  target: number;
}

/**
 * Ring progress: energy-500 arc on a surface-dark track, rep-counter type
 * ("13 / 20") centered. A completed rep pulses the ring once — feedback
 * visible without reading. Alarm mode only.
 */
export function RepProgressRing({ done, target }: RepProgressRingProps) {
  const t = getSemanticTokens('alarm');
  const { size, strokeWidth } = components.repRing;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(done / target, 1) : 0;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: done, max: target }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={components.repRing.trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={components.repRing.progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[typeScale.repCounter, { color: t.textPrimary }]}>{done}</Text>
        <Text style={[typeScale.heading, { color: primitives.energy[500] }]}>
          {`of ${target}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
