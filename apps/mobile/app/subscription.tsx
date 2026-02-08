import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { SUBSCRIPTION_TIERS, COLORS } from '@/lib/constants';

const tiers = [
  { key: 'explorer' as const, isPopular: false },
  { key: 'scholar' as const, isPopular: true },
  { key: 'academy' as const, isPopular: false },
];

export default function SubscriptionModal() {
  const { isLoading, activeTier, purchase, restore } = useSubscription();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Plan</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Start with a free trial. Cancel anytime.
          </Text>

          <View style={styles.cards}>
            {tiers.map(({ key, isPopular }) => {
              const tier = SUBSCRIPTION_TIERS[key];
              return (
                <SubscriptionCard
                  key={key}
                  name={tier.name}
                  price={tier.price}
                  trialDays={tier.trialDays}
                  features={tier.features}
                  isActive={activeTier === key}
                  isPopular={isPopular}
                  onPress={() => purchase(tier.id)}
                />
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={restore}
            activeOpacity={0.7}
          >
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            Payment will be charged to your App Store / Google Play account.
            Subscription automatically renews unless cancelled at least 24 hours
            before the end of the current period. Manage subscriptions in your
            device settings.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    fontSize: 20,
    color: COLORS.foreground,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  cards: {
    gap: 16,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    color: '#999',
    textAlign: 'center',
  },
});
