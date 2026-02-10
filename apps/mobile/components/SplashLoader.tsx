import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '@/lib/constants';

export function SplashLoader() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📚</Text>
      <Text style={styles.title}>Mati</Text>
      <Text style={styles.subtitle}>Learn to Read</Text>
      <ActivityIndicator
        size="large"
        color={COLORS.white}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
  },
  spinner: {
    marginTop: 32,
  },
});
