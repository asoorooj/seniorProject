import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
// import { registerUser } from '@/services/apiService'; // uncomment when backend is running
// TODO (auth team): import saveAuth from '@/services/auth' and call saveAuth(data.token, data.user.id, data.user.email) after successful registration to persist the auth token
import { switchUserAndSync } from '@/services/sync/syncController';
import { setCurrentUserId } from '@/services/db';

export default function RegisterScreen() {
  const router = useRouter();
  const { agreed: agreedParam } = useLocalSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (agreedParam === 'true') {
      setAgreed(true);
      setShowTermsError(false);
    }
  }, [agreedParam]);

  async function handleCreateAccount() {
    setError('');
    if (!agreed) {
      setShowTermsError(true);
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      // TEMP: mock response for testing without backend — remove when backend is running
      const data = { token: 'mock-token', user: { id: 1, email: email.trim().toLowerCase() } };
      // const data = await registerUser({ email: email.trim().toLowerCase(), password, name: fullName.trim() || undefined });
      // TODO (auth team): call saveAuth(data.token, data.user.id, data.user.email) here to persist the session
      setCurrentUserId(data.user.id);
      router.push('/onboarding');
      switchUserAndSync(data.user.id).catch(() => {});
    } catch (err: any) {
      setError(err.message ?? 'Registration failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#2A1F50', '#1E1830']}
          start={{ x: 0.15, y: 0.2 }}
          end={{ x: 0.85, y: 0.8 }}
          style={styles.topCard}
        >
          <View style={styles.topCardInner}>
            <Text style={styles.topCardTitle}>Create Account</Text>
            <Text style={styles.topCardSubtitle}>
              Start your emotional wellness journey
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formSection}>
          <View style={styles.formInner}>
            <Text style={styles.label}>Full name</Text>
            <View style={styles.inputBox}>
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

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputBox}>
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

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputBox}>
              <Feather name="lock" size={18} color="#1E1830" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                placeholder="Enter your password"
                placeholderTextColor="#6D6680"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#6D6680" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={[
              styles.inputBox,
              passwordsMatch && styles.inputBoxValid,
              passwordsMismatch && styles.inputBoxInvalid,
            ]}>
              <Feather name="lock" size={18} color="#1E1830" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                placeholder="Confirm your password"
                placeholderTextColor="#6D6680"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} activeOpacity={0.7}>
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#6D6680" />
              </TouchableOpacity>
            </View>
            {passwordsMismatch && (
              <Text style={styles.matchError}>Passwords do not match</Text>
            )}
            {passwordsMatch && (
              <Text style={styles.matchSuccess}>Passwords match</Text>
            )}

            <View style={styles.termsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const nextValue = !agreed;
                  setAgreed(nextValue);
                  if (nextValue) {
                    setShowTermsError(false);
                  }
                }}
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

            {showTermsError && (
              <Text style={styles.termsError}>
                Please agree to the Terms & Conditions before creating an account.
              </Text>
            )}

            <TouchableOpacity
              style={styles.createAccountButton}
              activeOpacity={0.8}
              onPress={handleCreateAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createAccountButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },

  topCard: {
    width: '100%',
    minHeight: 235,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  topCardInner: {
    width: '100%',
    maxWidth: 760,
    alignItems: 'center',
  },

  topCardTitle: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    textAlign: 'center',
    color: '#FFFFFF',
    marginTop: 10,
  },

  topCardSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    color: '#FFFFFF',
    marginTop: 22,
  },

  formSection: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },

  formInner: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },

  label: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 19,
    color: '#1E1830',
    marginBottom: 10,
  },

  inputBox: {
    width: '100%',
    height: 54,
    borderRadius: 10,
    backgroundColor: '#F8F5FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    flexWrap: 'wrap',
    marginTop: -6,
    marginBottom: 20,
  },

  termsText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1E1830',
    marginLeft: 8,
  },

  termsLink: {
    color: '#F27059',
    fontSize: 14,
    fontWeight: '400',
  },

  termsError: {
    fontSize: 14,
    color: '#F27059',
    marginBottom: 20,
  },

  createAccountButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#F27059',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },

  createAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  loginRow: {
    alignItems: 'center',
    marginBottom: 12,
  },

  loginText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: '#1E1830',
    textAlign: 'center',
  },

  loginLink: {
    color: '#F27059',
    fontWeight: '400',
  },

  errorText: {
    fontSize: 14,
    color: '#F27059',
    marginTop: 8,
    textAlign: 'center',
  },

  inputBoxValid: {
    borderWidth: 1.5,
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },

  inputBoxInvalid: {
    borderWidth: 1.5,
    borderColor: '#F27059',
    backgroundColor: '#FFF5F3',
  },

  matchError: {
    fontSize: 13,
    color: '#F27059',
    marginTop: -18,
    marginBottom: 16,
    marginLeft: 4,
  },

  matchSuccess: {
    fontSize: 13,
    color: '#22C55E',
    marginTop: -18,
    marginBottom: 16,
    marginLeft: 4,
  },
});