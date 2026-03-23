import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCAN_TABS = ['Face', 'Voice', 'Text'];

type Props = {
  onStartScan: () => void;
};

export function CheckInCard({ onStartScan }: Props) {
  return (
    <LinearGradient
      colors={['#F27059', '#F4845F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.label}>DAILY CHECK-IN</Text>
      <Text style={styles.title}>Today&apos;s emotion logging</Text>

      <View style={styles.tabs}>
        {SCAN_TABS.map((tab, i) => (
          <View key={i} style={styles.tab}>
            <Text style={styles.tabText}>{tab}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={onStartScan}>
          <Text style={styles.buttonText}>Start Scan</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 25,
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 14,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tab: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonRow: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4CC9B0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F5F5',
  },
});
