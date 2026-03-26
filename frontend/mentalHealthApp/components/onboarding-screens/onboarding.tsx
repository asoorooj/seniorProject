import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isWide = width >= 900;
  const isTablet = width >= 700;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentWrapper, isWide && styles.contentWrapperWide]}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={[styles.logo, isTablet && styles.logoTablet]}
            resizeMode="contain"
          />

          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            Understand Yourself Better
          </Text>

          <Text style={[styles.description, isTablet && styles.descriptionTablet]}>
            We use advanced AI to analyze your voice, facial expressions, and words
            to help you understand and enhance your emotional well-being.
          </Text>

          <View style={[styles.features, isWide && styles.featuresWide]}>
            <View style={styles.featureRow}>
              <Image
                source={require('../../assets/images/fi-rs-microphone.png')}
                style={styles.icon}
              />
              <Text style={styles.featureText}>
                Voice: For tone of voice understanding
              </Text>
            </View>

            <View style={styles.featureRow}>
              <Image
                source={require('../../assets/images/fi-rs-camera.png')}
                style={styles.icon}
              />
              <Text style={styles.featureText}>
                Facial: For expression analysis
              </Text>
            </View>

            <View style={styles.featureRow}>
              <Image
                source={require('../../assets/images/fi-rs-comment.png')}
                style={styles.icon}
              />
              <Text style={styles.featureText}>
                Words: For journaling and text inputs
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, isWide && styles.continueButtonWide]}
            activeOpacity={0.8}
            onPress={() => router.push('/survey')}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.privacyRow}>
            <Image
              source={require('../../assets/images/fi-rs-shield-check.png')}
              style={styles.icon}
            />
            <Text style={styles.privacyText}>
              Your privacy is deeply respected
            </Text>
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
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },

  scrollContentWide: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  contentWrapper: {
    width: '100%',
    alignItems: 'center',
  },

  contentWrapperWide: {
    maxWidth: 860,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 28,
    paddingHorizontal: 36,
    paddingVertical: 40,
  },

  logo: {
    width: 141,
    height: 176,
    marginBottom: 28,
  },

  logoTablet: {
    marginBottom: 32,
  },

  title: {
    width: '100%',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    textAlign: 'center',
    color: '#1E1830',
    marginBottom: 40,
  },

  titleTablet: {
    fontSize: 24,
    lineHeight: 32,
  },

  description: {
    width: '100%',
    maxWidth: 720,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 28,
    color: '#1E1830',
    opacity: 0.85,
    marginBottom: 40,
  },

  descriptionTablet: {
    maxWidth: 720,
  },

  features: {
    width: '100%',
    marginBottom: 40,
  },

  featuresWide: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  featureRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  featureText: {
    marginLeft: 14,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: '#1E1830',
    flex: 1,
  },

  continueButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#F27059',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F22705',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 24,
  },

  continueButtonWide: {
    maxWidth: 720,
  },

  continueButtonText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
    color: '#FFFFFF',
  },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 500,
  },

  privacyText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: '#1E1830',
    textAlign: 'center',
    flexShrink: 1,
  },
});