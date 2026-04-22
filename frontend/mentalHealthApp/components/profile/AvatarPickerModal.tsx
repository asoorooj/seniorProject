import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AVATARS } from '@/constants/avatars';
import { colors } from '@/assets/styles/colors';

const DEFAULT_OPTION = { id: 0, source: null };

type Props = {
  visible: boolean;
  selectedId: number;
  onSelect: (id: number) => void;
  onClose: () => void;
};

const COLUMNS = 3;

export function AvatarPickerModal({ visible, selectedId, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose your avatar</Text>
        <FlatList
          data={[DEFAULT_OPTION, ...AVATARS]}
          keyExtractor={(item) => String(item.id)}
          numColumns={COLUMNS}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            return (
              <TouchableOpacity
                style={[styles.cell, selected && styles.cellSelected]}
                onPress={() => { onSelect(item.id); onClose(); }}
                activeOpacity={0.75}
              >
                {item.source === null ? (
                  <View style={styles.defaultCell}>
                    <MaterialIcons name="person" size={38} color="#C5BDE8" />
                  </View>
                ) : (
                  <Image source={item.source} style={styles.avatar} />
                )}
                {selected && <View style={styles.checkBadge} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentDark,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    gap: 12,
    paddingBottom: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: colors.accent,
  },
  defaultCell: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(155, 143, 232, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
});
