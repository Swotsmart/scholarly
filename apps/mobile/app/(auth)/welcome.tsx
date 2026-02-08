import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { OnboardingSlide } from '@/components/OnboardingSlide';
import { COLORS } from '@/lib/constants';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Learn to Read',
    description:
      'Phonics Forest makes learning letters and sounds an adventure your child will love.',
    emoji: '📖',
    color: '#e8b4f8',
  },
  {
    id: '2',
    title: 'Story Garden',
    description:
      'Interactive stories that grow with your child, building vocabulary and comprehension.',
    emoji: '🌱',
    color: '#b4e8d4',
  },
  {
    id: '3',
    title: 'Safe & Private',
    description:
      'Designed for ages 3-7. No ads, no tracking, no social features. COPPA compliant.',
    emoji: '🛡️',
    color: '#b4d4f8',
  },
];

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [coppaConsented, setCoppaConsented] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const setCOPPAConsent = useAuthStore((s) => s.setCOPPAConsent);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  function handleNext() {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  }

  function handleGetStarted() {
    if (!coppaConsented) return;
    setCOPPAConsent(true);
    setOnboardingComplete(true);
    router.replace('/(auth)/login');
  }

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item }) => <OnboardingSlide slide={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {isLastSlide ? (
        <View style={styles.consentSection}>
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setCoppaConsented(!coppaConsented)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, coppaConsented && styles.checkboxChecked]}>
              {coppaConsented && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I am a parent/guardian and consent to my child using this app. I
              understand that no personal data is collected from children, and all
              content is age-appropriate (ages 3-7). No ads or tracking.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !coppaConsented && styles.buttonDisabled]}
            onPress={handleGetStarted}
            disabled={!coppaConsented}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  consentSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.foreground,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
