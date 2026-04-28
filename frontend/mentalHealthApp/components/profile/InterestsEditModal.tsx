import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/assets/styles/colors';
import InterestsStep, {
  buildChipState,
  getLikes,
  getDislikes,
} from '@/components/onboarding-screens/InterestsStep';
import type { InterestState } from '@/components/onboarding-screens/InterestsStep';
import { updateUserInterests } from '@/services/apiService';

type Props = {
  visible: boolean;
  initialLikes: string[];
  initialDislikes: string[];
  onClose: () => void;
  onSave: (likes: string[], dislikes: string[]) => void;
};

export function InterestsEditModal({ visible, initialLikes, initialDislikes, onClose, onSave }: Props) {
  const [chipState, setChipState] = useState<Record<string, InterestState>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setChipState(buildChipState(initialLikes, initialDislikes));
    }
  }, [visible, initialLikes, initialDislikes]);

  async function handleSave() {
    setSaving(true);
    const likes    = getLikes(chipState);
    const dislikes = getDislikes(chipState);
    try {
      await updateUserInterests({ likes, dislikes });
      onSave(likes, dislikes);
    } catch {
      // surface error silently — user can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Interests</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Tap once to like · tap again to dislike · tap once more to remove
        </Text>

        <View style={styles.stepWrapper}>
          <InterestsStep chipState={chipState} onChange={setChipState} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={styles.saveText}>Save</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.accentDark,
    marginBottom: 16,
  },
  stepWrapper: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  saveButton: {
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
  saveText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.surface,
  },
});
