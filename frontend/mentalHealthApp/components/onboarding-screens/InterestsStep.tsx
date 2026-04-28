import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ACTIVITIES } from '@/constants/activities';
import { colors } from '@/assets/styles/colors';
import { pills } from '@/assets/styles/text';

export type InterestState = 'none' | 'like' | 'dislike';

type ChipState = Record<string, InterestState>;

type Props = {
  chipState: ChipState;
  onChange: (next: ChipState) => void;
};

type ActiveTab = 'like' | 'dislike';

export function getLikes(chipState: ChipState): string[] {
  return Object.entries(chipState)
    .filter(([, v]) => v === 'like')
    .map(([k]) => k);
}

export function getDislikes(chipState: ChipState): string[] {
  return Object.entries(chipState)
    .filter(([, v]) => v === 'dislike')
    .map(([k]) => k);
}

export function buildChipState(likes: string[], dislikes: string[]): ChipState {
  const state: ChipState = {};
  for (const l of likes)    state[l] = 'like';
  for (const d of dislikes) state[d] = 'dislike';
  return state;
}

const CATEGORIES = Array.from(new Set(ACTIVITIES.map((a) => a.category)));

export default function InterestsStep({ chipState, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('like');

  const likeCount    = getLikes(chipState).length;
  const dislikeCount = getDislikes(chipState).length;

  function toggleInTab(label: string) {
    const current = chipState[label] ?? 'none';
    let next: InterestState;

    if (activeTab === 'like') {
      // on enjoy tab: none/dislike → like, like → none
      next = current === 'like' ? 'none' : 'like';
    } else {
      // on avoid tab: none/like → dislike, dislike → none
      next = current === 'dislike' ? 'none' : 'dislike';
    }

    onChange({ ...chipState, [label]: next });
  }

  function chipStyleForTab(label: string) {
    const state = chipState[label] ?? 'none';
    if (activeTab === 'like') {
      if (state === 'like')    return styles.chipLike;
      if (state === 'dislike') return styles.chipOtherDislike; // already avoided
      return styles.chipNone;
    }
    if (state === 'dislike') return styles.chipDislike;
    if (state === 'like')    return styles.chipOtherLike;     // already enjoyed
    return styles.chipNone;
  }

  function chipTextStyleForTab(label: string) {
    const state = chipState[label] ?? 'none';
    if (activeTab === 'like') {
      if (state === 'like')    return styles.chipLikeText;
      if (state === 'dislike') return styles.chipOtherDislikeText;
      return styles.chipNoneText;
    }
    if (state === 'dislike') return styles.chipDislikeText;
    if (state === 'like')    return styles.chipOtherLikeText;
    return styles.chipNoneText;
  }

  function chipLabelForTab(label: string) {
    const state = chipState[label] ?? 'none';
    if (activeTab === 'like'    && state === 'dislike') return `🚫 ${label}`;
    if (activeTab === 'dislike' && state === 'like')    return `❤️ ${label}`;
    return label;
  }

  return (
    <View style={styles.root}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'like' && styles.tabActiveLike]}
          onPress={() => setActiveTab('like')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'like' && styles.tabTextActiveLike]}>
            ❤️  Enjoy
          </Text>
          {likeCount > 0 && (
            <View style={[styles.badge, styles.badgeLike]}>
              <Text style={styles.badgeText}>{likeCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'dislike' && styles.tabActiveDislike]}
          onPress={() => setActiveTab('dislike')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'dislike' && styles.tabTextActiveDislike]}>
            🚫  Avoid
          </Text>
          {dislikeCount > 0 && (
            <View style={[styles.badge, styles.badgeDislike]}>
              <Text style={styles.badgeText}>{dislikeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.tabHint}>
        {activeTab === 'like'
          ? 'Tap activities that help you feel good'
          : 'Tap activities you find draining or uncomfortable'}
      </Text>

      {/* Word bank — always fills remaining space */}
      <ScrollView
        style={styles.wordBankScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {CATEGORIES.map((cat) => (
          <View key={cat} style={styles.categoryBlock}>
            <Text style={styles.categoryLabel}>{cat}</Text>
            <View style={styles.chipRow}>
              {ACTIVITIES.filter((a) => a.category === cat).map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={[pills.pill, chipStyleForTab(a.label)]}
                  onPress={() => toggleInTab(a.label)}
                  activeOpacity={0.7}
                >
                  <Text style={[pills.pillText, chipTextStyleForTab(a.label)]}>
                    {chipLabelForTab(a.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={styles.scrollPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.accentLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActiveLike: {
    backgroundColor: colors.semantic,
  },
  tabActiveDislike: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentDark,
  },
  tabTextActiveLike: {
    color: colors.surface,
  },
  tabTextActiveDislike: {
    color: colors.surface,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeLike: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  badgeDislike: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface,
  },

  tabHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    textAlign: 'center',
  },

  // Word bank
  wordBankScroll: {
    flex: 1,
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentDark,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scrollPadding: {
    height: 8,
  },

  // Chip variants
  chipNone: {
    backgroundColor: colors.transparent,
    borderColor: colors.accent,
    marginTop: 0,
  },
  chipNoneText: {
    color: colors.accent,
  },
  chipLike: {
    backgroundColor: colors.semantic,
    borderColor: colors.semantic,
    marginTop: 0,
  },
  chipLikeText: {
    color: colors.surface,
  },
  chipDislike: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    marginTop: 0,
  },
  chipDislikeText: {
    color: colors.surface,
  },
  // chip selected in the OTHER tab — outlined in that tab's color
  chipOtherLike: {
    backgroundColor: colors.semanticLight,
    borderColor: colors.semantic,
    marginTop: 0,
  },
  chipOtherLikeText: {
    color: colors.semantic,
  },
  chipOtherDislike: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    marginTop: 0,
  },
  chipOtherDislikeText: {
    color: colors.primary,
  },
});
