import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebViewShell } from '@/components/WebViewShell';
import { WEBVIEW_URLS } from '@/lib/constants';

export default function LearnScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebViewShell url={WEBVIEW_URLS.earlyYears} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
