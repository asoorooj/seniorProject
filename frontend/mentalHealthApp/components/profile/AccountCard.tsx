import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

type Props = {
  onSignOut: () => void;
};

export function AccountCard({ onSignOut }: Props) {
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
    <View style={styles.card}>
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.signOut}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    width: '100%',
    alignItems: 'center',
  },
  signOut: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E53935',
  },
});
