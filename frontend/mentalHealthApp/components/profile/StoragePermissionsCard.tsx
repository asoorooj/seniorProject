import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Permission = {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  enabled: boolean;
};

export function StoragePermissionsCard() {
  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 'text',   name: 'Text',   icon: 'article',      enabled: true  },
    { id: 'mic',    name: 'Mic',    icon: 'mic',          enabled: false },
    { id: 'camera', name: 'Camera', icon: 'photo-camera', enabled: false },
  ]);

  const toggle = (id: string) =>
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );

  const handleManage = () => Linking.openSettings();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Storage Permissions</Text>
        <TouchableOpacity onPress={handleManage}>
          <Text style={styles.manage}>Manage →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        {permissions.map((perm) => (
          <TouchableOpacity key={perm.id} style={styles.permItem} onPress={() => toggle(perm.id)}>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1830',
  },
  manage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F27059',
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
    backgroundColor: '#4CC9B0',
  },
  iconBoxOff: {
    backgroundColor: '#EDE8F8',
  },
  permName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E1830',
  },
  permLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  labelOn: {
    color: '#4CC9B0',
  },
  labelOff: {
    color: '#9E8FB8',
  },
});
