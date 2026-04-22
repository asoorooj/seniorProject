import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { capsule, colors } from "@/assets/styles/colors";
import { useAuth } from '@/hooks/useAuth';

type Props = {
  onSignOut: () => void;
};

export function AccountCard({ onSignOut }: Props) {
  const { user } = useAuth();
  const email = user?.email ?? 'No email available';

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      'You will be returned to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: onSignOut },
      ]
    );
  };

  return (
    <View style={capsule}>
      <View style={styles.row}>
        <View style={styles.accountInfo}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
            {email}
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  email: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FCE7E6',
    borderWidth: 1,
    borderColor: '#F4C4C2',
  },
  signOut: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  note: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
