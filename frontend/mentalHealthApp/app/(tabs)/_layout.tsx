import { Tabs, useRouter } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { CustomTabBar } from '@/components/ui/custom-tab-bar';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen
            name="chatNavbar"
            listeners={{
                tabPress: (e) => {
                    e.preventDefault();
                    router.push('/chat');
                },
            }}
      />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}