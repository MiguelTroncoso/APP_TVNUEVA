import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors } from '../theme';

export default function PinModal({ visible, onClose, onConfirm, title = 'Contenido protegido' }) {
  const [pin, setPin] = useState('');

  const handleConfirm = () => {
    if (!pin.trim()) {
      Alert.alert('Error', 'Ingresa el PIN');
      return;
    }
    const entered = pin;
    setPin('');
    onConfirm(entered);
  };

  const handleClose = () => {
    setPin('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Ingresa el PIN para continuar
          </Text>

          <TextInput
            style={styles.input}
            placeholder="• • • •"
            placeholderTextColor="#555"
            value={pin}
            onChangeText={(text) => {
              setPin(text);
              // Auto-submit al completar 4 dígitos
              if (text.length === 4) {
                setTimeout(() => onConfirm(text), 120);
              }
            }}
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
            autoFocus
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    alignItems: 'center',
  },
  icon: {
    fontSize: 42,
    marginBottom: 12,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#0f0f14',
    color: colors.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E1E24',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});