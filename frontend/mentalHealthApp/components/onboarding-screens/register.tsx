import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
// import { registerUser } from '@/services/apiService'; // uncomment when backend is running
// TODO (auth team): import saveAuth from '@/services/auth' and call saveAuth(data.token, data.user.id, data.user.email) after successful registration to persist the auth token
import { getUser, registerUser, saveUser } from '../../services/apiService';
import { colors } from '@/assets/styles/colors';
import { useAuth } from '../../hooks/useAuth';
  

export default function RegisterScreen() { 
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const { user, setUser } = useAuth();

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (agreedParam === 'true') {
      setAgreed(true);
      setShowTermsError(false);
    }
  }, [agreedParam]);

  async function handleCreateAccount() {
    if (!agreed) {
      setShowTermsError(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await registerUser(email, password);

      console.log("REGISTER RESPONSE:", res);

      if (res.access_token) {
        await saveUser(res);
        setUser(await getUser());
        console.log("Registered successfully");
        router.replace("/(tabs)");
        return;
      }

      setError(res?.error ?? 'Could not create account');
      console.warn(res);
    } catch (err) {
      console.log("REGISTER ERROR:", err);
      setError('Something went wrong while creating your account');
    } finally {
      setLoading(false);
    }
  }

  

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['#2A1F50', '#1E1830']}
            start={{ x: 0.15, y: 0.2 }}
            end={{ x: 0.85, y: 0.8 }}
            style={[styles.topCard, { paddingTop: insets.top + 20 }]}
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
                  color={colors.textPrimary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputText}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputBox}>
                <Feather
                  name="mail"
                  size={18}
                  color={colors.textPrimary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputText}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputBox}>
                <Feather name="lock" size={18} color={colors.textPrimary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputText}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={[
                styles.inputBox,
                passwordsMatch && styles.inputBoxValid,
                passwordsMismatch && styles.inputBoxInvalid,
              ]}>
                <Feather name="lock" size={18} color={colors.textPrimary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputText}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} activeOpacity={0.7}>
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
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
                    setError('');
                  }}
                >
                  <Feather
                    name={agreed ? 'check-square' : 'square'}
                    size={20}
                    color={colors.textPrimary}
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
              >
                {loading ? (
                  <ActivityIndicator color={colors.surface} />
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },

  topCard: {
    width: '100%',
    minHeight: 235,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
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
    color: colors.surface,
    marginTop: 10,
    letterSpacing: -0.4,
  },

  topCardSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    color: colors.surface,
    marginTop: 22,
  },

  formSection: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },

  formInner: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  label: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 19,
    color: colors.textPrimary,
    marginBottom: 10,
  },

  inputBox: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: colors.textPrimary,
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
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    marginLeft: 8,
  },

  termsLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  termsError: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 20,
  },

  createAccountButton: {
    width: '100%',
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 12,
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
    color: colors.surface,
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
    color: colors.textPrimary,
    textAlign: 'center',
  },

  loginLink: {
    color: colors.primary,
    fontWeight: '700',
  },

  errorText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
    textAlign: 'center',
  },

  inputBoxValid: {
    borderWidth: 1.5,
    borderColor: colors.semantic,
    backgroundColor: colors.semanticLight,
  },

  inputBoxInvalid: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFF5F3',
  },

  matchError: {
    fontSize: 13,
    color: colors.primary,
    marginTop: -18,
    marginBottom: 16,
    marginLeft: 4,
  },

  matchSuccess: {
    fontSize: 13,
    color: colors.semantic,
    marginTop: -18,
    marginBottom: 16,
    marginLeft: 4,
  },
});
