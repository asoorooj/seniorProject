import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

type TabIconName = keyof typeof MaterialIcons.glyphMap;

const TAB_ICONS: Record<string, TabIconName> = {
  index: 'home',
  journal: 'menu-book',
  chatNavbar: 'chat',
  profile: 'person',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  journal: 'Journal',
  chatNavbar: 'Chat',
  profile: 'Profile',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route, i) => {
          const isActive = state.index === i;
          const icon = TAB_ICONS[route.name] ?? 'circle';
          const label = TAB_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
              testID={descriptors[route.key].options.tabBarButtonTestID}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <MaterialIcons
                  name={icon}
                  size={22}
                  color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#9E8FB8',
    borderRadius: 50,
    width: '88%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconContainer: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});