import React from 'react';
import { 
  StyleSheet, 
  Text, 
  Image, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';

const WelcomeScreen = () => {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container}>
      <Image 
        source={require('../../assets/images/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.brandName}>kokoro</Text>

      <Text style={styles.tagline}>
        The safe, supportive, and effective way to track your emotional well-being!
      </Text>

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
        <Text style={styles.secondaryButtonText}>I ALREADY HAVE AN ACCOUNT</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

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
    top: 233,
    left: 125,
  },
  brandName: {
    position: 'absolute',
    width: 118,
    height: 50,
    top: 363,
    left: 136,
    fontSize: 32,
    fontWeight: '800',
    color: '#2D2366', 
    textAlign: 'center',
  },
  tagline: {
    position: 'absolute',
    width: 323,
    top: 455,
    left: 34,
    fontSize: 16,
    color: '#9A8ED9',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    position: 'absolute',
    width: 323,
    height: 46,
    top: 666,
    left: 34,
    backgroundColor: '#F27059',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryButton: {
  position: 'absolute',
  width: 323,
  height: 46,
  top: 741,
  left: 34,
  backgroundColor: 'transparent',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#EAE5F5',
  justifyContent: 'center',
  alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F27059',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WelcomeScreen;