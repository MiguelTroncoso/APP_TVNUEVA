import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FocusableButton from './FocusableButton';
import BrandLogo from './BrandLogo';
import { colors } from '../theme';

// `tab: true` = pestaña del navegador; el resto son pantallas del stack raíz.
const MENU_ITEMS = [
  { route: 'Home', label: 'Inicio', icon: '🏠', tab: true },
  { route: 'EPG', label: 'Guía TV', icon: '📺' },
  { route: 'Movies', label: 'Películas', icon: '🎬', tab: true },
  { route: 'Series', label: 'Series', icon: '📡', tab: true },
  { route: 'Events', label: 'Deportes', icon: '🏆' },
  { route: 'Search', label: 'Búsqueda', icon: '🔍' },
  { route: 'ProfileTab', label: 'Ajustes', icon: '⚙️', tab: true },
];

/** Menú lateral izquierdo para TV. Se usa como `tabBar` del Tab.Navigator. */
export default function TVSideMenu({ state, navigation }) {
  const current = state.routes[state.index];
  const hasContentFocus = current?.params?.tvFocusTarget === 'content';

  const go = (item) => {
    if (item.tab) {
      if (item.route !== current.name) {
        navigation.navigate(item.route, { tvFocusTarget: 'content', tvFocusAt: Date.now() });
      }
    } else {
      navigation.navigate(item.route);
    }
  };

  return (
    <View style={styles.rail}>
      <View style={styles.brand}>
        <BrandLogo variant="nav" />
      </View>
      {MENU_ITEMS.map((item) => {
        const active = item.tab && item.route === current.name;
        return (
          <FocusableButton
            key={item.route}
            hasTVPreferredFocus={active && !hasContentFocus}
            style={[styles.item, active && styles.itemActive]}
            focusedStyle={styles.itemFocused}
            onPress={() => go(item)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{item.label}</Text>
          </FocusableButton>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 190,
    backgroundColor: '#0B0B10',
    borderRightWidth: 1,
    borderRightColor: 'rgba(155,92,255,0.18)',
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
  },
  brand: { alignItems: 'center', marginBottom: 12 },
  item: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemActive: { backgroundColor: 'rgba(155,92,255,0.16)' },
  itemFocused: { borderColor: '#9B5CFF', backgroundColor: 'rgba(155,92,255,0.28)' },
  icon: { fontSize: 18, width: 24, textAlign: 'center' },
  label: { color: colors.textSecondary, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  labelActive: { color: colors.white },
});
