import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { capsule } from "@/assets/styles/colors";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from "@/constants/api";

type User = {
  id: number;
  email: string;
  external_id: string;
};

type Props = {
  onSignOut: () => void;
};

export function AccountCard({ onSignOut }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token"); // or however you store it
      const response = await fetch("http://{API_BASE}/user/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUser(data);
    } catch (e) {
      console.log("Failed to fetch user:", e);
    } finally {
      setLoading(false);
    }
  };

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
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.id}>ID: {user?.external_id}</Text>
        </>
      )}
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
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  id: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  signOut: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E53935',
  },
});