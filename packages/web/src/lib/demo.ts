import { useAuthStore } from '@/stores/auth-store';

export function isDemoSession(): boolean {
  const { user } = useAuthStore.getState();
  return user?.isDemo === true || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}
