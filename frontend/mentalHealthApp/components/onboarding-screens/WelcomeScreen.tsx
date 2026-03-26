import React from 'react';
import {
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const WelcomeScreen = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isWide = width >= 900;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.topGroup, isWide && styles.topGroupWide]}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
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
            onPress={() => router.push('/register')}
          >
            <Text style={styles.primaryButtonText}>GET STARTED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.secondaryButtonText}>
              I ALREADY HAVE AN ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5FF',
  },

  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 40,
    justifyContent: 'space-between',
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

  brandName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2D2366',
    textAlign: 'center',
    marginBottom: 20,
  },

  tagline: {
    width: '100%',
    fontWeight:'600',
    maxWidth: 520,
    fontSize: 18,
    color: '#9A8ED9',
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
    backgroundColor: '#F27059',
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
    color: '#FFFFFF',
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
    borderColor: '#EAE5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#F27059',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default WelcomeScreen;