import { useEffect, useRef } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initDatabase } from '../storage/db';
import {
  addRingingIntentListener,
  getActiveRinging,
  getRingingIntent,
  isRingingModuleAvailable,
} from '../native/ringing';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout: loads display/body fonts, initialises SQLite, wraps the
 * whole tree in the error boundary. Every file under src/app/ is a route.
 */
export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_800ExtraBold,
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    initDatabase().catch((error) => {
      if (__DEV__) console.error('[db] init failed', error);
    });
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // If the app was launched (or woken) by the alarm's full-screen intent,
  // route straight to the workout screen. The native side consumes the
  // intent, so a second read won't re-route. Falls back to asking the
  // ringing service directly, in case the intent was missed.
  useEffect(() => {
    if (!isRingingModuleAvailable()) return;
    const routeToRinging = (
      intent: {
        alarmId: string;
        exercise: string;
        repTarget: number;
      } | null,
    ) => {
      // Already on the workout screen (e.g. the phone woke up mid-set):
      // re-routing would remount it and reset the rep count.
      if (intent && pathnameRef.current !== '/ringing') {
        router.replace({
          pathname: '/ringing',
          params: { alarmId: intent.alarmId },
        });
      }
    };
    const checkRingingIntent = () => {
      getRingingIntent()
        .then((intent) => intent ?? getActiveRinging())
        .then(routeToRinging)
        .catch(() => undefined);
    };
    checkRingingIntent();
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkRingingIntent();
    });
    // Fired by MainActivity.onNewIntent when the alarm arrives while the
    // app is already alive — AppState won't change if we're foregrounded.
    const intentSub = addRingingIntentListener(checkRingingIntent);
    return () => {
      appStateSub.remove();
      intentSub();
    };
  }, [router]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            // Screens set their own headers; the ringing screen hides it.
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
