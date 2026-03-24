import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { capsule } from "@/assets/styles/colors"


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
    <View style={capsule}>
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.signOut}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
