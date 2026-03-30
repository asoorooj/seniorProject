import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { API_BASE } from '@/constants/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG           = '#1E1830';
const PURPLE       = '#7B6FD8';
const ORANGE       = '#CF5B3C';
const TEAL         = '#2D9C8A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED   = '#8B87A8';
const CARD_BG      = '#252245';
const TRACK_COLOR  = '#3D3870';
const HERO_TOP     = '#2A2255';
const HERO_BTN     = '#3D2820';

// ─── Label mappings ───────────────────────────────────────────────────────────
const FUSION_PHRASE: Record<string, string> = {
  Angry:    'Feeling Tense',
  Fear:     'Feeling Anxious',
  Happy:    'Mostly Joyful',
  Sad:      'Feeling Low',
  Surprise: 'Feeling Surprised',
  Neutral:  'Mostly Calm',
};

const EMOTION_SHORT: Record<string, string> = {
  Angry:    'Tense',
  Fear:     'Anxious',
  Happy:    'Joyful',
  Sad:      'Sad',
  Surprise: 'Surprised',
  Neutral:  'Calm',
};

function formatNow(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()
    + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function callEndEvaluation(evaluationId: number): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/endevaluation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluationId }),
    });
    const data = await res.json();
    console.log('Fusion result:', data);
    return data.label ?? null;
  } catch (err) {
    console.warn('endevaluation failed:', err);
    return null;
  }
}

// ─── Modality row ─────────────────────────────────────────────────────────────
function ModalityRow({
  icon,
  label,
  emotion,
  conf,
  color,
  delay,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  emotion: string;
  conf: number;
  color: string;
  delay: number;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.modalityRow, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.modalityIcon, { backgroundColor: color + '22' }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.modalityLabel}>{label}</Text>
      <View style={styles.modalityRight}>
        <Text style={[styles.modalityEmotion, { color }]}>
          {EMOTION_SHORT[emotion] ?? emotion} {conf}%
        </Text>
        <View style={styles.modalityTrack}>
          <View style={[styles.modalityBar, { width: `${conf}%`, backgroundColor: color }]} />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    evaluationId?: string;
    faceLabel?: string;
    faceConf?: string;
    audioLabel?: string;
    audioConf?: string;
    textLabel?: string;
    textConf?: string;
  }>();

  const evaluationId = params.evaluationId ? Number(params.evaluationId) : null;
  const faceLabel    = params.faceLabel  ?? 'Neutral';
  const faceConf     = Number(params.faceConf  ?? 0);
  const audioLabel   = params.audioLabel ?? 'Neutral';
  const audioConf    = Number(params.audioConf ?? 0);
  const textLabel    = params.textLabel  ?? 'Neutral';
  const textConf     = Number(params.textConf  ?? 0);

  const [fusionLabel, setFusionLabel] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const heroScale    = useRef(new Animated.Value(0.96)).current;
  const btnOpacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = async () => {
      const label = evaluationId !== null
        ? await callEndEvaluation(evaluationId)
        : 'Neutral';
      setFusionLabel(label ?? 'Neutral');
      setLoading(false);

      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(heroScale,   { toValue: 1, useNativeDriver: true, tension: 160, friction: 10 }),
      ]).start();
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, delay: 700, useNativeDriver: true }).start();
    };
    run();
  }, []);

  const moodPhrase = FUSION_PHRASE[fusionLabel ?? 'Neutral'] ?? 'Mostly Calm';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={PURPLE} size="large" />
          <Text style={[styles.loadingText]}>Putting it all together...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back to home */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace('/(tabs)')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="x" size={22} color={TEXT_MUTED} />
      </TouchableOpacity>

      {/* Hero card */}
      <Animated.View style={[{ opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
        <LinearGradient
          colors={[HERO_TOP, '#1E1830']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>Here's Your Mood Check</Text>
          <View style={styles.avatarRing}>
            <Feather name="user" size={28} color={PURPLE} />
          </View>
          <Text style={styles.moodLabel}>{moodPhrase}</Text>
          <Text style={styles.heroDate}>{formatNow()}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Modality rows */}
      <View style={styles.modalitiesCard}>
        <ModalityRow
          icon="camera"
          label="Your Expression"
          emotion={faceLabel}
          conf={faceConf}
          color={PURPLE}
          delay={200}
        />
        <View style={styles.divider} />
        <ModalityRow
          icon="mic"
          label="Your Voice"
          emotion={audioLabel}
          conf={audioConf}
          color={ORANGE}
          delay={350}
        />
        <View style={styles.divider} />
        <ModalityRow
          icon="align-left"
          label="Your Words"
          emotion={textLabel}
          conf={textConf}
          color={TEAL}
          delay={500}
        />
      </View>

      {/* CTA */}
      <Animated.View style={[styles.ctaWrap, { opacity: btnOpacity }]}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.replace('/(tabs)/journal')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[ORANGE, PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Save to My Journal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: 15,
  },

  // ── Back
  backBtn: {
    alignSelf: 'flex-end',
    paddingTop: 8,
    paddingBottom: 16,
  },

  // ── Hero
  heroCard: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3A3660',
  },
  heroEyebrow: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: '#2A2255',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  moodLabel: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroDate: {
    color: TEXT_MUTED,
    fontSize: 13,
  },

  // ── Modalities
  modalitiesCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3660',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  modalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  modalityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalityLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalityRight: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 110,
  },
  modalityEmotion: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalityTrack: {
    width: 110,
    height: 4,
    backgroundColor: TRACK_COLOR,
    borderRadius: 2,
    overflow: 'hidden',
  },
  modalityBar: {
    height: '100%',
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#3A3660',
    marginHorizontal: -4,
  },

  // ── CTA
  ctaWrap: {
    width: '100%',
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  ctaText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
});
