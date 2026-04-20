import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { capsule, colors } from "@/assets/styles/colors";
import type { UserPreferences } from '@/services/apiService';

type Permission = {
  id: keyof UserPreferences;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  enabled: boolean;
};

type Props = {
  preferences: UserPreferences;
  saving?: boolean;
  onToggle: (id: keyof UserPreferences) => void;
};

export function StoragePermissionsCard({ preferences, saving = false, onToggle }: Props) {
  const permissionItems: Permission[] = [
    { id: 'pref_eval_text', name: 'Text', icon: 'article', enabled: preferences.pref_eval_text },
    { id: 'pref_eval_audio', name: 'Voice', icon: 'mic', enabled: preferences.pref_eval_audio },
    { id: 'pref_eval_image', name: 'Face', icon: 'photo-camera', enabled: preferences.pref_eval_image },
  ];

  return (
    <View style={capsule}>
      <View style={styles.header}>
        <Text style={styles.title}>Evaluation Preferences</Text>
        <Text style={styles.manage}>{saving ? 'Saving...' : 'Controls your check-in flow'}</Text>
      </View>
      <View style={styles.row}>
        {permissionItems.map((perm) => (
          <TouchableOpacity key={perm.id} style={styles.permItem} onPress={() => onToggle(perm.id)}>
            <View style={[styles.iconBox, perm.enabled ? styles.iconBoxOn : styles.iconBoxOff]}>
              <MaterialIcons
                name={perm.icon}
                size={26}
                color={perm.enabled ? '#FFFFFF' : '#9B8FE8'}
              />
            </View>
            <Text style={styles.permName}>{perm.name}</Text>
            <Text style={[styles.permLabel, perm.enabled ? styles.labelOn : styles.labelOff]}>
              {perm.enabled ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  manage: {
    fontSize: 12,
    color: colors.accentDark,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  permItem: {
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxOn: {
    backgroundColor: colors.semantic,
  },
  iconBoxOff: {
    backgroundColor: colors.background,
  },
  permName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  permLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  labelOn: {
    color: colors.semantic,
  },
  labelOff: {
    color: colors.accentDark,
  },
});
