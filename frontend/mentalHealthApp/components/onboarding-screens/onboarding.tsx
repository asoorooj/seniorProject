import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { updateUserConsent, updateUserInterests } from '@/services/apiService';
import { setNeedsOnboarding } from '@/services/auth';
import { colors } from '@/assets/styles/colors';
import { sectionLabel } from '@/assets/styles/text';
import InterestsStep, {
  buildChipState,
  getLikes,
  getDislikes,
} from './InterestsStep';
import type { InterestState } from './InterestsStep';
import { useAuth } from '@/hooks/useAuth';

type ConsentKey = 'consentImage' | 'consentAudio' | 'consentChat';

const CONSENT_ITEMS: { key: ConsentKey; icon: React.ComponentProps<typeof Feather>['name']; label: string; description: string }[] = [
  { key: 'consentImage', icon: 'camera',         label: 'Face Analysis',  description: 'Analyze facial expressions to detect emotional cues.' },
  { key: 'consentAudio', icon: 'mic',            label: 'Voice Analysis', description: 'Analyze voice recordings to identify emotional patterns.' },
  { key: 'consentChat',  icon: 'message-circle', label: 'Word Analysis',  description: 'For journaling and text inputs.' },
];

const SCAN_ARROW_COLOR = '#7B6FD8';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide   = width >= 900;
  const isTablet = width >= 700;
  const { user: authUser, setUser: setAuthUser } = useAuth();

  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState({ consentImage: false, consentAudio: false, consentChat: false });
  const [chipState, setChipState] = useState<Record<string, InterestState>>(
    buildChipState(authUser?.likes ?? [], authUser?.dislikes ?? [])
  );
  const [loading, setLoading] = useState(false);

  function toggle(key: ConsentKey) {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleConsentContinue() {
    setLoading(true);
    try {
      await updateUserConsent({
        stor_cons_image: consent.consentImage,
        stor_cons_audio: consent.consentAudio,
        stor_cons_text:  consent.consentChat,
      });
      if (authUser) {
        setAuthUser({
          ...authUser,
          storage_consent: {
            ...authUser.storage_consent,
            stor_cons_image: consent.consentImage,
            stor_cons_audio: consent.consentAudio,
            stor_cons_text: consent.consentChat,
          },
        });
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
    setStep(1);
  }

  async function handleFinish() {
    setLoading(true);
    const likes    = getLikes(chipState);
    const dislikes = getDislikes(chipState);
    try {
      await updateUserInterests({ likes, dislikes });
      if (authUser) {
        setAuthUser({
          ...authUser,
          likes,
          dislikes,
          storage_consent: {
            ...authUser.storage_consent,
            stor_cons_image: consent.consentImage,
            stor_cons_audio: consent.consentAudio,
            stor_cons_text: consent.consentChat,
          },
        });
      }
    } catch {
      // non-blocking
    }
    await setNeedsOnboarding(false);
    setLoading(false);
    router.replace('/survey');
  }

  async function handleSkip() {
    await setNeedsOnboarding(false);
    router.replace('/survey');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {step === 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWrapper, isWide && styles.contentWrapperWide]}>
            <TouchableOpacity
              style={[styles.headerBackButton, { top: -48, left: 4 + insets.left }]}
              onPress={() => router.replace('/register?agreed=true')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="arrow-left" size={22} color={SCAN_ARROW_COLOR} />
            </TouchableOpacity>

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

            <Text style={styles.consentLabel}>Choose what kokoro can access</Text>
            <View style={[styles.consentCard, isWide && styles.consentCardWide]}>
              {CONSENT_ITEMS.map((item, index) => (
                <React.Fragment key={item.key}>
                  <TouchableOpacity
                    style={styles.consentRow}
                    activeOpacity={0.75}
                    onPress={() => toggle(item.key)}
                  >
                    <Feather
                      name={consent[item.key] ? 'check-square' : 'square'}
                      size={22}
                      color={consent[item.key] ? colors.primary : colors.accentDark}
                      style={styles.checkIcon}
                    />
                    <View style={styles.consentIconBox}>
                      <Feather name={item.icon} size={18} color={colors.textPrimary} />
                    </View>
                    <View style={styles.consentText}>
                      <Text style={styles.consentItemLabel}>{item.label}</Text>
                      <Text style={styles.consentItemDesc}>{item.description}</Text>
                    </View>
                  </TouchableOpacity>
                  {index < CONSENT_ITEMS.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>

            <Text style={styles.consentNote}>You can update these any time from your profile.</Text>

            <TouchableOpacity
              style={[styles.continueButton, isWide && styles.continueButtonWide]}
              activeOpacity={0.8}
              onPress={handleConsentContinue}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.surface} />
                : <Text style={styles.continueButtonText}>Continue</Text>
              }
            </TouchableOpacity>

            <View style={styles.privacyRow}>
              <Image
                source={require('../../assets/images/fi-rs-shield-check.png')}
                style={styles.icon}
              />
              <Text style={styles.privacyText}>Your privacy is deeply respected</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.interestsWrapper, isWide && styles.interestsWrapperWide]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(0)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="arrow-left" size={22} color={SCAN_ARROW_COLOR} />
          </TouchableOpacity>

          <Text style={[styles.title, styles.interestsTitle]}>What works for you?</Text>
          <Text style={styles.interestsSubtitle}>
            Select activities you enjoy or want to avoid — we&apos;ll personalise your experience.
          </Text>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotDone]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>

          <InterestsStep chipState={chipState} onChange={setChipState} />

          <View style={styles.interestsActions}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishButton}
              activeOpacity={0.8}
              onPress={handleFinish}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.surface} />
                : <Text style={styles.continueButtonText}>Finish</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { flex: 1, backgroundColor: colors.background },

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

  contentWrapper:     { width: '100%', alignItems: 'center' },
  contentWrapperWide: {
    maxWidth: 860,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 28,
    paddingHorizontal: 36,
    paddingVertical: 40,
  },
  headerBackButton: {
    position: 'absolute',
    zIndex: 1,
  },

  logo:       { width: 141, height: 176, marginBottom: 28 },
  logoTablet: { marginBottom: 32 },

  title: {
    width: '100%',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: 40,
    letterSpacing: -0.4,
  },
  titleTablet: { fontSize: 28, lineHeight: 34 },

  description: {
    width: '100%',
    maxWidth: 720,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 28,
    color: colors.textPrimary,
    opacity: 0.85,
    marginBottom: 28,
  },
  descriptionTablet: { maxWidth: 720 },

  consentLabel: {
    ...sectionLabel,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  consentCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 10,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  consentCardWide: { maxWidth: 720 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  checkIcon:      { marginTop: 2, marginRight: 10 },
  consentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  consentText:      { flex: 1 },
  consentItemLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  consentItemDesc:  { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  divider:          { height: 1, backgroundColor: colors.accentLight, marginHorizontal: 16 },

  consentNote: {
    fontSize: 12,
    color: colors.accentDark,
    alignSelf: 'center',
    marginBottom: 28,
  },

  continueButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
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
  continueButtonWide: { maxWidth: 720 },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
    color: colors.surface,
  },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 500,
  },
  icon: { width: 24, height: 24, resizeMode: 'contain' },
  privacyText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },

  // Step 2 — interests
  interestsWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  interestsWrapperWide: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 860,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  interestsTitle: {
    marginBottom: 8,
  },
  interestsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },

  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  stepDotDone: {
    backgroundColor: colors.accent,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  interestsActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  skipButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  finishButton: {
    flex: 2,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F22705',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
});
