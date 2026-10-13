import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getSemanticTokens } from '../../theme/helpers';
import { components, motion, type as typeScale } from '../../theme/tokens';

interface RepProgressRingProps {
  done: number;
  target: number;
  /** Diameter in dp. Defaults to the token size. */
  size?: number;
}

/**
 * Ring progress: energy-500 arc on a surface-dark track, the rep count
 * centered (the caller shows "of N" beside it). A completed rep pulses the
 * ring once — feedback visible from across the room without reading.
 * Alarm mode only.
 */
export function RepProgressRing({
  done,
  target,
  size = components.repRing.size,
}: RepProgressRingProps) {
  const t = getSemanticTokens('alarm');
  const { strokeWidth } = components.repRing;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(done / target, 1) : 0;
  const countSize = Math.round(size * 0.4);

  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (done === 0) return;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.08,
        duration: motion.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.slow,
        useNativeDriver: true,
      }),
    ]).start();
  }, [done, scale]);

  return (
    <Animated.View
      style={[styles.wrap, { transform: [{ scale }] }]}
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
        <Text
          style={[
            typeScale.repCounter,
            { color: t.textPrimary, fontSize: countSize, lineHeight: countSize },
          ]}
        >
          {done}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
