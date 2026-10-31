import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import FocusableButton from './FocusableButton';
import { colors } from '../theme';
import { layout } from '../utils/tv';

/** Banner de "Continuar viendo" para Inicio: el último contenido en progreso. */
export default function ContinueBanner({ item, onPress, hasTVPreferredFocus }) {
  if (!item) return null;
  const image = item.cover || item.stream_icon || item.raw?.cover || item.raw?.stream_icon;
  const pct = Math.round(Math.min(item.progress || 0, 1) * 100);

  return (
    <FocusableButton
      style={styles.banner}
      focusedStyle={styles.focused}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onPress={() => onPress(item.raw || item, item)}
    >
      {image ? <Image source={{ uri: image }} style={styles.poster} resizeMode="cover" /> : <View style={styles.poster} />}
      <View style={styles.info}>
        <Text style={styles.kicker}>CONTINUAR VIENDO</Text>
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
        <View style={styles.bar}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
        <Text style={styles.meta}>{pct}% visto</Text>
      </View>
    </FocusableButton>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', gap: 16, marginHorizontal: layout.horizontalPadding, marginTop: 14, marginBottom: 18,
    padding: 14, borderRadius: 14, backgroundColor: colors.surfaceElevated,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)',
  },
  focused: { borderColor: '#9B5CFF', backgroundColor: 'rgba(155,92,255,0.16)' },
  poster: { width: 150, height: 90, borderRadius: 8, backgroundColor: '#1E1E24' },
  info: { flex: 1, justifyContent: 'center', gap: 8 },
  kicker: { color: '#9B5CFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.white, fontSize: 22, fontWeight: '900' },
  bar: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 5, backgroundColor: '#9B5CFF' },
  meta: { color: colors.textSecondary, fontSize: 13 },
});
