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
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';

import {
  analyzeFaceImage,
  endEvaluation,
  startEvaluation,
} from '@/services/apiService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG           = '#1E1830';
const CIRCLE_DARK  = '#191638';
const CIRCLE_MID   = '#23204A';
const PURPLE       = '#7B6FD8';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED   = '#8B87A8';
const TAB_ACTIVE   = '#353060';
const CARD_BG      = '#252245';
const TRACK_COLOR  = '#3D3870';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE  = width * 0.74;
const BRACKET_LEN  = 24;
const BRACKET_W    = 2.5;

// ─── Types ────────────────────────────────────────────────────────────────────
type FaceStep = 'intro' | 'countdown' | 'loading' | 'result';

// Maps raw model labels → grammatically correct display copy
const EMOTION_DISPLAY: Record<string, string> = {
  Angry:    'angry',
  Fear:     'fearful',
  Happy:    'happy',
  Sad:      'sad',
  Surprise: 'surprised',
  Neutral:  'neutral',
};

type EmotionResult = {
  emotion: string;
  confidence: number;
};

// ─── API call ─────────────────────────────────────────────────────────────────
// Sends base64-encoded image (the "byte array") to the backend.
// Falls back to placeholder data if the endpoint isn't ready yet.
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
        <Feather name="arrow-left" size={22} color={PURPLE} />
      </TouchableOpacity>
      <Text style={styles.stepLabel}>Step 1 of 3</Text>
      <View style={{ width: 22 }} />
    </View>
  );
}

// ─── Shared: Tab pills ────────────────────────────────────────────────────────
function StepTabs() {
  return (
    <View style={styles.tabRow}>
      {(['Face', 'Voice', 'Text'] as const).map((label, i) => (
        <View key={label} style={[styles.tab, i === 0 && styles.tabActive]}>
          <Text style={[styles.tabText, i === 0 && styles.tabTextActive]}>{label}</Text>
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

      <View style={[styles.bracket, { top: 0, left: 0, borderTopWidth: bw, borderLeftWidth: bw, borderColor: PURPLE, width: B, height: B }]} />
      <View style={[styles.bracket, { top: 0, right: 0, borderTopWidth: bw, borderRightWidth: bw, borderColor: PURPLE, width: B, height: B }]} />
      <View style={[styles.bracket, { bottom: 0, left: 0, borderBottomWidth: bw, borderLeftWidth: bw, borderColor: PURPLE, width: B, height: B }]} />
      <View style={[styles.bracket, { bottom: 0, right: 0, borderBottomWidth: bw, borderRightWidth: bw, borderColor: PURPLE, width: B, height: B }]} />
    </View>
  );
}

// ─── Screen 1: Intro ──────────────────────────────────────────────────────────
function IntroScreen({ onBegin }: { onBegin: () => void }) {
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1.14, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0,    duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1,   duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const pulseSize = CIRCLE_SIZE + BRACKET_LEN * 2;

  return (
    <FadeInView>
      <View style={styles.textZone}>
        <Text style={styles.title}>{"Let's Read Your\nExpression"}</Text>
        <Text style={styles.subtitle}>{"Give us a quick look. Your\nface says a lot!"}</Text>
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
              <Text style={styles.tapToBegin}>TAP TO BEGIN</Text>
            </CircleFrame>
          </TouchableOpacity>
        </View>
      </View>
    </FadeInView>
  );
}

// ─── Screen 2: Countdown with live camera preview ─────────────────────────────
function CountdownScreen({ onCapture }: { onCapture: (base64: string) => void }) {
  const [count, setCount]   = useState(3);
  const cameraRef           = useRef<CameraView>(null);
  const numScale            = useRef(new Animated.Value(1.3)).current;
  const numOpacity          = useRef(new Animated.Value(0)).current;
  const capturedRef         = useRef(false); // prevent double capture

  const takePicture = async () => {
    if (capturedRef.current || !cameraRef.current) return;
    capturedRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      onCapture(photo?.base64 ?? '');
    } catch (err) {
      console.warn('Camera capture failed:', err);
      onCapture(''); // proceed without image — API will use fallback
    }
  };

  useEffect(() => {
    if (count === 0) {
      takePicture();
      return;
    }
    // Pop-in animation per tick
    numScale.setValue(1.3);
    numOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(numScale,   { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }),
      Animated.timing(numOpacity, { toValue: 1, duration: 200,          useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <FadeInView>
      <View style={styles.textZone}>
        <Text style={styles.title}>Get Ready...</Text>
        <Text style={styles.subtitle}>Prepping camera</Text>
      </View>
      <View style={styles.circleZone}>
        <CircleFrame size={CIRCLE_SIZE}>
          {/* Live front-camera preview fills the circle */}
          <CameraView
            ref={cameraRef}
            facing="front"
            style={StyleSheet.absoluteFill}
          />
          {/* Countdown number overlaid on top of camera */}
          <Animated.Text
            style={[
              styles.countdownNumber,
              { transform: [{ scale: numScale }], opacity: numOpacity },
            ]}
          >
            {count > 0 ? count : ''}
          </Animated.Text>
        </CircleFrame>
      </View>
    </FadeInView>
  );
}

// ─── Screen 3: Loading — sends image to backend ───────────────────────────────
function LoadingScreen({
  image,
  evaluationId,
  onComplete,
}: {
  image: string;
  evaluationId: number | null;
  onComplete: (result: EmotionResult) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress bar in parallel with API call
    Animated.timing(progress, {
      toValue: 1,
      duration: 2800,
      useNativeDriver: false,
    }).start();

    if(evaluationId === null) return; //redirect home??
    analyzeFaceImage(image, evaluationId).then(result => {
      // Wait at least 2.8s so the progress bar finishes before advancing
      setTimeout(() => {
        onComplete(result), 2800
      });
    });
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <FadeInView>
      <View style={styles.textZone}>
        <Text style={styles.title}>Hold Still ...</Text>
        <Text style={styles.subtitle}>{"We're picking up on your vibe."}</Text>
      </View>
      <View style={styles.circleZone}>
        <CircleFrame size={CIRCLE_SIZE}>
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={CIRCLE_SIZE * 0.42} color={PURPLE} />
          </View>
        </CircleFrame>
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Reading your expression...</Text>
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
  onRescan,
}: {
  result: EmotionResult | null;
  onContinue: () => void;
  onRescan: () => void;
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
        <Text style={[styles.title, { marginBottom: 8 }]}>Got it!</Text>
        <Text style={[styles.subtitle, { marginBottom: 20 }]}>{"Here's what we're seeing..."}</Text>

        <View style={styles.resultCard}>
          <View style={styles.emojiRing}>
            <View style={styles.eyeRow}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
            <View style={styles.smileCurve} />
          </View>
          <Text style={styles.emotionLabel}>You look {emotion.toLowerCase()}</Text>
          <Text style={styles.confidenceLabel}>Confidence: {pct}%</Text>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceBar, { width: `${pct}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.resultActions}>
        <TouchableOpacity style={styles.ctaButton} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.ctaButtonText}>{"Let's Check Your Voice"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRescan} activeOpacity={0.7} style={{ marginTop: 14 }}>
          <Text style={styles.rescanText}>Re-scan</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function FaceSurveyScreen() {
  const router = useRouter();
  const [step,          setStep]          = useState<FaceStep>('intro');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [result,        setResult]        = useState<EmotionResult | null>(null);
  const [permission,    requestPermission] = useCameraPermissions();
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  
  const handleBack = () => {
    if (step === 'intro'){
      router.back();
      const closeEvaluation = async () => {
      const responseData: { evaluationId: number } = await endEvaluation(
        evaluationId as number
      );
      console.log(responseData);
      };
      closeEvaluation();
      setEvaluationId(null);
    }
    else setStep('intro');
  };

  const handleBegin = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera Access Required',
          'Please allow camera access in Settings to scan your expression.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    const setupEvaluation = async () => {
      const responseData: { evaluation_id: number } = await startEvaluation(1);
      console.log(responseData);
      setEvaluationId(responseData.evaluation_id);
    };
    console.log(evaluationId);
    if(evaluationId === null){
      setupEvaluation();
    }
    setStep('countdown');
  };

  const handleCapture = (base64: string) => {
    setCapturedImage(base64);
    setStep('loading');
  };

  const handleRescan = () => {
    setCapturedImage('');
    setResult(null);
    setStep('intro');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SurveyHeader onBack={handleBack} />
      <StepTabs />

      {step === 'intro'     && <IntroScreen    onBegin={handleBegin} />}
      {step === 'countdown' && <CountdownScreen onCapture={handleCapture} />}
      {step === 'loading'   && (
        <LoadingScreen
          image={capturedImage}
          evaluationId={evaluationId}
          onComplete={res => { 
            
            setResult(res); setStep('result'); }}
        />
      )}
      {step === 'result' && (
        <ResultScreen
          result={result}
          onContinue={() => {
            router.replace({
              pathname: '/survey-audio' as any,
              params: {
                evaluationId: String(evaluationId),
                faceLabel: result?.emotion ?? 'Neutral',
                faceConf:  String(Math.round((result?.confidence ?? 0) * 100)),
              },
            });
          }}
          onRescan={handleRescan}
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
    borderColor: PURPLE,
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
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 14,
  },
  circle: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bracket: {
    position: 'absolute',
    borderColor: 'transparent',
  },

  // ── Intro
  pulseRing: {
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  tapToBegin: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 2,
  },

  // ── Countdown
  countdownNumber: {
    color: TEXT_PRIMARY,
    fontSize: 100,
    fontWeight: '900',
    lineHeight: 115,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },

  // ── Loading
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 24,
  },
  progressLabel: {
    color: PURPLE,
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
    backgroundColor: PURPLE,
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
    backgroundColor: '#2B2857',
    borderWidth: 1.5,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  resultCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PURPLE,
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
    backgroundColor: PURPLE,
    borderRadius: 2,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  rescanText: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '500',
  },
});
