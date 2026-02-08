import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/lib/constants';

interface SubscriptionCardProps {
  name: string;
  price: string;
  trialDays: number;
  features: readonly string[];
  isActive: boolean;
  isPopular?: boolean;
  onPress: () => void;
}

export function SubscriptionCard({
  name,
  price,
  trialDays,
  features,
  isActive,
  isPopular,
  onPress,
}: SubscriptionCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isPopular && styles.cardPopular,
        isActive && styles.cardActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isActive}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}

      <Text style={[styles.name, isPopular && styles.namePopular]}>{name}</Text>
      <Text style={[styles.price, isPopular && styles.pricePopular]}>{price}</Text>
      <Text style={styles.trial}>{trialDays}-day free trial</Text>

      <View style={styles.features}>
        {features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.button,
          isPopular && styles.buttonPopular,
          isActive && styles.buttonActive,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            isPopular && styles.buttonTextPopular,
            isActive && styles.buttonTextActive,
          ]}
        >
          {isActive ? 'Current Plan' : 'Start Free Trial'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: '#eee',
  },
  cardPopular: {
    borderColor: COLORS.primary,
  },
  cardActive: {
    borderColor: COLORS.success,
    opacity: 0.8,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  namePopular: {
    color: COLORS.primary,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  pricePopular: {
    color: COLORS.primary,
  },
  trial: {
    fontSize: 13,
    color: '#888',
  },
  features: {
    gap: 6,
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  check: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  button: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  buttonPopular: {
    backgroundColor: COLORS.primary,
  },
  buttonActive: {
    backgroundColor: '#e8f5e9',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  buttonTextPopular: {
    color: COLORS.white,
  },
  buttonTextActive: {
    color: COLORS.success,
  },
});
