import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import FocusableButton from './FocusableButton';
import { colors } from '../theme';
import { layout } from '../utils/tv';
import { getShortEPG } from '../services/xtream';
import { authFor } from '../services/providers';
import { pickCurrentProgram } from '../utils/epgText';

const MAX_EPG_LOOKUPS = 12;

/** Fila de canales en vivo con programa actual y barra de progreso. */
export default function LiveNowRow({ title, channels, auth, onPress }) {
  const [epg, setEpg] = useState({});
  const visible = (channels || []).slice(0, MAX_EPG_LOOKUPS);
  const chKey = (c) => `${c.provider || 'p1'}-${c.stream_id}`;
  const key = visible.map(chKey).join(',');

  useEffect(() => {
    let cancelled = false;
    visible.forEach(async (ch) => {
      const a = authFor(ch, auth);
      const listings = await getShortEPG(a.server, a.username, a.password, ch.stream_id, 3);
      if (cancelled) return;
      const now = pickCurrentProgram(listings);
      if (now) setEpg(prev => ({ ...prev, [chKey(ch)]: now }));
    });
    return () => { cancelled = true; };
  }, [key]);

  if (!visible.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={visible}
        keyExtractor={chKey}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const now = epg[chKey(item)];
          return (
            <FocusableButton style={styles.card} focusedStyle={styles.cardFocused} onPress={() => onPress(item)}>
              <View style={styles.top}>
                {item.stream_icon ? (
                  <Image source={{ uri: item.stream_icon }} style={styles.logo} resizeMode="contain" />
                ) : <View style={styles.logo} />}
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              </View>
              <Text style={styles.program} numberOfLines={1}>{now?.title || 'En vivo'}</Text>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${Math.round((now?.progress || 0) * 100)}%` }]} />
              </View>
            </FocusableButton>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  title: { color: colors.white, fontSize: 18, fontWeight: '800', paddingHorizontal: layout.horizontalPadding, marginBottom: 10 },
  list: { paddingHorizontal: layout.horizontalPadding, gap: 12 },
  card: {
    width: 250, padding: 12, borderRadius: 12, gap: 8,
    backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardFocused: { borderColor: '#9B5CFF', backgroundColor: 'rgba(155,92,255,0.16)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 6 },
  name: { color: colors.white, fontSize: 15, fontWeight: '800', flex: 1 },
  program: { color: colors.textSecondary, fontSize: 13 },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: '#9B5CFF' },
});
