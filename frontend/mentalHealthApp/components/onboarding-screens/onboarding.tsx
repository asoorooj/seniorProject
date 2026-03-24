import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Understand Yourself Better</Text>

      <Text style={styles.description}>
        We use advanced AI to analyze your voice, facial expressions, and words
        to help you understand and enhance your emotional well-being.
      </Text>

      <View style={[styles.featureRow, styles.voiceRow]}>
        <Image
          source={require('../../assets/images/fi-rs-microphone.png')}
          style={styles.icon}
        />
        <Text style={styles.featureText}>
          Voice: For tone of voice understanding
        </Text>
      </View>

      <View style={[styles.featureRow, styles.facialRow]}>
        <Image
          source={require('../../assets/images/fi-rs-camera.png')}
          style={styles.icon}
        />
        <Text style={styles.featureText}>
          Facial: For expression analysis
        </Text>
      </View>

      <View style={[styles.featureRow, styles.wordsRow]}>
        <Image
          source={require('../../assets/images/fi-rs-comment.png')}
          style={styles.icon}
        />
        <Text style={styles.featureText}>
          Words: For journaling and text inputs
        </Text>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5FF',
    alignItems: 'center',
  },

  logo: {
    position: 'absolute',
    width: 141,
    height: 106,
    top: 118,
    left: 124,
  },

  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  title: {
    position: 'absolute',
    width: 310,
    top: 292,
    left: 40,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 29,
    textAlign: 'center',
    color: '#1E1830',
  },

  description: {
    position: 'absolute',
    width: 320,
    top: 348,
    left: 35,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
    color: '#1E1830',
  },

  featureRow: {
    position: 'absolute',
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    left: 54,
  },

  voiceRow: {
    top: 474,
  },

  facialRow: {
    top: 533,
  },

  wordsRow: {
    top: 570,
  },

  featureText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 22,
    color: '#1E1830',
    flexShrink: 1,
  },

  continueButton: {
    position: 'absolute',
    width: 323,
    height: 46,
    top: 634,
    left: 34,
    backgroundColor: '#F27059',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F22705',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },

  continueButtonText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
    color: '#FFFFFF',
  },

  privacyRow: {
    position: 'absolute',
    top: 711,
    left: 54,
    width: 282,
    flexDirection: 'row',
    alignItems: 'center',
  },

  privacyText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
    color: '#1E1830',
    textAlign: 'center',
  },
});