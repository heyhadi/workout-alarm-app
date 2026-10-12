import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getSemanticTokens } from '../../theme/helpers';
import { space, type as typeScale } from '../../theme/tokens';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level crash containment. A red screen of death at 6 a.m. must never
 * be the reason an alarm is missed — the native ringing service owns the
 * sound independently of this tree, but JS still degrades to a message
 * instead of a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // Hook for crash reporting (Sentry etc.) in a later milestone.
    if (__DEV__) {
      console.error('[ErrorBoundary]', error);
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      const t = getSemanticTokens('day');
      return (
        <View style={[styles.fallback, { backgroundColor: t.bgScreen }]}>
          <Text style={[typeScale.heading, { color: t.textPrimary }]}>
            Something went wrong
          </Text>
          <Text
            style={[typeScale.body, { color: t.textSecondary, marginTop: space.sm }]}
          >
            Your alarms are still scheduled natively and will ring as usual. Restart the
            app to continue.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
});
