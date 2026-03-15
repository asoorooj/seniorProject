import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type Recommendation = {
  title: string;
  description: string;
  exerciseTitle: string;
  exerciseDuration: string;
  exerciseInfo: string;
  steps: string[];
};

type Props = {
  data: Recommendation;
};

export function RecommendationCard({ data }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.label}>BASED ON YESTERDAY</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.body}>{data.description}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Learn More</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#9B8FE8" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
              <MaterialIcons name="close" size={20} color="#9E8FB8" />
            </TouchableOpacity>
            <View style={styles.iconRow}>
              <View style={styles.iconBg}>
                <MaterialIcons name="air" size={32} color="#9B8FE8" />
              </View>
            </View>
            <Text style={styles.modalTitle}>{data.exerciseTitle}</Text>
            <Text style={styles.modalSubtitle}>{data.exerciseDuration}</Text>
            <Text style={styles.modalDescription}>{data.exerciseInfo}</Text>
            <View style={styles.steps}>
              {data.steps.map((step, i) => (
                <View key={i} style={styles.step}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0EEFF',
    borderRadius: 25,
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9B8FE8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E1830',
    marginBottom: 6,
  },
  body: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9E8FB8',
    lineHeight: 18,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9B8FE8',
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30,24,48,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0D9F0',
    alignSelf: 'center',
    marginBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E1830',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9E8FB8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B5F88',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  step: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0EEFF',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: '700',
    color: '#9B8FE8',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E1830',
    textAlign: 'center',
  },
});
