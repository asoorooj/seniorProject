import React from 'react';
import {
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/assets/styles/colors';

const WelcomeScreen = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isWide = width >= 900;
  const isCompactHeight = height < 760;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isCompactHeight && styles.contentCompact,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topGroup, isWide && styles.topGroupWide]}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={[styles.logo, isCompactHeight && styles.logoCompact]}
            resizeMode="contain"
          />

          <Text style={styles.brandName}>kokoro</Text>

          <Text style={styles.tagline}>
            The safe, supportive, and effective way to track your emotional
            well-being!
          </Text>
        </View>

        <View style={[styles.buttonGroup, isWide && styles.buttonGroupWide]}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={() => router.navigate('/register')}
          >
            <Text style={styles.primaryButtonText}>GET STARTED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => router.navigate('/login')}
          >
            <Text style={styles.secondaryButtonText}>
              I ALREADY HAVE AN ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
    justifyContent: 'space-between',
    minHeight: '100%',
  },

  contentCompact: {
    justifyContent: 'flex-start',
    gap: 28,
  },

  topGroup: {
    width: '100%',
    alignItems: 'center',
  },

  topGroupWide: {
    maxWidth: 760,
  },

  logo: {
    width: 141,
    height: 233,
    marginBottom: -20,
  },
  logoCompact: {
    width: 124,
    height: 200,
  },

  brandName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },

  tagline: {
    width: '100%',
    fontWeight: '500',
    maxWidth: 520,
    fontSize: 16,
    color: colors.accentDark,
    textAlign: 'center',
    lineHeight: 24,
  },

  buttonGroup: {
    width: '100%',
  },

  buttonGroupWide: {
    maxWidth: 520,
  },

  primaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },

  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },

  secondaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.timelineLine,
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default WelcomeScreen;
