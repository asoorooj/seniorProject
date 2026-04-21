import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { capsule, colors } from '@/assets/styles/colors';
import type { UserConsent } from '@/services/apiService';

type Permission = {
  id: keyof UserConsent;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  enabled: boolean;
};

type Props = {
  consent: UserConsent;
  saving?: boolean;
  onToggle: (id: keyof UserConsent) => void;
};

export function ConsentPermissionsCard({ consent, saving = false, onToggle }: Props) {
  const permissionItems: Permission[] = [
    { id: 'stor_cons_text',  name: 'Chat',  icon: 'article',       enabled: consent.stor_cons_text  },
    { id: 'stor_cons_audio', name: 'Voice', icon: 'mic',           enabled: consent.stor_cons_audio },
    { id: 'stor_cons_image', name: 'Face',  icon: 'photo-camera',  enabled: consent.stor_cons_image },
  ];

  return (
    <View style={capsule}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Storage</Text>
        <Text style={styles.subtitle}>{saving ? 'Saving...' : 'Controls what we store'}</Text>
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
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
