/**
 * BackupScreen — Exportar e Importar configuración
 * Guarda/restaura: favoritos, Ver después, historial, ajustes
 * Exporta como JSON via expo-sharing. Importa via expo-document-picker.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLibrary } from '../context/LibraryContext';
import { colors } from '../theme';
import FocusableButton from '../components/FocusableButton';
import { safeBack, useSafeHardwareBack } from '../utils/navigation';
import { isTV, layout } from '../utils/tv';

const ActionRow = ({ icon, title, subtitle, onPress, color }) => (
  <FocusableButton style={styles.actionRow} focusedStyle={styles.actionRowFocused} onPress={onPress}>
    <Text style={styles.actionIcon}>{icon}</Text>
    <View style={styles.actionText}>
      <Text style={[styles.actionTitle, color && { color }]}>{title}</Text>
      <Text style={styles.actionSub}>{subtitle}</Text>
    </View>
    <Text style={styles.arrowIcon}>›</Text>
  </FocusableButton>
);

export default function BackupScreen({ navigation }) {
  useSafeHardwareBack(navigation, 'Home');
  const { favorites, watchlist, watchStats } = useLibrary();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const superflashKeys = allKeys.filter(k => k.startsWith('superflash_'));
      const pairs = await AsyncStorage.multiGet(superflashKeys);
      const data = {};
      pairs.forEach(([k, v]) => { try { data[k] = JSON.parse(v); } catch (_) { data[k] = v; } });

      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data,
        summary: {
          favorites: favorites.length,
          watchlist: watchlist.length,
          history: watchStats.length,
        },
      };

      const path = `${FileSystem.cacheDirectory}superflash_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(backup, null, 2));
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Exportar backup Super Flash' });
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const backup = JSON.parse(content);

      if (!backup?.data || backup?.version !== '1.0') {
        Alert.alert('Error', 'El archivo no es un backup válido de Super Flash.');
        return;
      }

      Alert.alert(
        'Restaurar backup',
        `Este backup contiene:\n• ${backup.summary?.favorites || 0} favoritos\n• ${backup.summary?.watchlist || 0} Ver después\n• ${backup.summary?.history || 0} historial\n\nExportado el: ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString('es-ES') : 'desconocido'}\n\n⚠️ Esto reemplazará tu configuración actual.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Restaurar', style: 'destructive', onPress: async () => {
            setLoading(true);
            try {
              const pairs = Object.entries(backup.data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]);
              await AsyncStorage.multiSet(pairs);
              Alert.alert('✓ Listo', 'Backup restaurado. Reinicia la app para ver los cambios.', [
                { text: 'OK', onPress: () => safeBack(navigation, 'Home') }
              ]);
            } catch (e) {
              Alert.alert('Error', 'No se pudo restaurar: ' + e.message);
            } finally {
              setLoading(false);
            }
          }},
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el archivo: ' + (e.message || e));
    }
  };


  const encodeSyncPayload = (payload) => {
    const json = JSON.stringify(payload);
    const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    if (typeof btoa === 'function') return btoa(utf8);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let i = 0; i < utf8.length; i += 3) {
      const c1 = utf8.charCodeAt(i);
      const c2 = utf8.charCodeAt(i + 1);
      const c3 = utf8.charCodeAt(i + 2);
      output += chars.charAt(c1 >> 2);
      output += chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
      output += Number.isNaN(c2) ? '=' : chars.charAt(((c2 & 15) << 2) | (c3 >> 6));
      output += Number.isNaN(c3) ? '=' : chars.charAt(c3 & 63);
    }
    return output;
  };

  const handleCopyCode = async () => {
    try {
      const essential = {
        v: 1,
        f: favorites.map(i => ({ id: (i.raw || i).stream_id, n: (i.raw || i).name, t: i.type })),
        w: watchlist.map(i => ({ id: i.id, n: i.name, t: i.type })),
      };
      const code = encodeSyncPayload(essential);
      const { Share } = require('react-native');
      await Share.share({ message: 'Super Flash sync:\n' + code, title: 'Código Super Flash' });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el código: ' + e.message);
    }
  };

  const handlePasteCode = async () => {
    Alert.alert(
      '📥 Importar código',
      'Para importar desde otro dispositivo:\n\n1. En el dispositivo origen, toca "Copiar código de sync"\n2. Comparte el texto que aparece\n3. Copia ese texto\n4. Vuelve aquí y selecciona "Desde archivo" para usar el backup completo, o contacta soporte.\n\nPor ahora usa "Restaurar backup" con el archivo .json para mayor confiabilidad.',
      [{ text: 'Entendido' }]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      '⚠️ Borrar datos',
      '¿Borrar todos los favoritos, Ver después e historial? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar todo', style: 'destructive', onPress: async () => {
          const allKeys = await AsyncStorage.getAllKeys();
          const superflashKeys = allKeys.filter(k => k.startsWith('superflash_library'));
          await AsyncStorage.multiRemove(superflashKeys);
          Alert.alert('Listo', 'Datos borrados. Reinicia la app.');
          safeBack(navigation, 'Home');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <FocusableButton onPress={() => safeBack(navigation, 'Home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </FocusableButton>
        <Text style={styles.title}>📦 Backup y sincronización</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen actual</Text>
          <View style={styles.summaryRow}>
            {[
              { label: 'Favoritos', value: favorites.length, icon: '❤️' },
              { label: 'Ver después', value: watchlist.length, icon: '🔖' },
              { label: 'Historial', value: watchStats.length, icon: '🕐' },
            ].map(s => (
              <View key={s.label} style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>{s.icon}</Text>
                <Text style={styles.summaryValue}>{s.value}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exportar</Text>
          <ActionRow icon="📤" title="Exportar backup" subtitle="Guarda favoritos, Ver después e historial en un archivo JSON" onPress={handleExport} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Importar</Text>
          <ActionRow icon="📥" title="Restaurar backup" subtitle="Importa un backup .json generado por Super Flash" onPress={handleImport} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronización entre dispositivos</Text>
          <ActionRow icon="📤" title="Copiar código de sync" subtitle="Copia un código para pegar en otro dispositivo" onPress={handleCopyCode} />
          <ActionRow icon="📥" title="Importar código de sync" subtitle="Pega el código copiado desde otro dispositivo" onPress={handlePasteCode} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos</Text>
          <ActionRow icon="🗑" title="Borrar todos los datos" subtitle="Eliminar favoritos, historial y Ver después" onPress={handleClearData} color="#ff6666" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.horizontalPadding, paddingTop: isTV ? 16 : 8, paddingBottom: 14 },
  backBtn: { padding: 8, borderWidth: 1, borderColor: 'transparent', borderRadius: 8 },
  backText: { color: colors.accent, fontSize: isTV ? 17 : 14 },
  title: { color: colors.white, fontSize: isTV ? 22 : 16, fontWeight: 'bold', flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  section: { paddingHorizontal: layout.horizontalPadding, marginBottom: 20 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#2a2a3a' },
  summaryIcon: { fontSize: 22 },
  summaryValue: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  summaryLabel: { color: colors.textSecondary, fontSize: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: isTV ? 18 : 14, gap: 14, borderWidth: 2, borderColor: '#2a2a3a', marginBottom: 8 },
  actionRowFocused: { borderColor: colors.accent },
  actionIcon: { fontSize: isTV ? 24 : 20 },
  actionText: { flex: 1 },
  actionTitle: { color: colors.white, fontSize: isTV ? 16 : 14, fontWeight: '600' },
  actionSub: { color: colors.textSecondary, fontSize: isTV ? 12 : 11, marginTop: 2 },
  arrowIcon: { color: colors.textSecondary, fontSize: isTV ? 22 : 18 },
});
