import { Tabs, Redirect } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { COLORS } from '@/lib/constants';

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

  if (!isAuthenticated || !hasCompletedOnboarding) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" emoji="🏠" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Learn" emoji="📖" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="parent"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Parent" emoji="👤" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 80,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabIcon: {
    alignItems: 'center',
    gap: 2,
  },
  emoji: {
    fontSize: 24,
    opacity: 0.5,
  },
  emojiFocused: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  labelFocused: {
    color: COLORS.primary,
  },
});
