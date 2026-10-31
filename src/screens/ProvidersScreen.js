/**
 * ProvidersScreen — segundo proveedor Xtream y categorías ocultas.
 * Los canales del segundo proveedor se mezclan con los del principal.
 * Ocultar una categoría la quita de la Guía; los favoritos siguen en Inicio.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  getSecondary, saveSecondary, clearSecondary,
  getLiveCategoriesAll, isCategoryHidden, setCategoryHidden,
} from '../services/providers';
import { colors } from '../theme';
import FocusableButton from '../components/FocusableButton';
import { safeBack, useSafeHardwareBack } from '../utils/navigation';
import { isTV, layout } from '../utils/tv';

export default function ProvidersScreen({ navigation }) {
  useSafeHardwareBack(navigation, 'Home');
  const { user, server } = useAuth();
  const [second, setSecond] = useState(getSecondary());
  const [url, setUrl] = useState('http://');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [cats, setCats] = useState([]);
  const [, bump] = useState(0);

  const loadCats = () =>
    getLiveCategoriesAll(server.url, user.username, user.password).then(setCats).catch(() => {});
  useEffect(() => { loadCats(); }, [second]);

  const connect = async () => {
    if (!url.trim() || !username.trim() || !password) {
      Alert.alert('Faltan datos', 'Completa servidor, usuario y contraseña.');
      return;
    }
    setBusy(true);
    try {
      const res = await saveSecondary(url.trim().replace(/\/+$/, ''), username.trim(), password);
      if (!res.success) { Alert.alert('No se pudo conectar', res.error || 'Revisa los datos del proveedor.'); return; }
      setSecond(getSecondary());
      setPassword('');
    } finally { setBusy(false); }
  };

  const disconnect = async () => { await clearSecondary(); setSecond(null); };

  const toggle = async (cat) => {
    await setCategoryHidden(cat.category_id, !isCategoryHidden(cat.category_id));
    bump(n => n + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <FocusableButton style={styles.back} onPress={() => safeBack(navigation, 'Home')}>
          <Text style={styles.backText}>← Volver</Text>
        </FocusableButton>
        <Text style={styles.title}>Proveedores y categorías</Text>

        <Text style={styles.section}>Segundo proveedor</Text>
        {second ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>{second.url} · {second.username}</Text>
            <Text style={styles.hint}>Sus canales aparecen mezclados con los del principal.</Text>
            <FocusableButton style={styles.btnDanger} onPress={disconnect}>
              <Text style={styles.btnText}>Desconectar</Text>
            </FocusableButton>
          </View>
        ) : (
          <View style={styles.card}>
            <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="http://servidor:puerto" placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false} />
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Usuario" placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false} />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor="#777" secureTextEntry autoCapitalize="none" />
            <FocusableButton style={styles.btn} onPress={connect} disabled={busy}>
              <Text style={styles.btnText}>{busy ? 'Conectando…' : 'Conectar'}</Text>
            </FocusableButton>
          </View>
        )}

        <Text style={styles.section}>Categorías de canales</Text>
        <Text style={styles.hint}>Las ocultas no salen en la Guía. Tus favoritos siguen visibles en Inicio.</Text>
        {cats.map(cat => {
          const hiddenNow = isCategoryHidden(cat.category_id);
          return (
            <FocusableButton key={String(cat.category_id)} style={styles.catRow} focusedStyle={styles.focused} onPress={() => toggle(cat)}>
              <Text style={[styles.catName, hiddenNow && styles.catHidden]} numberOfLines={1}>{cat.category_name}</Text>
              <Text style={styles.catState}>{hiddenNow ? 'Oculta' : 'Visible'}</Text>
            </FocusableButton>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: layout.horizontalPadding, paddingBottom: 40, gap: 10 },
  back: { alignSelf: 'flex-start', padding: 10, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  backText: { color: colors.white, fontWeight: '800', fontSize: isTV ? 15 : 14 },
  title: { color: colors.white, fontSize: isTV ? 24 : 20, fontWeight: '900' },
  section: { color: '#9B5CFF', fontSize: 14, fontWeight: '900', marginTop: 12 },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: 12, padding: 14, gap: 10 },
  cardText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  hint: { color: colors.textSecondary, fontSize: 13 },
  input: { backgroundColor: '#0F0F14', color: colors.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  btn: { backgroundColor: '#5B3DF5', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  btnDanger: { backgroundColor: '#8A2B34', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  btnText: { color: colors.white, fontWeight: '900' },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: 10, padding: 12, borderWidth: 2, borderColor: 'transparent' },
  focused: { borderColor: '#9B5CFF', backgroundColor: 'rgba(155,92,255,0.16)' },
  catName: { color: colors.white, fontSize: 14, fontWeight: '700', flex: 1 },
  catHidden: { opacity: 0.4, textDecorationLine: 'line-through' },
  catState: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
});
