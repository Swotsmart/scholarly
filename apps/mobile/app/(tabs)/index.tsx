import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { COLORS } from '@/lib/constants';

const modules = [
  {
    id: 'phonics-forest',
    title: 'Phonics Forest',
    description: 'Learn letters and sounds',
    emoji: '🌲',
    color: '#40a02b',
    route: '/(tabs)/learn' as const,
  },
  {
    id: 'story-garden',
    title: 'Story Garden',
    description: 'Read interactive stories',
    emoji: '🌻',
    color: '#fe640b',
    route: '/(tabs)/learn' as const,
  },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const activeChild = useAppStore((s) => s.activeChild);

  const childName = activeChild?.name ?? user?.children?.[0]?.name ?? 'Explorer';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {childName}! 👋</Text>
          <Text style={styles.subtitle}>What shall we learn today?</Text>
        </View>

        <View style={styles.modules}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              style={[styles.moduleCard, { borderLeftColor: mod.color }]}
              onPress={() => router.push(mod.route)}
              activeOpacity={0.8}
            >
              <Text style={styles.moduleEmoji}>{mod.emoji}</Text>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleDescription}>{mod.description}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Stars</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>📖</Text>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Stories</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔤</Text>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Letters</Text>
            </View>
          </View>
        </View>
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
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  modules: {
    gap: 12,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleEmoji: {
    fontSize: 40,
  },
  moduleInfo: {
    flex: 1,
    gap: 4,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#888',
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
  statsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
});
