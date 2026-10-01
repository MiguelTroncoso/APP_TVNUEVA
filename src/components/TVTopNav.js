import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FocusableButton from './FocusableButton';
import BrandLogo from './BrandLogo';
import { colors } from '../theme';
import { isTV, layout } from '../utils/tv';

const NAV_ITEMS = [
  { route: 'Home', label: 'Inicio', icon: '🏠' },
  { route: 'LiveTV', label: 'TV en vivo', icon: '📺' },
  { route: 'Movies', label: 'Películas', icon: '🎬' },
  { route: 'Series', label: 'Series', icon: '📡' },
  { route: 'ProfileTab', label: 'Perfil', icon: '👤' },
];

export default function TVTopNav({ navigation, current = 'Home', preferContentFocus = false }) {
  if (!isTV) return null;

  const go = (route) => {
    if (!navigation || route === current) return;
    navigation.navigate(route, { tvFocusTarget: 'content', tvFocusAt: Date.now() });
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.brandBox}>
        <BrandLogo variant="nav" />
      </View>
      <View style={styles.nav}>
        {NAV_ITEMS.map((item, index) => {
          const active = item.route === current;
          return (
            <FocusableButton
              key={item.route}
              hasTVPreferredFocus={!preferContentFocus && index === 0 && current === 'Home'}
              style={[styles.navBtn, active && styles.navBtnActive]}
              focusedStyle={styles.navBtnFocused}
              onPress={() => go(item.route)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navText, active && styles.navTextActive]} numberOfLines={1}>{item.label}</Text>
            </FocusableButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: layout.horizontalPadding,
    paddingTop: isTV ? 6 : 10,
    paddingBottom: isTV ? 5 : 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(155,92,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 9 : 14,
  },
  brandBox: { minWidth: isTV ? 58 : 76, alignItems: 'flex-start' },
  nav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    minHeight: isTV ? 36 : 48,
    paddingHorizontal: isTV ? 8 : 12,
    borderRadius: isTV ? 10 : 14,
    backgroundColor: colors.surfaceElevated || colors.card,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTV ? 4 : 6,
    flex: 1,
  },
  navBtnActive: {
    backgroundColor: 'rgba(155,92,255,0.18)',
    borderColor: 'rgba(155,92,255,0.78)',
  },
  navBtnFocused: {
    borderColor: '#9B5CFF',
    backgroundColor: 'rgba(155,92,255,0.26)',
  },
  navIcon: { fontSize: isTV ? 13 : 18 },
  navText: { color: colors.textSecondary, fontSize: isTV ? 11 : 14, fontWeight: '900' },
  navTextActive: { color: colors.white },
});
