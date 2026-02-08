import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '@/lib/constants';

interface ParentalGateProps {
  onPass: () => void;
  onFail: () => void;
}

function generateProblem(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 40) + 10;
  const b = Math.floor(Math.random() * 40) + 10;
  return { question: `${a} + ${b}`, answer: a + b };
}

const TIMEOUT_SECONDS = 30;

export function ParentalGate({ onPass, onFail }: ParentalGateProps) {
  const [problem] = useState(generateProblem);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          onFail();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFail]);

  const handleSubmit = useCallback(() => {
    const parsed = parseInt(input, 10);
    if (isNaN(parsed)) {
      setError('Please enter a number');
      return;
    }

    if (parsed === problem.answer) {
      onPass();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setInput('');
      if (newAttempts >= 3) {
        onFail();
      } else {
        setError(`Incorrect. ${3 - newAttempts} attempts remaining.`);
      }
    }
  }, [input, problem.answer, attempts, onPass, onFail]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Parent Verification</Text>
        <Text style={styles.subtitle}>
          Please solve this math problem to continue. This ensures only parents
          can access this section.
        </Text>

        <View style={styles.problemContainer}>
          <Text style={styles.problemText}>{problem.question} = ?</Text>
        </View>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setError('');
          }}
          keyboardType="number-pad"
          placeholder="Enter your answer"
          placeholderTextColor="#999"
          maxLength={5}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Verify</Text>
        </TouchableOpacity>

        <Text style={styles.timer}>
          Time remaining: {timeLeft}s
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#888',
    textAlign: 'center',
  },
  problemContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  problemText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    textAlign: 'center',
    color: COLORS.foreground,
    fontWeight: '600',
  },
  error: {
    fontSize: 14,
    color: COLORS.destructive,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  timer: {
    fontSize: 13,
    color: '#999',
  },
});
