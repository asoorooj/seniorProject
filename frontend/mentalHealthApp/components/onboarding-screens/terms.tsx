import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();
  const [hasReachedBottom, setHasReachedBottom] = useState(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 24;

    const reachedBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (reachedBottom && !hasReachedBottom) {
      setHasReachedBottom(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerInner}>
            <Text style={styles.title}>Terms & Conditions</Text>
            <Text style={styles.subtitle}>
              Please read these terms and conditions carefully before using kokoro.
            </Text>
          </View>
        </View>

        <View style={styles.bodySection}>
          <View style={styles.bodyInner}>
            <View style={styles.contentCard}>
              <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.sectionText}>
                By creating an account and using this application, you certify to
                have read and reviewed this Agreement and that you agree to comply
                with and be bound by these terms. If you don’t agree, this
                application is intended to support emotional awareness and personal
                well-being.
              </Text>

              <Text style={styles.sectionTitle}>2. Privacy Policy</Text>
              <Text style={styles.sectionText}>
                We are committed to protecting your privacy and emotional data. Our
                app uses AI to analyze voice tone, facial expressions, and written
                text to provide emotional insights. We do not sell your data or
                share it with third parties for advertising purposes. You may
                request deletion of your account and associated data at any time.
              </Text>

              <Text style={styles.sectionTitle}>3. Data Collection & Use</Text>
              <Text style={styles.sectionText}>
                We collect the following types of information only when you choose
                to use the related features. For voice data, we analyze tone,
                pitch, and vocal patterns for emotional cues. For facial data, we
                detect expressions during active scans. For text data, we analyze
                emotional patterns within journal entries and chats.
              </Text>

              <Text style={styles.sectionTitle}>4. Importance Notice</Text>
              <Text style={styles.sectionText}>
                This app provides AI-generated emotional insights. It is not a
                diagnostic tool and should not be used in place of professional
                mental health care.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                !hasReachedBottom && styles.acceptButtonDisabled,
              ]}
              activeOpacity={hasReachedBottom ? 0.8 : 1}
              disabled={!hasReachedBottom}
              onPress={() => router.replace('/register?agreed=true')}
            >
              <Text style={styles.acceptButtonText}>Accept & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5FF',
  },

  scroll: {
    flex: 1,
    backgroundColor: '#F8F5FF',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#F8F5FF',
  },

  headerSection: {
    width: '100%',
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
  },

  headerInner: {
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
  },

  title: {
    width: '100%',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
    textAlign: 'center',
    color: '#1E1830',
    marginBottom: 18,
  },

  subtitle: {
    width: '100%',
    maxWidth: 520,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    color: '#1E1830',
  },

  bodySection: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },

  bodyInner: {
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
  },

  contentCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 24,
    paddingHorizontal: 24,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    color: '#1E1830',
    marginBottom: 10,
    marginTop: 8,
  },

  sectionText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 28,
    color: '#1E1830',
    marginBottom: 22,
  },

  acceptButton: {
    width: '100%',
    height: 50,
    borderRadius: 999,
    backgroundColor: '#F27059',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  acceptButtonDisabled: {
    opacity: 0.5,
  },

  acceptButtonText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'center',
    color: '#FFFFFF',
  },
});