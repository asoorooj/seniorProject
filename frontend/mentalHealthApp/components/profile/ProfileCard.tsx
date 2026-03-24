import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from "@/assets/styles/colors"

type Props = {
  name: string;
  memberSince: string;
  scans: number;
  journals: number;
  streak: number;
};

export const ProfileCard = React.memo(function ProfileCard({ name, memberSince, scans, journals, streak }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#2A1F50', '#1E1830']}
      style={[styles.header, { paddingTop: insets.top + 24 }]}
    >
      <View style={styles.avatarCircle}>
        <MaterialIcons name="person" size={44} color="#C5BDE8" />
      </View>
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
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(155, 143, 232, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
