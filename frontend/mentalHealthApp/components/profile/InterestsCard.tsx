import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { capsule, colors } from '@/assets/styles/colors';

type Props = {
  likes: string[];
  dislikes: string[];
  onEdit: () => void;
};

export const InterestsCard = React.memo(function InterestsCard({ likes, dislikes, onEdit }: Props) {
  const hasAny = likes.length > 0 || dislikes.length > 0;

  return (
    <View style={capsule}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Interests</Text>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="edit-2" size={15} color={colors.accentDark} />
        </TouchableOpacity>
      </View>

      {!hasAny ? (
        <Text style={styles.empty}>Tap the pencil to add your interests</Text>
      ) : (
        <View style={styles.sections}>
          {likes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>❤️</Text>
                <Text style={styles.sectionLabel}>Enjoy</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{likes.length}</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipStrip}
              >
                {likes.map((label) => (
                  <View key={label} style={[styles.chip, styles.chipLike]}>
                    <Text style={[styles.chipText, styles.chipLikeText]}>{label}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {dislikes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🚫</Text>
                <Text style={styles.sectionLabel}>Avoid</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{dislikes.length}</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipStrip}
              >
                {dislikes.map((label) => (
                  <View key={label} style={[styles.chip, styles.chipDislike]}>
                    <Text style={[styles.chipText, styles.chipDislikeText]}>{label}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  empty: {
    fontSize: 13,
    color: colors.accentDark,
    fontStyle: 'italic',
  },
  sections: {
    gap: 10,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sectionIcon: {
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accentDark,
  },
  chipStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipLike: {
    backgroundColor: colors.semantic,
    borderColor: colors.semantic,
  },
  chipLikeText: {
    color: colors.surface,
  },
  chipDislike: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDislikeText: {
    color: colors.surface,
  },
});
