import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { useAuthStore } from '@/stores/auth-store';
import { COLORS } from '@/lib/constants';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    async function prepare() {
      await Font.loadAsync({
        'Montserrat-Regular': require('@/assets/fonts/Montserrat-Regular.ttf'),
        'Montserrat-Bold': require('@/assets/fonts/Montserrat-Bold.ttf'),
        'Montserrat-SemiBold': require('@/assets/fonts/Montserrat-SemiBold.ttf'),
      }).catch(() => {
        // Fonts may not be bundled yet; continue with system font
      });

      await initialize();
      await SplashScreen.hideAsync();
    }

    prepare();
  }, [initialize]);

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="parental-gate"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="subscription"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
