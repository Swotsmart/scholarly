import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '@/lib/constants';

const { width } = Dimensions.get('window');

interface SlideProps {
  slide: {
    title: string;
    description: string;
    emoji: string;
    color: string;
  };
}

export function OnboardingSlide({ slide }: SlideProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.emojiContainer, { backgroundColor: slide.color + '30' }]}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.description}>{slide.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.foreground,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    lineHeight: 24,
    color: '#666',
    textAlign: 'center',
  },
});
