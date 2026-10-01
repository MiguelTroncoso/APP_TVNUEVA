/**
 * ServersScreen — Gestión de múltiples servidores Xtream
 * Permite guardar varias cuentas y cambiar entre ellas fácilmente.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, TextInput,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { login as xtreamLogin } from '../services/xtream';
import { colors } from '../theme';
import FocusableButton from '../components/FocusableButton';
import { safeBack, useSafeHardwareBack } from '../utils/navigation';
import { isTV, layout } from '../utils/tv';

const SERVERS_KEY   = 'superflash_saved_servers';
const SERVER_URL    = 'http://superflash.ovh:80';

const safeKey = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);

export default function ServersScreen({ navigation }) {
  useSafeHardwareBack(navigation, 'Home');
  const { signIn, user } = useAuth();
  const [servers, setServers]     = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [formUser, setFormUser]   = useState('');
  const [formPass, setFormPass]   = useState('');
  const [formName, setFormName]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  useEffect(() => { loadServers(); }, []);

  const loadServers = async () => {
    try {
      const raw = await AsyncStorage.getItem(SERVERS_KEY);
      if (raw) setServers(JSON.parse(raw));
    } catch (_) {}
  };

  const saveServers = async (list) => {
    setServers(list);
    await AsyncStorage.setItem(SERVERS_KEY, JSON.stringify(list));
  };

  const addServer = async () => {
    if (!formUser.trim() || !formPass.trim()) {
      Alert.alert('Error', 'Ingresa usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      const result = await xtreamLogin(SERVER_URL, formUser.trim(), formPass.trim());
      if (!result.success) {
        Alert.alert('Error', result.error || 'Credenciales inválidas');
        return;
      }
      const id = `${safeKey(formUser)}_${Date.now()}`;
      const newServer = {
        id,
        name:     formName.trim() || formUser.trim(),
        username: formUser.trim(),
        url:      SERVER_URL,
        addedAt:  new Date().toISOString(),
        info:     result.userInfo,
      };
      // Guardar contraseña en SecureStore
      await SecureStore.setItemAsync(`superflash_srv_${id}`, formPass.trim()).catch(() => {});
      const updated = [...servers.filter(s => s.username !== formUser.trim()), newServer];
      await saveServers(updated);
      setShowForm(false);
      setFormUser(''); setFormPass(''); setFormName('');
      Alert.alert('✓ Cuenta agregada', `"${newServer.name}" fue guardada correctamente.`);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo conectar');
    } finally {
      setLoading(false);
    }
  };

  const switchToServer = async (srv) => {
    setLoading(true);
    try {
      const pass = await SecureStore.getItemAsync(`superflash_srv_${srv.id}`).catch(() => '');
      const result = await signIn(srv.url, srv.username, pass || '');
      if (result.success) {
        navigation.replace('Home');
      } else {
        Alert.alert('Error', result.error || 'No se pudo cambiar de cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeServer = (srv) => {
    Alert.alert(
      'Eliminar cuenta',
      `¿Eliminar "${srv.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await SecureStore.deleteItemAsync(`superflash_srv_${srv.id}`).catch(() => {});
          await saveServers(servers.filter(s => s.id !== srv.id));
        }},
      ]
    );
  };

  const isActive = (srv) => srv.username === user?.username;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <FocusableButton onPress={() => safeBack(navigation, 'Home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </FocusableButton>
        <Text style={styles.title}>Mis cuentas</Text>
        <FocusableButton style={styles.addBtn} onPress={() => setShowForm(v => !v)}>
          <Text style={styles.addBtnText}>{showForm ? '✕' : '+ Agregar'}</Text>
        </FocusableButton>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Formulario nueva cuenta */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Agregar cuenta</Text>
            <Text style={styles.formLabel}>Nombre (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Mi cuenta principal"
              placeholderTextColor="#444"
              value={formName}
              onChangeText={setFormName}
            />
            <Text style={styles.formLabel}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="usuario"
              placeholderTextColor="#444"
              value={formUser}
              onChangeText={setFormUser}
              autoCapitalize="none"
            />
            <Text style={styles.formLabel}>Contraseña</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="contraseña"
                placeholderTextColor="#444"
                value={formPass}
                onChangeText={setFormPass}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Text>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <FocusableButton
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={addServer}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>{loading ? 'Verificando...' : 'Guardar cuenta'}</Text>
            </FocusableButton>
          </View>
        )}

        {/* Lista de cuentas */}
        {servers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No hay cuentas guardadas</Text>
            <Text style={styles.emptySubText}>Agrega una cuenta para cambiar rápidamente entre perfiles</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {servers.map(srv => (
              <View key={srv.id} style={[styles.serverCard, isActive(srv) && styles.serverCardActive]}>
                <View style={styles.serverInfo}>
                  {isActive(srv) && <View style={styles.activeDot} />}
                  <View>
                    <Text style={styles.serverName}>{srv.name}</Text>
                    <Text style={styles.serverUser}>@{srv.username}</Text>
                    {srv.info?.exp_date && Number(srv.info.exp_date) > 0 && (
                      <Text style={styles.serverExp}>
                        Vence: {new Date(Number(srv.info.exp_date) * 1000).toLocaleDateString('es-ES')}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.serverActions}>
                  {!isActive(srv) && (
                    <FocusableButton style={styles.switchBtn} onPress={() => switchToServer(srv)}>
                      <Text style={styles.switchBtnText}>Usar</Text>
                    </FocusableButton>
                  )}
                  {isActive(srv) && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>✓ Activa</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => removeServer(srv)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.horizontalPadding, paddingTop: isTV ? 16 : 8, paddingBottom: 14 },
  backBtn: { padding: 8, borderWidth: 1, borderColor: 'transparent', borderRadius: 8 },
  backText: { color: colors.accent, fontSize: isTV ? 17 : 14 },
  title: { color: colors.white, fontSize: isTV ? 26 : 18, fontWeight: 'bold' },
  addBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: colors.primary, fontWeight: '600', fontSize: isTV ? 15 : 12 },

  form: { margin: layout.horizontalPadding, backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2a2a3a', gap: 8, marginBottom: 16 },
  formTitle: { color: colors.white, fontSize: isTV ? 18 : 15, fontWeight: 'bold', marginBottom: 4 },
  formLabel: { color: colors.accent, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  input: { backgroundColor: '#0f0f14', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a3a', color: colors.white, padding: 12, fontSize: isTV ? 16 : 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 12, backgroundColor: '#0f0f14', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a3a' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: isTV ? 16 : 14 },

  list: { paddingHorizontal: layout.horizontalPadding, gap: 10, paddingBottom: 30 },
  serverCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#2a2a3a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serverCardActive: { borderColor: colors.primary },
  serverInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  serverName: { color: colors.white, fontSize: isTV ? 17 : 14, fontWeight: '600' },
  serverUser: { color: colors.textSecondary, fontSize: isTV ? 13 : 11 },
  serverExp: { color: '#888', fontSize: isTV ? 12 : 10, marginTop: 2 },
  serverActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  switchBtnText: { color: colors.white, fontWeight: '600', fontSize: isTV ? 14 : 12 },
  activeBadge: { backgroundColor: 'rgba(91,61,245,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary },
  activeBadgeText: { color: colors.primary, fontSize: isTV ? 13 : 11, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: isTV ? 20 : 16 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: colors.white, fontSize: isTV ? 20 : 16, fontWeight: 'bold', textAlign: 'center' },
  emptySubText: { color: colors.textSecondary, fontSize: isTV ? 15 : 13, textAlign: 'center', lineHeight: 20 },
});
