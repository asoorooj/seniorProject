import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const { agreed: agreedParam } = useLocalSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (agreedParam === 'true') {
      setAgreed(true);
    }
  }, [agreedParam]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#2A1F50', '#1E1830']}
          start={{ x: 0.15, y: 0.2 }}
          end={{ x: 0.85, y: 0.8 }}
          style={styles.topCard}
        >
          <Text style={styles.topCardTitle}>Create Account</Text>
          <Text style={styles.topCardSubtitle}>
            Start your emotional wellness journey
          </Text>
        </LinearGradient>

        <View style={styles.formArea}>
          <Text style={styles.labelFullName}>Full name</Text>
          <View style={styles.inputBoxFullName}>
            <Feather
              name="user"
              size={18}
              color="#1E1830"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputText}
              placeholder="Enter your full name"
              placeholderTextColor="#6D6680"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <Text style={styles.labelEmail}>Email</Text>
          <View style={styles.inputBoxEmail}>
            <Feather
              name="mail"
              size={18}
              color="#1E1830"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputText}
              placeholder="Enter your email"
              placeholderTextColor="#6D6680"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.labelPassword}>Password</Text>
          <View style={styles.inputBoxPassword}>
            <Feather
              name="lock"
              size={18}
              color="#1E1830"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputText}
              placeholder="Enter your password"
              placeholderTextColor="#6D6680"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Text style={styles.labelConfirmPassword}>Confirm Password</Text>
          <View style={styles.inputBoxConfirmPassword}>
            <Feather
              name="lock"
              size={18}
              color="#1E1830"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputText}
              placeholder="Confirm your password"
              placeholderTextColor="#6D6680"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.termsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAgreed(!agreed)}
            >
              <Feather
                name={agreed ? 'check-square' : 'square'}
                size={20}
                color="#1E1830"
              />
            </TouchableOpacity>

            <Text style={styles.termsText}>I agree to </Text>

            <TouchableOpacity
              onPress={() => router.push('/terms')}
              activeOpacity={0.8}
            >
              <Text style={styles.termsLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.createAccountButton}
            activeOpacity={0.8}
            onPress={() => {
              if (!agreed) {
                Alert.alert(
                  'Terms Required',
                  'Please agree to the Terms & Conditions before creating an account.'
                );
                return;
              }

              router.push('/onboarding');

            }}
          >
            <Text style={styles.createAccountButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginRow}
            activeOpacity={0.8}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  topCard: {
    width: '100%',
    height: 235,
    marginTop: -30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  topCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
    color: '#FFFFFF',
    marginTop: 10,
  },

  topCardSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
    color: '#FFFFFF',
    marginTop: 22,
  },

  formArea: {
    paddingTop: 36,
    paddingHorizontal: 36,
  },

  labelFullName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 19,
    color: '#1E1830',
    marginBottom: 10,
  },

  inputBoxFullName: {
    width: '100%',
    maxWidth: 323,
    alignSelf: 'center',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F8F5FF',
    shadowColor: '#F8F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 28,
  },

  labelEmail: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 19,
    color: '#1E1830',
    marginBottom: 10,
  },

  inputBoxEmail: {
    width: '100%',
    maxWidth: 323,
    alignSelf: 'center',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F8F5FF',
    shadowColor: '#F8F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 28,
  },

  labelPassword: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 19,
    color: '#1E1830',
    marginBottom: 10,
  },

  inputBoxPassword: {
    width: '100%',
    maxWidth: 323,
    alignSelf: 'center',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F8F5FF',
    shadowColor: '#F8F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 28,
  },

  labelConfirmPassword: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 19,
    color: '#1E1830',
    marginBottom: 10,
  },

  inputBoxConfirmPassword: {
    width: '100%',
    maxWidth: 323,
    alignSelf: 'center',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F8F5FF',
    shadowColor: '#F8F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
  },

  inputIcon: {
    marginRight: 10,
  },

  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#1E1830',
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  termsText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1E1830',
    marginLeft: 8,
  },

  termsLink: {
    color: '#F27059',
    fontSize: 14,
    fontWeight: '400',
  },

  createAccountButton: {
    width: '100%',
    maxWidth: 323,
    alignSelf: 'center',
    height: 46,
    backgroundColor: '#F27059',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  createAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  loginRow: {
    alignItems: 'center',
  },

  loginText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: '#1E1830',
  },

  loginLink: {
    color: '#F27059',
    fontWeight: '700',
  },
});