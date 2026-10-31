/**
 * PinLockScreen — Bloqueo de app con PIN de 4 dígitos
 * 
 * Modos:
 *  - verificar: pide PIN existente → llama onUnlocked() si correcto
 *  - configurar: route.params.settingMode = true → crea y confirma nuevo PIN
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme';
import BrandLogo from '../components/BrandLogo';

const APP_PIN_KEY  = 'tvnueva_app_pin';
const MAX_ATTEMPTS = 5;

export default function PinLockScreen({ onUnlocked, route, navigation }) {
  // settingMode = true cuando viene desde Ajustes para crear un PIN nuevo
  const settingMode = route?.params?.settingMode === true;

  const [input,    setInput]    = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [step,     setStep]     = useState(1);   // 1=ingresa, 2=confirma (solo settingMode)
  const [attempts, setAttempts] = useState(0);
  const [error,    setError]    = useState('');
  const [blocked,  setBlocked]  = useState(false);

  const prompt = settingMode
    ? (step === 1 ? 'Crea tu PIN de 4 dígitos' : 'Confirma tu PIN')
    : 'Ingresa tu PIN para continuar';

  const handleDigit = (d) => {
    if (blocked || input.length >= 4) return;
    const next = input + d;
    setInput(next);
    setError('');
    if (next.length === 4) setTimeout(() => handleComplete(next), 150);
  };

  const handleDelete = () => {
    setInput(p => p.slice(0, -1));
    setError('');
  };

  const handleComplete = async (pin) => {
    if (settingMode) {
      if (step === 1) {
        setConfirm(pin); setInput(''); setStep(2);
      } else {
        if (pin === confirm) {
          await SecureStore.setItemAsync(APP_PIN_KEY, pin).catch(() => {});
          // Notificar al ProfileTabScreen que el PIN fue creado
          route?.params?.onSet?.();
          if (navigation?.canGoBack?.()) navigation.goBack();
          else navigation?.navigate?.('MainTabs');
        } else {
          Vibration.vibrate(300);
          setError('Los PINs no coinciden. Intenta de nuevo.');
          setInput(''); setStep(1); setConfirm('');
        }
      }
      return;
    }

    // Modo verificación
    if (attempts >= MAX_ATTEMPTS) return;
    try {
      const saved = await SecureStore.getItemAsync(APP_PIN_KEY);
      if (pin === saved) {
        onUnlocked?.();
      } else {
        Vibration.vibrate(300);
        const next = attempts + 1;
        setAttempts(next); setInput('');
        if (next >= MAX_ATTEMPTS) {
          setError('Demasiados intentos. Espera 30 segundos.');
          setBlocked(true);
          setTimeout(() => { setAttempts(0); setBlocked(false); setError(''); }, 30000);
        } else {
          setError(`PIN incorrecto. ${MAX_ATTEMPTS - next} intento${MAX_ATTEMPTS - next !== 1 ? 's' : ''} restante${MAX_ATTEMPTS - next !== 1 ? 's' : ''}.`);
        }
      }
    } catch (_) {
      onUnlocked?.(); // Si falla SecureStore, dejar pasar
    }
  };

  const KEYS = [1,2,3,4,5,6,7,8,9,'',0,'⌫'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <BrandLogo variant="lock" style={styles.logo} centered />
        <Text style={styles.prompt}>{prompt}</Text>

        <View style={styles.dotsRow}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[styles.dot, input.length > i && styles.dotFilled]} />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorPlaceholder} />}

        <View style={styles.grid}>
          {KEYS.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.key, d === '' && styles.keyEmpty]}
              onPress={() => {
                if (d === '') return;
                if (d === '⌫') { handleDelete(); return; }
                handleDigit(String(d));
              }}
              disabled={d === '' || blocked}
              activeOpacity={0.6}
            >
              <Text style={[styles.keyText, d === '⌫' && styles.keyBackspace]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {settingMode && (
          <TouchableOpacity onPress={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate?.('MainTabs')} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// Métodos estáticos para gestión del PIN desde fuera del componente
PinLockScreen.hasPin    = async () => { try { return !!(await SecureStore.getItemAsync(APP_PIN_KEY)); } catch (_) { return false; } };
PinLockScreen.removePin = async () => { try { await SecureStore.deleteItemAsync(APP_PIN_KEY); } catch (_) {} };

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  inner:            { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  logo:             { marginBottom: 6 },
  prompt:           { color: colors.textSecondary, fontSize: 14, marginBottom: 28, textAlign: 'center' },
  dotsRow:          { flexDirection: 'row', gap: 18, marginBottom: 14 },
  dot:              { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.accent },
  dotFilled:        { backgroundColor: colors.accent },
  error:            { color: '#FF6B6B', fontSize: 12, textAlign: 'center', minHeight: 18, marginBottom: 10 },
  errorPlaceholder: { height: 28 },
  grid:             { width: 264, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 },
  key:              { width: 78, height: 66, borderRadius: 12, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3a' },
  keyEmpty:         { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText:          { color: colors.white, fontSize: 22, fontWeight: '500' },
  keyBackspace:     { fontSize: 18 },
  cancelBtn:        { marginTop: 28, padding: 12 },
  cancelText:       { color: colors.textSecondary, fontSize: 14 },
});
