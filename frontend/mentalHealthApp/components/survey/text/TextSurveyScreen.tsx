import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  analyzeTextEntry,
  cancelEvaluation,
  type UserPreferences,
} from '@/services/apiService';
import { DEFAULT_EVALUATION_PREFERENCES } from '@/services/evaluationFlow';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG           = '#1E1830';
const TEAL         = '#2D9C8A';
const TEAL_DARK    = '#1C2E2C';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED   = '#8B87A8';
const TAB_ACTIVE   = '#1A2E2C';
const CARD_BG      = '#252245';
const TRACK_COLOR  = '#3D3870';
const INPUT_BG     = '#1C2A28';

const MIN_WORDS    = 10;
const MAX_WORDS    = 100;

// ─── Prompt pool — 3 random ones are picked per session ───────────────────────
const PROMPT_POOL = [
  '"What\'s been on your mind lately?"',
  '"Describe your day in a few sentences."',
  '"How have you been feeling this week?"',
  '"What\'s something that\'s been bothering you?"',
  '"What made you smile recently?"',
  '"How would you describe your mood right now?"',
  '"What\'s been weighing on you lately?"',
  '"Describe how your body feels at this moment."',
];

function pickPrompts(): string[] {
  const shuffled = [...PROMPT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ─── Types ────────────────────────────────────────────────────────────────────
type TextStep = 'prompt-select' | 'writing' | 'analyzing' | 'result';

type EmotionResult = {
  label: string;
  scores: Record<string, number>;
};

const AFFIRMATIONS = [
  'Your words matter...',
  "We're listening carefully...",
  'Taking it all in...',
  'Almost there...',
];

// ─── API calls ────────────────────────────────────────────────────────────────
// ─── FadeInView ───────────────────────────────────────────────────────────────
function FadeInView({ children, style }: { children: React.ReactNode; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[{ flex: 1 }, { opacity }, style]}>{children}</Animated.View>;
}

// ─── Shared: Header ───────────────────────────────────────────────────────────
function SurveyHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Feather name="arrow-left" size={22} color={TEAL} />
      </TouchableOpacity>
      <Text style={styles.stepLabel}>Step 3 of 3</Text>
      <View style={{ width: 22 }} />
    </View>
  );
}

// ─── Shared: Tab pills ────────────────────────────────────────────────────────
function StepTabs() {
  return (
    <View style={styles.tabRow}>
      {(['Face', 'Voice', 'Text'] as const).map((label, i) => (
        <View key={label} style={[styles.tab, i === 2 && styles.tabActive]}>
          <Text style={[styles.tabText, i === 2 && styles.tabTextActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen 1: Prompt selection ───────────────────────────────────────────────
function PromptSelectScreen({
  prompts,
  onSelect,
  onSkip,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
  onSkip: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (p: string) => {
    setSelected(p);
    setTimeout(() => onSelect(p), 180);
  };

  return (
    <FadeInView>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, display:'flex', justifyContent:'center', alignItems:'center'}}
      >
        <View style={styles.textZone}>
          <Text style={styles.title}>{"Let's Read Your Words"}</Text>
          <Text style={styles.subtitle}>
            {"Write a few sentences. We'll look at the\nfeeling behind them."}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>CHOOSE A PROMPT</Text>

        {prompts.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.promptCard, selected === p && styles.promptCardSelected]}
            onPress={() => handleSelect(p)}
            activeOpacity={0.75}
          >
            <Text style={[styles.promptText, selected === p && styles.promptTextSelected]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.promptCard, styles.promptCardFree, selected === '' && styles.promptCardSelected]}
          onPress={() => handleSelect('')}
          activeOpacity={0.75}
        >
          <Text style={[styles.promptText, styles.promptTextMuted, selected === '' && styles.promptTextSelected]}>
            or just write freely
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={{ marginTop: 14 }}>
          <Text style={styles.rewriteText}>Skip this step</Text>
        </TouchableOpacity>
      </ScrollView>
    </FadeInView>
  );
}

// ─── Screen 2: Writing ────────────────────────────────────────────────────────
function WritingScreen({
  prompt,
  onSubmit,
}: {
  prompt: string;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const ready = wordCount >= MIN_WORDS;

  return (
    <FadeInView>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {prompt !== '' && (
            <View style={styles.selectedPromptCard}>
              <Text style={styles.selectedPromptLabel}>YOUR PROMPT</Text>
              <Text style={styles.selectedPromptText}>{prompt}</Text>
            </View>
          )}

          {prompt === '' && (
            <View style={styles.textZone}>
              <Text style={styles.title}>Write Freely</Text>
              <Text style={styles.subtitle}>{"No prompt needed — just let it out."}</Text>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={t => setText(t)}
              placeholder="Start typing..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.inputFooter}>
              <Text style={[styles.hintText, ready && styles.hintTextReady]}>
                {ready ? "Nice! That's plenty to work with!" : `${MIN_WORDS - wordCount} more words to go`}
              </Text>
              <Text style={[styles.charCount, ready && styles.charCountReady]}>
                {wordCount}/{MAX_WORDS} words
              </Text>
            </View>
            <View style={styles.inputTrack}>
              <View style={[styles.inputBar, { width: `${Math.min((wordCount / MIN_WORDS) * 100, 100)}%` }]} />
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.ctaButton, !ready && styles.ctaButtonDisabled]}
          onPress={() => ready && onSubmit(text.trim())}
          activeOpacity={ready ? 0.85 : 1}
        >
          <Text style={styles.ctaButtonText}>Analyze Text</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </FadeInView>
  );
}

const ANALYSIS_DURATION = 3200;

// ─── Screen 3: Analyzing ──────────────────────────────────────────────────────
function AnalyzingScreen({
  text,
  evaluationId,
  onComplete,
}: {
  text: string;
  evaluationId: number | null;
  onComplete: (result: EmotionResult) => void;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const iconScale    = useRef(new Animated.Value(0.8)).current;
  const progress     = useRef(new Animated.Value(0)).current;
  const phraseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: ANALYSIS_DURATION,
      useNativeDriver: false,
    }).start();

    // Cycle through affirmations by cross-fading
    const interval = ANALYSIS_DURATION / AFFIRMATIONS.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    AFFIRMATIONS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => {
        Animated.timing(phraseOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setPhraseIndex(i);
          Animated.timing(phraseOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        });
      }, interval * i));
    });

    if (evaluationId !== null) {
      analyzeTextEntry(text, evaluationId).then(result => {
        setTimeout(() => onComplete(result), ANALYSIS_DURATION);
      });
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <FadeInView>
      <View style={styles.analyzingContent}>
        <Animated.View style={[styles.analyzingIconRing, { transform: [{ scale: iconScale }] }]}>
          <Feather name="file-text" size={32} color={TEAL} />
        </Animated.View>

        <Text style={[styles.title, { marginBottom: 6 }]}>Analyzing</Text>

        <Animated.Text style={[styles.affirmationText, { opacity: phraseOpacity }]}>
          {AFFIRMATIONS[phraseIndex]}
        </Animated.Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: barWidth }]} />
          </View>
        </View>
      </View>
    </FadeInView>
  );
}

// ─── Screen 4: Result ─────────────────────────────────────────────────────────
function ResultScreen({
  result,
  onFinish,
  onRewrite
}: {
  result: EmotionResult | null;
  onFinish: () => void;
  onRewrite: () => void;
}) {
  const checkScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Top 3 emotions sorted by score
  const topEmotions = Object.entries(result?.scores ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([label, score]) => ({ label, pct: Math.round(score * 100) }));

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 160, friction: 8 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <FadeInView>
      <View style={styles.resultContent}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
          <Feather name="check" size={30} color={TEXT_PRIMARY} />
        </Animated.View>

        <Text style={[styles.title, { marginBottom: 6 }]}>Text Analyzed</Text>
        <Text style={[styles.subtitle, { marginBottom: 24 }]}>
          {"Here's what your words suggest:"}
        </Text>

        <Animated.View style={[styles.resultCard, { opacity: cardOpacity }]}>
          <Text style={styles.resultCardLabel}>TOP EMOTIONS</Text>
          {topEmotions.map(({ label, pct }, i) => (
            <View key={label} style={[styles.emotionRow, i < topEmotions.length - 1 && { marginBottom: 14 }]}>
              <Text style={styles.emotionRowLabel}>{label}</Text>
              <View style={styles.emotionBarTrack}>
                <View style={[styles.emotionBarFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.emotionRowPct}>{pct}%</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={styles.resultActions}>
        <TouchableOpacity style={styles.ctaButtonGradient} onPress={onFinish} activeOpacity={0.85}>
          <LinearGradient
            colors={['#CF5B3C', TEAL]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          >
            <Text style={styles.ctaButtonText}>See Full Results</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRewrite} activeOpacity={0.7} style={{ marginTop: 14 }}>
          <Text style={styles.rewriteText}>Re-write</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TextSurveyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    evaluationId?: string;
    faceLabel?: string;
    faceConf?: string;
    faceSkipped?: string;
    audioLabel?: string;
    audioConf?: string;
    audioSkipped?: string;
    prefFace?: string;
    prefAudio?: string;
    prefText?: string;
  }>();
  const evaluationId = params.evaluationId ? Number(params.evaluationId) : null;
  const faceLabel    = params.faceLabel  ?? 'Neutral';
  const faceConf     = params.faceConf   ?? '0';
  const faceSkipped  = params.faceSkipped ?? 'false';
  const audioLabel   = params.audioLabel ?? 'Neutral';
  const audioConf    = params.audioConf  ?? '0';
  const audioSkipped = params.audioSkipped ?? 'false';
  const preferences: UserPreferences = {
    eval_face: params.prefFace ? params.prefFace === 'true' : DEFAULT_EVALUATION_PREFERENCES.eval_face,
    eval_audio: params.prefAudio ? params.prefAudio === 'true' : DEFAULT_EVALUATION_PREFERENCES.eval_audio,
    eval_text: params.prefText ? params.prefText === 'true' : DEFAULT_EVALUATION_PREFERENCES.eval_text,
  };

  const [step,    setStep]    = useState<TextStep>('prompt-select');
  const [prompts] = useState<string[]>(pickPrompts);
  const [prompt,  setPrompt]  = useState('');
  const [text,    setText]    = useState('');
  const [result,  setResult]  = useState<EmotionResult | null>(null);

  useEffect(() => {
    if (!preferences.eval_text) {
      router.replace({
        pathname: '/survey-results' as any,
        params: {
          evaluationId: String(evaluationId),
          faceLabel,
          faceConf,
          faceSkipped,
          audioLabel,
          audioConf,
          audioSkipped,
          textSkipped: 'true',
        },
      });
    }
  }, []);

  const handleBack = () => {
    if (step === 'prompt-select') {
      if (evaluationId !== null) {
        cancelEvaluation(evaluationId).catch(() => {});
      }
      router.back();
    }
    else if (step === 'writing')  setStep('prompt-select');
    else if (step === 'result')   setStep('writing');
    // no back from analyzing — let it complete
  };

  const handlePromptSelect = (p: string) => {
    setPrompt(p);
    setStep('writing');
  };

  const handleSubmit = (submittedText: string) => {
    setText(submittedText);
    setStep('analyzing');
  };

  const handleAnalysisComplete = (res: EmotionResult) => {
    setResult(res);
    setStep('result');
  };

  const handleFinish = () => {
    router.replace({
      pathname: '/survey-results' as any,
      params: {
        evaluationId: String(evaluationId),
        faceLabel,
        faceConf,
        faceSkipped,
        audioLabel,
        audioConf,
        audioSkipped,
        textLabel: result?.label ?? 'Neutral',
        textConf:  String(Math.round(
          (result?.scores ? Math.max(...Object.values(result.scores)) : 0) * 100
        )),
      },
    });
  };

  const handleRewrite = () => {
    setText('');
    setResult(null);
    setStep('prompt-select');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SurveyHeader onBack={handleBack} />
      <StepTabs />

      {step === 'prompt-select' && (
        <PromptSelectScreen prompts={prompts} onSelect={handlePromptSelect}           
          onSkip={() =>
              router.replace({
                pathname: '/survey-results' as any,
                params: {
                  evaluationId: String(evaluationId),
                  faceLabel,
                  faceConf,
                  faceSkipped,
                  audioLabel,
                  audioConf,
                  audioSkipped,
                  textSkipped: 'true',
                },
              })
            }
          />
      )}
      {step === 'writing' && (
        <WritingScreen prompt={prompt} onSubmit={handleSubmit} />
      )}
      {step === 'analyzing' && (
        <AnalyzingScreen
          text={text}
          evaluationId={evaluationId}
          onComplete={handleAnalysisComplete}
        />
      )}
      {step === 'result' && (
        <ResultScreen
          result={result}
          onFinish={handleFinish}
          onRewrite={handleRewrite}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 18,
  },
  stepLabel: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    justifyContent: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3D3870',
  },
  tabActive: {
    backgroundColor: TAB_ACTIVE,
    borderColor: TEAL,
  },
  tabText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },

  // ── Typography
  textZone: {
    paddingTop: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 12,
  },

  // ── Prompt cards
  promptCard: {
    borderWidth: 1,
    borderColor: '#3A3660',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    backgroundColor: '#1E1C38',
  },
  promptCardSelected: {
    borderColor: TEAL,
    backgroundColor: TEAL_DARK,
  },
  promptCardFree: {
    alignItems: 'center',
    backgroundColor: '#252245',
  },
  promptText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 22,
  },
  promptTextMuted: {
    color: TEXT_MUTED,
  },
  promptTextSelected: {
    color: TEXT_PRIMARY,
  },

  // ── Writing
  selectedPromptCard: {
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: TEAL_DARK,
  },
  selectedPromptLabel: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  selectedPromptText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 22,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#3A3660',
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 20,
  },
  textInput: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  hintText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  hintTextReady: {
    color: TEAL,
  },
  charCount: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  charCountReady: {
    color: TEAL,
  },
  inputTrack: {
    height: 3,
    backgroundColor: TRACK_COLOR,
    borderRadius: 2,
    overflow: 'hidden',
  },
  inputBar: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 2,
  },

  // ── CTA
  ctaButton: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.4,
  },
  ctaButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Analyzing
  analyzingContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
  },
  analyzingIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: TEAL,
    backgroundColor: TEAL_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  affirmationText: {
    color: TEXT_MUTED,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: TRACK_COLOR,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 2,
  },

  // ── Result
  resultContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TEAL_DARK,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  resultCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3660',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  resultCardLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 18,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emotionRowLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    width: 68,
  },
  emotionBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: TRACK_COLOR,
    borderRadius: 3,
    overflow: 'hidden',
  },
  emotionBarFill: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 3,
  },
  emotionRowPct: {
    color: TEXT_MUTED,
    fontSize: 13,
    width: 36,
    textAlign: 'right',
  },
  resultActions: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 8,
  },
  ctaButtonGradient: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientFill: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  rewriteText: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '500',
  },
});
