import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { capsule, colors } from '@/assets/styles/colors';
import { fetchConsent, updateConsent } from '@/services/apiService';

type ConsentKey = 'consent_image' | 'consent_audio' | 'consent_chat';

type PermissionItem = {
  key: ConsentKey;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const PERMISSIONS: PermissionItem[] = [
  { key: 'consent_image', name: 'Camera', icon: 'photo-camera' },
  { key: 'consent_audio', name: 'Mic',    icon: 'mic'          },
  { key: 'consent_chat',  name: 'Chat',   icon: 'article'      },
];

type ConsentValues = {
  consent_image: boolean;
  consent_audio: boolean;
  consent_chat: boolean;
};

export function ConsentPermissionsCard() {
  const [consent, setConsent] = useState<ConsentValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConsent()
      .then((data) => setConsent(data.consent))
      .catch(() => setError('Could not load permissions'));
  }, []);

  async function toggle(key: ConsentKey) {
    if (!consent) return;
    const updated = { ...consent, [key]: !consent[key] };
    setConsent(updated);
    setSaving(true);
    setError('');
    try {
      await updateConsent(updated);
    } catch {
      setError('Could not save. Try again.');
      setConsent(consent);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={capsule}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Permissions</Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {consent === null && !error ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.row}>
          {PERMISSIONS.map((perm) => {
            const enabled = consent?.[perm.key] ?? false;
            return (
              <TouchableOpacity
                key={perm.key}
                style={styles.permItem}
                onPress={() => toggle(perm.key)}
                disabled={saving || consent === null}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, enabled ? styles.iconBoxOn : styles.iconBoxOff]}>
                  <MaterialIcons
                    name={perm.icon}
                    size={26}
                    color={enabled ? '#FFFFFF' : '#9B8FE8'}
                  />
                </View>
                <Text style={styles.permName}>{perm.name}</Text>
                <Text style={[styles.permLabel, enabled ? styles.labelOn : styles.labelOff]}>
                  {enabled ? 'On' : 'Off'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
  loader: {
    marginVertical: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.accent,
    marginBottom: 10,
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
