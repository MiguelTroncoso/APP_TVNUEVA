/**
 * App.js — Super Flash v1.0.0
 *
 * Base: LinkPlay v1.0.40 (rebrand + auditoria + layout responsivo).
 *
 * Arquitectura de navegación:
 * Stack (raíz)
 *   ├── Login
 *   ├── Profiles
 *   └── MainTabs  ← Tab Navigator principal
 *         ├── Home
 *         ├── LiveTV
 *         ├── Movies
 *         ├── Series
 *         └── ProfileTab
 *
 * Screens que se apilan sobre los tabs (sin tab bar):
 *   Player, SeriesDetail, MovieDetail, Favorites,
 *   ContinueWatching, Downloads, Events, Search,
 *   Servers, EPG, Stats, Watchlist
 */
import React, { useRef, useEffect, useState } from 'react';
import { ActivityIndicator, View, BackHandler, Alert, Text, Platform } from 'react-native';
import { NavigationContainer, CommonActions, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ProfileProvider, useProfile } from './src/context/ProfileContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { DownloadsProvider } from './src/context/DownloadsContext';

// ── Screens ──────────────────────────────────────────────────────────────────
import LoginScreen from './src/screens/LoginScreen';
import ProfileSelectScreen from './src/screens/ProfileSelectScreen';
import HomeScreen from './src/screens/HomeScreen';
import LiveTVScreen from './src/screens/LiveTVScreen';
import MoviesScreen from './src/screens/MoviesScreen';
import SeriesScreen from './src/screens/SeriesScreen';
import ProfileTabScreen from './src/screens/ProfileTabScreen';
import SeriesDetailScreen from './src/screens/SeriesDetailScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import ContinueWatchingScreen from './src/screens/ContinueWatchingScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import EventsScreen from './src/screens/EventsScreen';
import SearchScreen from './src/screens/SearchScreen';
import ServersScreen from './src/screens/ServersScreen';
import EPGScreen from './src/screens/EPGScreen';
import StatsScreen from './src/screens/StatsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PinLockScreen from './src/screens/PinLockScreen';
import BackupScreen from './src/screens/BackupScreen';
import { colors } from './src/theme';
import DownloadStatusSheet from './src/components/DownloadStatusSheet';
import FocusableButton from './src/components/FocusableButton';
import { isTV } from './src/utils/tv';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab icons / TV focus ─────────────────────────────────────────────────────
const TabIcon = ({ emoji, focused }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: isTV ? 26 : 22, opacity: focused ? 1 : 0.58 }}>{emoji}</Text>
  </View>
);

const PremiumTabButton = ({ children, onPress, accessibilityState, style }) => {
  const selected = accessibilityState?.selected;
  return (
    <FocusableButton
      onPress={onPress}
      style={[
        style,
        {
          marginHorizontal: isTV ? 8 : 2,
          marginVertical: isTV ? 7 : 3,
          borderRadius: isTV ? 18 : 12,
          borderWidth: isTV ? 3 : 1,
          borderColor: selected ? (isTV ? '#9B5CFF' : '#FFD34D') : 'transparent',
          backgroundColor: selected ? (isTV ? 'rgba(155,92,255,0.16)' : 'rgba(246,182,63,0.14)') : 'transparent',
          overflow: 'visible',
        },
      ]}
      focusedStyle={{
        borderColor: isTV ? '#9B5CFF' : '#F6B63F',
        backgroundColor: isTV ? 'rgba(155,92,255,0.26)' : 'rgba(255,211,77,0.28)',
      }}
    >
      {children}
    </FocusableButton>
  );
};

const createTabOptions = (label, emoji) => ({
  tabBarLabel: label,
  tabBarIcon: ({ focused }) => <TabIcon emoji={emoji} focused={focused} />,
  tabBarButton: (props) => <PremiumTabButton {...props} />,
});

// ── Tab Navigator ─────────────────────────────────────────────────────────────
function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // Altura del tab bar: contenido fijo + safe area del sistema (botones del teléfono)
  // En algunos Android con botones de navegación físicos/virtuales el safe-area llega en 0.
  // Dejamos una reserva mínima para que el tab bar no quede tapado por los botones del sistema.
  const safeBottom = Math.max(insets.bottom || 0, Platform.OS === 'android' && !isTV ? 42 : 0);
  const tabBarHeight = (isTV ? 96 : 84) + safeBottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: isTV ? { display: 'none' } : {
          backgroundColor: theme.tabBar,
          borderTopColor: 'rgba(50,197,255,0.1)',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: safeBottom + 14,
          paddingTop: 9,
          elevation: 20,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 10,
          overflow: 'visible',
        },
        tabBarActiveTintColor: theme.accentWarm || theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: isTV ? 16 : 11, fontWeight: '800', letterSpacing: 0.2, marginTop: 2 },
        tabBarItemStyle: { paddingVertical: isTV ? 5 : 3, overflow: 'visible' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={createTabOptions('Inicio', '🏠')} />
      <Tab.Screen name="LiveTV" component={LiveTVScreen} options={createTabOptions('TV en vivo', '📺')} />
      <Tab.Screen name="Movies" component={MoviesScreen} options={createTabOptions('Películas', '🎬')} />
      <Tab.Screen name="Series" component={SeriesScreen} options={createTabOptions('Series', '📡')} />
      <Tab.Screen name="ProfileTab" component={ProfileTabScreen} options={createTabOptions('Perfil', '👤')} />
    </Tab.Navigator>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

// ── Pantallas que NO son tab (no muestran tab bar) ────────────────────────────
const PLAYER_SCREENS  = new Set(['Player']);
const EXIT_SCREENS    = new Set(['Login', 'Profiles']);
// Pantallas dentro de tabs (el back debe quedar en tabs, no salir)
const TAB_ROOT_SCREENS = new Set(['Home', 'LiveTV', 'Movies', 'Series', 'ProfileTab']);

// ── Navigator principal ───────────────────────────────────────────────────────
function AppNavigator() {
  const { theme: appTheme } = useTheme();
  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background:  appTheme.background,
      card:        appTheme.tabBar,
      text:        appTheme.white,
      border:      appTheme.border || '#2a2a3a',
      notification: appTheme.accent,
    },
  };
  const { user, loading: authLoading }        = useAuth();
  const [pinLocked, setPinLocked] = useState(false);
  const [pinChecked, setPinChecked] = useState(false);
  const { activeProfile, loading: profileLoading } = useProfile();
  const navigationRef = useRef(null);
  const isReadyRef    = useRef(false);
  const [currentRouteName, setCurrentRouteName] = useState(null);

  // ── PIN LOCK CHECK ───────────────────────────────────────────────────────
  useEffect(() => {
    PinLockScreen.hasPin().then(has => {
      setPinLocked(has);
      setPinChecked(true);
    });
  }, []);

  // ── GLOBAL BACK HANDLER ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isReadyRef.current || !navigationRef.current) return false;

      const route = navigationRef.current.getCurrentRoute();
      const name  = route?.name;

      if (PLAYER_SCREENS.has(name))  return false; // Player lo maneja
      if (EXIT_SCREENS.has(name))    return false; // Android normal

      if (TAB_ROOT_SCREENS.has(name)) {
        // En un tab raíz → preguntar si salir
        Alert.alert(
          'Salir de Super Flash',
          '¿Quieres cerrar la aplicación?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => BackHandler.exitApp() },
          ],
          { cancelable: true }
        );
        return true;
      }

      // Cualquier otra pantalla → volver a los tabs (Home)
      try {
        if (navigationRef.current.canGoBack?.()) {
          navigationRef.current.goBack();
          return true;
        }
      } catch (_) {}

      try {
        navigationRef.current.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
        );
      } catch (_) {
        try { navigationRef.current.navigate('MainTabs'); } catch (__) {}
      }
      return true;
    });

    return () => handler.remove();
  }, []);

  if (!pinChecked) return <LoadingScreen />;
  if (pinLocked) return <PinLockScreen onUnlocked={() => setPinLocked(false)} />;
  if (authLoading || profileLoading) return <LoadingScreen />;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => {
        isReadyRef.current = true;
        setCurrentRouteName(navigationRef.current?.getCurrentRoute?.()?.name || null);
      }}
      onStateChange={() => {
        setCurrentRouteName(navigationRef.current?.getCurrentRoute?.()?.name || null);
      }}
    >
      <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !activeProfile ? (
          <Stack.Screen name="Profiles" component={ProfileSelectScreen} />
        ) : (
          <>
            {/* Tab root — engloba los 5 tabs */}
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'none' }} />
            {/* Screens que se apilan sobre los tabs */}
            <Stack.Screen name="Profiles" component={ProfileSelectScreen} />
            <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{ animation: 'none', gestureEnabled: false }}
            />
            <Stack.Screen name="Favorites"         component={FavoritesScreen} />
            <Stack.Screen name="Watchlist"         component={WatchlistScreen} />
            <Stack.Screen name="ContinueWatching"  component={ContinueWatchingScreen} />
            <Stack.Screen name="Downloads"         component={DownloadsScreen} />
            <Stack.Screen name="MovieDetail"       component={MovieDetailScreen} />
            <Stack.Screen name="Events"            component={EventsScreen} />
            <Stack.Screen name="Search"            component={SearchScreen} />
            <Stack.Screen name="Servers"           component={ServersScreen} />
            <Stack.Screen name="EPG"               component={EPGScreen} />
            <Stack.Screen name="Stats"             component={StatsScreen} />
            <Stack.Screen name="History"          component={HistoryScreen} />
            <Stack.Screen name="Backup"           component={BackupScreen} />
            <Stack.Screen name="PinLock"          component={PinLockScreen} />
          </>
        )}
      </Stack.Navigator>
      <DownloadStatusSheet navigationRef={navigationRef} currentRouteName={currentRouteName} />
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <LibraryProvider>
              <DownloadsProvider>
                <AppNavigator />
              </DownloadsProvider>
            </LibraryProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
