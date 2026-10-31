/**
 * ProfileTabScreen — Tab de Perfil y Ajustes
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useLibrary } from '../context/LibraryContext';
import { useDownloads } from '../context/DownloadsContext';
import { colors } from '../theme';
import { THEMES } from '../context/ThemeContext';
import { isTV, layout } from '../utils/tv';
import versionInfo from '../../version.json';
import FocusableButton from '../components/FocusableButton';
import TVTopNav from '../components/TVTopNav';
import { getUsedMinutes, formatTimeLeft } from '../services/kidsTimer';
import PinLockScreen from './PinLockScreen';
import {
  areNotificationsEnabled,
  setNotificationsEnabled,
} from '../services/notifications';

const THEME_KEY    = 'tvnueva_theme';
const KIDS_LIMIT_KEY = 'tvnueva_kids_limit_minutes';

const MenuItem = ({ emoji, label, subtitle, onPress, accent, right, hasTVPreferredFocus = false }) => (
  <FocusableButton
    style={styles.menuItem}
    focusedStyle={styles.menuItemFocused}
    hasTVPreferredFocus={hasTVPreferredFocus}
    onPress={onPress}
  >
    <Text style={styles.menuEmoji}>{emoji}</Text>
    <View style={styles.menuText}>
      <Text style={[styles.menuLabel, accent && { color: colors.accent }]}>{label}</Text>
      {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
    </View>
    {right || <Text style={styles.menuArrow}>›</Text>}
  </FocusableButton>
);

export default function ProfileTabScreen({ navigation, route }) {
  const { user, signOut } = useAuth();
  const { activeProfile } = useProfile();
  const { favorites, continueWatching, watchStats, watchlist } = useLibrary();
  const { downloads } = useDownloads();

  const [themeName, setThemeName]         = useState('dark');
  const [notifEnabled, setNotifEnabled]   = useState(false);
  const [kidsUsed, setKidsUsed]           = useState(0);
  const [kidsLimit, setKidsLimit]         = useState(60);
  const [pinEnabled, setPinEnabled]       = useState(false);
  const preferContentFocus = isTV && route?.params?.tvFocusTarget === 'content';

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => { if (v) setThemeName(v); }).catch(() => {});
    areNotificationsEnabled().then(setNotifEnabled);
    PinLockScreen.hasPin().then(setPinEnabled);
    if (activeProfile?.isKids) {
      getUsedMinutes().then(setKidsUsed);
      AsyncStorage.getItem(KIDS_LIMIT_KEY).then(v => { if (v) setKidsLimit(Number(v)); }).catch(() => {});
    }
  }, [activeProfile]);

  const handleThemeChange = async (name) => {
    setThemeName(name);
    await AsyncStorage.setItem(THEME_KEY, name).catch(() => {});

  };

  const handleToggleNotifications = async (val) => {
    setNotifEnabled(val);
    await setNotificationsEnabled(val);
  };

  const handleTogglePin = async () => {
    if (pinEnabled) {
      Alert.alert('Desactivar PIN', '¿Desactivar el bloqueo de la app con PIN?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: async () => {
          await PinLockScreen.removePin();
          setPinEnabled(false);
        }},
      ]);
    } else {
      navigation.navigate('PinLock', { settingMode: true, onSet: () => setPinEnabled(true) });
    }
  };

  const handleKidsLimit = () => {
    Alert.alert(
      '⏱ Límite de tiempo (Kids)',
      'Selecciona el tiempo máximo de uso diario:',
      [30, 60, 90, 120].map(min => ({
        text: min < 60 ? `${min} min` : `${min / 60}h`,
        onPress: async () => {
          setKidsLimit(min);
          await AsyncStorage.setItem(KIDS_LIMIT_KEY, String(min)).catch(() => {});
        },
      })).concat([{ text: 'Cancelar', style: 'cancel' }])
    );
  };

  const totalHours = (watchStats.reduce((s, r) => s + Number(r.seconds || 0), 0) / 3600).toFixed(1);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <TVTopNav navigation={navigation} current="ProfileTab" preferContentFocus={preferContentFocus} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{activeProfile?.avatar || '👤'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{activeProfile?.name || 'Mi perfil'}</Text>
            <Text style={styles.profileUser}>@{user?.username}</Text>
            {activeProfile?.isKids && kidsUsed > 0 && (
              <Text style={styles.kidsTimer}>
                ⏱ {formatTimeLeft(kidsLimit, kidsUsed)}
              </Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Favoritos', value: favorites.length, icon: '❤️' },
            { label: 'Horas', value: totalHours + 'h', icon: '⏱' },
            { label: 'Descargas', value: downloads.length, icon: '⬇' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Mi contenido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi contenido</Text>
          <MenuItem emoji="❤️" label="Favoritos" subtitle={`${favorites.length} guardados`} hasTVPreferredFocus={preferContentFocus} onPress={() => navigation.navigate('Favorites')} />
          <MenuItem emoji="🔖" label="Ver después" subtitle={`${watchlist.length} en Ver después`} onPress={() => navigation.navigate('Watchlist')} accent />
          <MenuItem emoji="▶️" label="Continuar viendo" subtitle={`${continueWatching.length} en progreso`} onPress={() => navigation.navigate('ContinueWatching')} />
          <MenuItem emoji="🕐" label="Historial completo" subtitle={`${watchStats.length} contenidos vistos`} onPress={() => navigation.navigate('History')} />
          <MenuItem emoji="⬇" label="Descargas" subtitle={`${downloads.length} offline`} onPress={() => navigation.navigate('Downloads')} />
        </View>

        {/* Explorar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explorar</Text>
          <MenuItem emoji="🔍" label="Búsqueda global" onPress={() => navigation.navigate('Search')} />
          <MenuItem emoji="🔥" label="Eventos en vivo" onPress={() => navigation.navigate('Events')} />
          <MenuItem emoji="📅" label="Guía EPG" onPress={() => navigation.navigate('EPG')} />
          <MenuItem emoji="📊" label="Estadísticas" onPress={() => navigation.navigate('Stats')} />
        </View>

        {/* Apariencia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          <View style={styles.themeRow}>
            {['dark', 'amoled', 'light'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.themeBtn, themeName === t && styles.themeBtnActive]}
                onPress={() => handleThemeChange(t)}
              >
                <Text style={styles.themeIcon}>{THEMES[t]?.icon || '🌙'}</Text>
                <Text style={[styles.themeLabel, themeName === t && styles.themeLabelActive]}>
                  {THEMES[t]?.name || t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ajustes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajustes</Text>
          <MenuItem
            emoji="🔔"
            label="Notificaciones de nuevos estrenos"
            subtitle={notifEnabled ? 'Activadas' : 'Desactivadas'}
            onPress={() => handleToggleNotifications(!notifEnabled)}
            right={
              <Switch
                value={notifEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#333', true: colors.primary }}
                thumbColor={notifEnabled ? colors.accent : '#888'}
              />
            }
          />
          <MenuItem
            emoji="🔐"
            label="PIN de bloqueo de app"
            subtitle={pinEnabled ? 'Activado — la app pide PIN al abrir' : 'Desactivado'}
            onPress={handleTogglePin}
            right={
              <Switch
                value={pinEnabled}
                onValueChange={() => handleTogglePin()}
                trackColor={{ false: '#333', true: colors.primary }}
                thumbColor={pinEnabled ? colors.accent : '#888'}
              />
            }
          />
          {activeProfile?.isKids && (
            <MenuItem
              emoji="⏱"
              label="Límite de tiempo Kids"
              subtitle={`${kidsLimit < 60 ? kidsLimit + ' min' : kidsLimit / 60 + 'h'} por día · Usado: ${kidsUsed} min`}
              onPress={handleKidsLimit}
            />
          )}
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <MenuItem emoji="👤" label="Mis cuentas" onPress={() => navigation.navigate('Servers')} />
          <MenuItem emoji="📦" label="Backup y sincronización" onPress={() => navigation.navigate('Backup')} />
          <MenuItem emoji="🚪" label="Cerrar sesión" onPress={handleSignOut} />
        </View>

        <Text style={styles.version}>Super Flash v{versionInfo.version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: layout.horizontalPadding, paddingTop: isTV ? 20 : 16, paddingBottom: 20 },
  avatarCircle: { width: isTV ? 72 : 58, height: isTV ? 72 : 58, borderRadius: 36, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarText: { fontSize: isTV ? 32 : 26 },
  profileName: { color: colors.white, fontSize: isTV ? 22 : 18, fontWeight: 'bold' },
  profileUser: { color: colors.textSecondary, fontSize: isTV ? 15 : 12, marginTop: 2 },
  kidsTimer: { color: '#FFD700', fontSize: 11, marginTop: 4, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: layout.horizontalPadding, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#2a2a3a' },
  statIcon: { fontSize: isTV ? 22 : 18 },
  statValue: { color: colors.white, fontSize: isTV ? 18 : 15, fontWeight: 'bold' },
  statLabel: { color: colors.textSecondary, fontSize: isTV ? 12 : 10 },
  section: { paddingHorizontal: layout.horizontalPadding, marginBottom: 20 },
  sectionTitle: { color: colors.textSecondary, fontSize: isTV ? 13 : 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 14, padding: isTV ? 18 : 14, marginBottom: 8, borderWidth: 2, borderColor: '#2a2a3a' },
  menuItemFocused: { borderColor: colors.accent },
  menuEmoji: { fontSize: isTV ? 22 : 18 },
  menuText: { flex: 1 },
  menuLabel: { color: colors.white, fontSize: isTV ? 17 : 14, fontWeight: '600' },
  menuSub: { color: colors.textSecondary, fontSize: isTV ? 13 : 11, marginTop: 2 },
  menuArrow: { color: colors.textSecondary, fontSize: isTV ? 22 : 18 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeBtn: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: '#2a2a3a' },
  themeBtnActive: { borderColor: colors.accent, backgroundColor: 'rgba(50,197,255,0.08)' },
  themeIcon: { fontSize: isTV ? 26 : 22 },
  themeLabel: { color: colors.textSecondary, fontSize: isTV ? 13 : 11, fontWeight: '600' },
  themeLabelActive: { color: colors.accent },
  version: { color: '#333', textAlign: 'center', marginTop: 8, marginBottom: 30, fontSize: 12 },
});
