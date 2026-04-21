import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/assets/styles/colors';
import { getAvatarSource } from '@/constants/avatars';

type Props = {
  name: string;
  memberSince: string;
  scans: number;
  journals: number;
  streak: number;
  avatarId: number;
  onAvatarPress: () => void;
};

export const ProfileCard = React.memo(function ProfileCard({
  name,
  memberSince,
  scans,
  journals,
  streak,
  avatarId,
  onAvatarPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#2A1F50', '#1E1830']}
      style={[styles.header, { paddingTop: insets.top + 24 }]}
    >
      <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={styles.avatarWrapper}>
        {avatarId === 0 ? (
          <View style={styles.avatarIconCircle}>
            <MaterialIcons name="person" size={44} color="#C5BDE8" />
          </View>
        ) : (
          <Image source={getAvatarSource(avatarId)} style={styles.avatarImage} />
        )}
        <View style={styles.editBadge}>
          <MaterialIcons name="edit" size={12} color="#fff" />
        </View>
      </TouchableOpacity>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.memberSince}>{memberSince}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{scans}</Text>
          <Text style={styles.statLabel}>Scans</Text>
        </View>
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/journal')}>
          <Text style={styles.statNumber}>{journals}</Text>
          <Text style={styles.statLabel}>Journals</Text>
        </TouchableOpacity>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{streak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
  },
  avatarIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(155, 143, 232, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(155, 143, 232, 0.5)',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    borderColor: 'rgba(155, 143, 232, 0.5)',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1E1830',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.accentDark,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.accentDark,
  },
});
