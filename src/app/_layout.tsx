import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
import { getRingingIntent, isRingingModuleAvailable } from '../native/ringing';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout: loads display/body fonts, initialises SQLite, wraps the
 * whole tree in the error boundary. Every file under src/app/ is a route.
 */
export default function RootLayout() {
  const router = useRouter();
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

  // If the app was launched (or woken) by the alarm's full-screen intent,
  // route straight to the workout screen. The native side consumes the
  // intent, so a second read won't re-route.
  useEffect(() => {
    if (!isRingingModuleAvailable()) return;
    const checkRingingIntent = () => {
      getRingingIntent()
        .then((intent) => {
          if (intent) {
            router.replace({
              pathname: '/ringing',
              params: { alarmId: intent.alarmId },
            });
          }
        })
        .catch(() => undefined);
    };
    checkRingingIntent();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkRingingIntent();
    });
    return () => sub.remove();
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
  );
}
