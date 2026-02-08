import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
