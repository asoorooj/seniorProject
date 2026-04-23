import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

import {
  analyzeAudioClip,
  cancelEvaluation,
  type UserPreferences,
} from '@/services/apiService';
import {
  DEFAULT_EVALUATION_PREFERENCES,
  getNextModality,
} from '@/services/evaluationFlow';
import { useAuth } from '@/hooks/useAuth';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG           = '#1E1830';
const CIRCLE_DARK  = '#191638';
const CIRCLE_MID   = '#23204A';
const ORANGE       = '#CF5B3C';
const ORANGE_DIM   = '#3D2820';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED   = '#8B87A8';
const TAB_ACTIVE   = '#352A20';
const CARD_BG      = '#252245';
const TRACK_COLOR  = '#3D3870';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE  = width * 0.74;
const BRACKET_LEN  = 24;
const BRACKET_W    = 2.5;

// ─── Types ────────────────────────────────────────────────────────────────────
type AudioStep = 'intro' | 'recording' | 'loading' | 'result';

const EMOTION_DISPLAY: Record<string, string> = {
  Angry:    'angry',
  Fear:     'fearful',
  Happy:    'happy',
  Sad:      'sad',
  Surprise: 'surprised',
  Neutral:  'calm',
};

type EmotionResult = {
  emotion: string;
  confidence: number;
};

// ─── API call ─────────────────────────────────────────────────────────────────
// ─── FadeInView ───────────────────────────────────────────────────────────────
function FadeInView({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[{ flex: 1 }, { opacity }]}>{children}</Animated.View>;
}

// ─── Shared: Header ───────────────────────────────────────────────────────────
function SurveyHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Feather name="arrow-left" size={22} color={ORANGE} />
      </TouchableOpacity>
      <Text style={styles.stepLabel}>Step 2 of 3</Text>
      <View style={{ width: 22 }} />
    </View>
  );
}

// ─── Shared: Tab pills ────────────────────────────────────────────────────────
function StepTabs() {
  return (
    <View style={styles.tabRow}>
      {(['Face', 'Voice', 'Text'] as const).map((label, i) => (
        <View key={label} style={[styles.tab, i === 1 && styles.tabActive]}>
          <Text style={[styles.tabText, i === 1 && styles.tabTextActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Shared: Circle frame ─────────────────────────────────────────────────────
function CircleFrame({ children, size }: { children?: React.ReactNode; size: number }) {
  const B  = BRACKET_LEN;
  const bw = BRACKET_W;

  return (
    <View style={{ width: size + B * 2, height: size + B * 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.circleGlow, { width: size, height: size, borderRadius: size / 2, backgroundColor: CIRCLE_DARK }]}>
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          <LinearGradient
            colors={[CIRCLE_DARK, CIRCLE_MID]}
            start={{ x: 0.2, y: 0.2 }}
            end={{ x: 0.8, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
          {children}
        </View>
      </View>

      <View style={[styles.bracket, { top: 0, left: 0, borderTopWidth: bw, borderLeftWidth: bw, borderColor: ORANGE, width: B, height: B }]} />
      <View style={[styles.bracket, { top: 0, right: 0, borderTopWidth: bw, borderRightWidth: bw, borderColor: ORANGE, width: B, height: B }]} />
      <View style={[styles.bracket, { bottom: 0, left: 0, borderBottomWidth: bw, borderLeftWidth: bw, borderColor: ORANGE, width: B, height: B }]} />
      <View style={[styles.bracket, { bottom: 0, right: 0, borderBottomWidth: bw, borderRightWidth: bw, borderColor: ORANGE, width: B, height: B }]} />
    </View>
  );
}

// ─── Animated waveform bars ───────────────────────────────────────────────────
const BAR_COUNT  = 16;
const BAR_MAX_H  = 44;
const BAR_MIN_H  = 6;

function WaveformBars({ active }: { active: boolean }) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN_H))
  ).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const animations = bars.map((bar, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 60),
            Animated.timing(bar, {
              toValue: BAR_MIN_H + Math.random() * (BAR_MAX_H - BAR_MIN_H),
              duration: 280 + Math.random() * 220,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: BAR_MIN_H,
              duration: 280 + Math.random() * 220,
              useNativeDriver: false,
            }),
          ])
        )
      );
      loopRef.current = Animated.parallel(animations);
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      bars.forEach(b => b.setValue(BAR_MIN_H));
    }
    return () => loopRef.current?.stop();
  }, [active]);

  return (
    <View style={styles.waveformRow}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[styles.waveBar, { height: bar }]}
        />
      ))}
    </View>
  );
}

// ─── Screen 1: Intro ──────────────────────────────────────────────────────────
function IntroScreen({ onBegin, onSkip }: { onBegin: () => void; onSkip: () => void; }) {
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1.14, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0,    duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1,    duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.45, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const pulseSize = CIRCLE_SIZE + BRACKET_LEN * 2;

  return (
    <FadeInView>
      <View style={styles.textZone}>
        <Text style={styles.title}>{"Now Let's Hear You"}</Text>
        <Text style={styles.subtitle}>
          {"Talk for a few seconds. We'll\nlisten for emotional clues\nin your tone."}
        </Text>
      </View>
      <View style={styles.circleZone}>
        <View style={{ width: pulseSize, height: pulseSize, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.pulseRing,
              { borderRadius: pulseSize / 2 },
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
          <TouchableOpacity onPress={onBegin} activeOpacity={0.85}>
            <CircleFrame size={CIRCLE_SIZE}>
              <View style={styles.micContainer}>
                <Feather name="mic" size={CIRCLE_SIZE * 0.28} color={ORANGE} />
                <Text style={styles.startLabel}>Start Recording</Text>
              </View>
            </CircleFrame>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={{ marginTop: 40 }}>
          <Text style={styles.rerecordText}>Skip this step</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );
}

// ─── Screen 2: Active recording ───────────────────────────────────────────────
function RecordingScreen({ onStop }: { onStop: (uri: string) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startedRef   = useRef(false);

  const formatTime = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  useEffect(() => {
    const startRecording = async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
      } catch (err) {
        console.warn('Failed to start recording:', err);
      }
    };
    startRecording();

    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const handleStop = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI() ?? '';
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        onStop(uri);
      } else {
        onStop('');
      }
    } catch (err) {
      console.warn('Failed to stop recording:', err);
      onStop('');
    }
  };

  return (
    <FadeInView>
      <View style={styles.textZone}>
        <Text style={styles.title}>Listening ...</Text>
        <Text style={styles.subtitle}>{"Keep talking. You're doing great!"}</Text>
      </View>
      <View style={styles.circleZone}>
        <TouchableOpacity onPress={handleStop} activeOpacity={0.9}>
          <CircleFrame size={CIRCLE_SIZE}>
            <View style={styles.micContainer}>
              <Feather name="mic" size={CIRCLE_SIZE * 0.28} color={ORANGE} />
              <View style={styles.recRow}>
                <View style={styles.recDot} />
                <Text style={styles.recLabel}>REC</Text>
              </View>
              <Text style={styles.timerLabel}>{formatTime(elapsed)}</Text>
            </View>
          </CircleFrame>
        </TouchableOpacity>

        <WaveformBars active={true} />
        <Text style={styles.tapToStop}>Tap anytime to stop</Text>
      </View>
    </FadeInView>
  );
}

// ─── Screen 3: Loading ────────────────────────────────────────────────────────
function LoadingScreen({
  uri,
  evaluationId,
  onComplete,
}: {
  uri: string;
  evaluationId: number | null;
  onComplete: (result: EmotionResult) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2800,
      useNativeDriver: false,
    }).start();

    if (evaluationId === null) return;
    analyzeAudioClip(uri, evaluationId)
        .then(result => {
          setTimeout(() => onComplete(result), 2800);
        })
        .catch(err => {
          console.error("Audio analysis failed:", err);
        });
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <FadeInView>
      <View style={styles.textZone}>
        <Text style={styles.title}>Almost There ...</Text>
        <Text style={styles.subtitle}>{"Reading between the lines\nof your voice."}</Text>
      </View>
      <View style={styles.circleZone}>
        <CircleFrame size={CIRCLE_SIZE}>
          <View style={styles.micContainer}>
            <Feather name="mic" size={CIRCLE_SIZE * 0.28} color={ORANGE} />
          </View>
        </CircleFrame>
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Analyzing your tone...</Text>
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
  onContinue,
  onRerecord,
}: {
  result: EmotionResult | null;
  onContinue: () => void;
  onRerecord: () => void;  
}) {
  const rawEmotion = result?.emotion ?? 'Unknown';
  const emotion    = EMOTION_DISPLAY[rawEmotion] ?? rawEmotion.toLowerCase();
  const confidence = result?.confidence ?? 0;
  const pct        = Math.round(confidence * 100);

  return (
    <FadeInView>
      <View style={styles.resultContent}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={30} color={TEXT_PRIMARY} />
        </View>
        <Text style={[styles.title, { marginBottom: 8 }]}>Nice!</Text>
        <Text style={[styles.subtitle, { marginBottom: 20 }]}>
          {"We're tuning into your tone..."}
        </Text>

        <View style={styles.resultCard}>
          <View style={styles.emojiRing}>
            <View style={styles.eyeRow}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
            <View style={styles.smileCurve} />
          </View>
          <Text style={styles.emotionLabel}>You sound {emotion}</Text>
          <Text style={styles.confidenceLabel}>Confidence: {pct}%</Text>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceBar, { width: `${pct}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.resultActions}>
        <TouchableOpacity style={styles.ctaButton} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.ctaButtonText}>{"On to Your Words"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRerecord} activeOpacity={0.7} style={{ marginTop: 14 }}>
          <Text style={styles.rerecordText}>Re-record</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AudioSurveyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    evaluationId?: string;
    faceLabel?: string;
    faceConf?: string;
    faceSkipped?: string;
    prefFace?: string;
    prefAudio?: string;
    prefText?: string;
  }>();
  const evaluationId = params.evaluationId ? Number(params.evaluationId) : null;
    const faceLabel    = params.faceLabel ?? 'Neutral';
    const faceConf     = params.faceConf  ?? '0';
    const faceSkipped  = params.faceSkipped ?? 'false';

  const [step,   setStep]   = useState<AudioStep>('intro');
  const [uri,    setUri]    = useState('');
  const [result, setResult] = useState<EmotionResult | null>(null);

  const { user } = useAuth();

  const routeAfterAudio = (routeParams: Record<string, string> = {}) => {
    const nextModality = 'text';
    if (nextModality === 'text') {
      router.replace({
        pathname: '/survey-text' as any,
        params: {
          evaluationId: String(evaluationId),
          faceLabel,
          faceConf,
          faceSkipped,
          prefFace: String(user?.preferences?.pref_eval_image ?? false),
          prefAudio: String(user?.preferences?.pref_eval_audio ?? false),
          prefText: String(user?.preferences?.pref_eval_text ?? false),
          ...routeParams,
        },
      });
      return;
    }
    router.replace({
      pathname: '/survey-results' as any,
      params: {
        evaluationId: String(evaluationId),
        
        faceLabel,
        faceConf,
        faceSkipped,
        prefFace: String(user?.preferences?.pref_eval_image ?? false),
        prefAudio: String(user?.preferences?.pref_eval_audio ?? false),
        prefText: String(user?.preferences?.pref_eval_text ?? false),
        ...routeParams,
      },
    });
  };

  useEffect(() => {
    if (!(user?.preferences?.pref_eval_audio)) {
      routeAfterAudio({ audioSkipped: 'true' });
    }
  }, []);

  useEffect(()=>{console.log("[EVAL CHANGED]",evaluationId)},[evaluationId])

  const handleBack = () => {
    if (step === 'intro') {
      if (evaluationId !== null) {
        cancelEvaluation(evaluationId).catch(() => {});
      }
      router.back();
    }
    else setStep('intro');
  };

  const handleBegin = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(
        'Microphone Access Required',
        'Please allow microphone access in Settings to record your voice.',
        [{ text: 'OK' }]
      );
      return;
    }
    setStep('recording');
  };

  const handleStop = (recordingUri: string) => {
    setUri(recordingUri);
    setStep('loading');
  };

  const handleRerecord = () => {
    setUri('');
    setResult(null);
    setStep('intro');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SurveyHeader onBack={handleBack} />
      <StepTabs />

      {step === 'intro'     && <IntroScreen    onBegin={handleBegin} onSkip={() => routeAfterAudio({ audioSkipped: 'true' })}/>}
      {step === 'recording' && <RecordingScreen onStop={handleStop} />}
      {step === 'loading'   && (
        <LoadingScreen
          uri={uri}
          evaluationId={evaluationId}
          onComplete={res => { setResult(res); setStep('result'); }}
        />
      )}
      {step === 'result' && (
        <ResultScreen
          result={result}
          onContinue={() =>
            routeAfterAudio({
              audioLabel: result?.emotion ?? 'Neutral',
              audioConf: String(Math.round((result?.confidence ?? 0) * 100)),
              audioSkipped: 'false',
            })
          }          
          onRerecord={handleRerecord}
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
    borderColor: ORANGE,
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

  // ── Two-zone layout
  textZone: {
    paddingTop: 20,
    alignItems: 'center',
  },
  circleZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Typography
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Circle
  circleGlow: {
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 14,
  },
  circle: {
    borderWidth: 1.5,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bracket: {
    position: 'absolute',
    borderColor: 'transparent',
  },

  // ── Intro / mic
  pulseRing: {
    borderWidth: 1.5,
    borderColor: ORANGE,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startLabel: {
    color: ORANGE,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Recording
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ORANGE,
  },
  recLabel: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  timerLabel: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ── Waveform
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 28,
    height: BAR_MAX_H + 8,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: ORANGE,
    minHeight: BAR_MIN_H,
  },
  tapToStop: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginTop: 16,
  },

  // ── Loading
  progressContainer: {
    width: '100%',
    marginTop: 24,
  },
  progressLabel: {
    color: ORANGE,
    fontSize: 13,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: TRACK_COLOR,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: ORANGE,
    borderRadius: 2,
  },

  // ── Result
  resultContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  resultActions: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 8,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ORANGE_DIM,
    borderWidth: 1.5,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  resultCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ORANGE,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emojiRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: TEXT_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    paddingTop: 6,
  },
  eyeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  eye: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TEXT_PRIMARY,
  },
  smileCurve: {
    width: 20,
    height: 10,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: TEXT_PRIMARY,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  emotionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  confidenceLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginBottom: 14,
  },
  confidenceTrack: {
    width: '100%',
    height: 4,
    backgroundColor: TRACK_COLOR,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  rerecordText: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '500',
  },
});
