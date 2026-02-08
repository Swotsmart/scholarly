import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useAppStore } from '@/stores/app-store';
import { SUBSCRIPTION_TIERS } from '@/lib/constants';

/**
 * In-app purchase subscription hook.
 *
 * Uses expo-in-app-purchases for both iOS and Android.
 * Products must be configured in App Store Connect and Google Play Console.
 */

const PRODUCT_IDS = [
  SUBSCRIPTION_TIERS.explorer.id,
  SUBSCRIPTION_TIERS.scholar.id,
  SUBSCRIPTION_TIERS.academy.id,
];

interface Product {
  productId: string;
  title: string;
  price: string;
  description: string;
}

interface SubscriptionState {
  products: Product[];
  isLoading: boolean;
  activeTier: string | null;
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeTier = useAppStore((s) => s.subscriptionTier);
  const setSubscriptionTier = useAppStore((s) => s.setSubscriptionTier);

  useEffect(() => {
    async function loadProducts() {
      try {
        // Dynamic import to avoid crash if not available
        const IAP = await import('expo-in-app-purchases');
        await IAP.connectAsync();

        const { results } = await IAP.getProductsAsync(PRODUCT_IDS);
        if (results) {
          setProducts(
            results.map((r) => ({
              productId: r.productId,
              title: r.title,
              price: r.price,
              description: r.description,
            }))
          );
        }

        // Listen for purchase updates
        IAP.setPurchaseListener(({ responseCode, results: purchaseResults }) => {
          if (responseCode === IAP.IAPResponseCode.OK && purchaseResults) {
            for (const purchase of purchaseResults) {
              if (!purchase.acknowledged) {
                IAP.finishTransactionAsync(purchase, true);
              }
              // Determine tier from product ID
              const tier = Object.entries(SUBSCRIPTION_TIERS).find(
                ([, t]) => t.id === purchase.productId
              );
              if (tier) {
                setSubscriptionTier(tier[0]);
              }
            }
          }
        });
      } catch {
        // IAP not available (simulator, etc.)
        // Populate with placeholder data for development
        setProducts(
          Object.values(SUBSCRIPTION_TIERS).map((tier) => ({
            productId: tier.id,
            title: tier.name,
            price: tier.price,
            description: tier.features.join(', '),
          }))
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();

    return () => {
      import('expo-in-app-purchases')
        .then((IAP) => IAP.disconnectAsync())
        .catch(() => {});
    };
  }, [setSubscriptionTier]);

  const purchase = useCallback(async (productId: string) => {
    try {
      const IAP = await import('expo-in-app-purchases');
      await IAP.purchaseItemAsync(productId);
    } catch {
      Alert.alert(
        'Purchase Error',
        'Unable to complete the purchase. Please try again.'
      );
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      const IAP = await import('expo-in-app-purchases');
      const { results } = await IAP.getPurchaseHistoryAsync();

      if (results && results.length > 0) {
        // Find the most recent active subscription
        const latestPurchase = results[results.length - 1];
        const tier = Object.entries(SUBSCRIPTION_TIERS).find(
          ([, t]) => t.id === latestPurchase.productId
        );
        if (tier) {
          setSubscriptionTier(tier[0]);
          Alert.alert('Restored', `Your ${tier[1].name} subscription has been restored.`);
          return;
        }
      }

      Alert.alert('No Purchases', 'No previous subscriptions were found.');
    } catch {
      Alert.alert('Restore Error', 'Unable to restore purchases. Please try again.');
    }
  }, [setSubscriptionTier]);

  return {
    products,
    isLoading,
    activeTier,
    purchase,
    restore,
  };
}
