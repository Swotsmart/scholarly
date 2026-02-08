import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { COLORS, WEBVIEW_URLS } from '@/lib/constants';
import * as Linking from 'expo-linking';

export default function ParentScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isParentalGateValid = useAppStore((s) => s.isParentalGateValid);

  function requireGate(action: () => void) {
    if (isParentalGateValid()) {
      action();
    } else {
      router.push('/parental-gate');
    }
  }

  function handleLogout() {
    requireGate(() => {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]);
    });
  }

  function handleSubscription() {
    requireGate(() => {
      router.push('/subscription');
    });
  }

  function handlePrivacy() {
    Linking.openURL(WEBVIEW_URLS.privacy);
  }

  function handleSupport() {
    Linking.openURL(WEBVIEW_URLS.support);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Parent Dashboard</Text>
          <Text style={styles.subtitle}>
            {user?.email ?? 'Manage your family settings'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSubscription}
            activeOpacity={0.7}
          >
            <Text style={styles.menuEmoji}>💳</Text>
            <Text style={styles.menuLabel}>Subscription</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => requireGate(() => {})}
            activeOpacity={0.7}
          >
            <Text style={styles.menuEmoji}>👨‍👩‍👧</Text>
            <Text style={styles.menuLabel}>Manage Children</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => requireGate(() => {})}
            activeOpacity={0.7}
          >
            <Text style={styles.menuEmoji}>🔔</Text>
            <Text style={styles.menuLabel}>Notifications</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePrivacy}
            activeOpacity={0.7}
          >
            <Text style={styles.menuEmoji}>🔒</Text>
            <Text style={styles.menuLabel}>Privacy Policy</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSupport}
            activeOpacity={0.7}
          >
            <Text style={styles.menuEmoji}>💬</Text>
            <Text style={styles.menuLabel}>Help & Support</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  header: {
    gap: 4,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  menuEmoji: {
    fontSize: 20,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.foreground,
  },
  menuArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.destructive,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.destructive,
  },
});
