import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, ScrollView,
} from 'react-native';
import { colors } from '../theme';
import { isTV, isTablet, layout } from '../utils/tv';
import FocusableButton from './FocusableButton';

const CARD_WIDTH = isTV ? 150 : isTablet ? 190 : 168;
const CARD_HEIGHT = isTV ? 112 : 142;

const normalize = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const CHANNEL_TABS = [
  { key: 'live', label: '🔴 En vivo', hints: [] },
  { key: 'events', label: '🏆 Eventos', hints: ['evento', 'eventos', 'agenda', 'exclusivo', 'exclusivos', 'deporte', 'deportes', 'sports'] },
  { key: 'friendly', label: '🤝 Amistosos', hints: ['amistoso', 'friendly', 'fifa', 'mundial', 'world cup', 'eliminatoria', 'seleccion', 'nations'] },
  { key: 'basketball', label: '🏀 Basket', hints: ['basket', 'basquet', 'nba', 'wnba', 'ncaa basketball'] },
  { key: 'football_am', label: '🏈 NFL', hints: ['nfl', 'football americano', 'college football', 'ncaaf'] },
  { key: 'baseball', label: '⚾ Béisbol', hints: ['mlb', 'beisbol', 'baseball'] },
  { key: 'hockey', label: '🏒 NHL', hints: ['nhl', 'hockey'] },
  { key: 'soccer', label: '⚽ Fútbol', hints: ['futbol', 'soccer', 'liga', 'champions', 'libertadores', 'sudamericana', 'premier', 'laliga', 'serie a', 'bundesliga', 'ligue 1'] },
  { key: 'fight', label: '🥊 Box/UFC', hints: ['box', 'boxing', 'ufc', 'mma', 'combate', 'fight'] },
  { key: 'tennis', label: '🎾 Tenis', hints: ['tenis', 'tennis', 'atp', 'wta'] },
  { key: 'motorsport', label: '🏎 F1', hints: ['f1', 'formula', 'formula 1', 'racing', 'motogp', 'nascar'] },
];

const SPORTS_HINTS = [
  'sport', 'sports', 'deporte', 'deportes', 'espn', 'fox sports', 'directv sports',
  'dsports', 'd sports', 'tnt sports', 'tyc sports', 'bein', 'gol', 'fifa',
  'mundial', 'world cup', 'nba', 'nfl', 'mlb', 'nhl', 'ufc', 'futbol', 'soccer',
  'tennis', 'tenis', 'formula', 'f1', 'box', 'boxeo', 'evento', 'eventos',
  'agenda', 'exclusivo', 'liga', 'champions', 'libertadores', 'amistoso',
];

const getSearchText = (channel = {}) => normalize([
  channel.name,
  channel.title,
  channel.category_name,
  channel.category,
  channel.group,
].filter(Boolean).join(' '));

const isSportsChannel = (channel) => {
  const text = getSearchText(channel);
  return SPORTS_HINTS.some(hint => text.includes(normalize(hint)));
};

const matchesTab = (channel, tab) => {
  const text = getSearchText(channel);
  if (tab.key === 'live') return true;
  return tab.hints.some(hint => text.includes(normalize(hint)));
};

const sortChannels = (channels = []) => [...channels].sort((a, b) => {
  const aSchedule = getLocalSchedule(a);
  const bSchedule = getLocalSchedule(b);
  if (aSchedule?.timestamp && bSchedule?.timestamp) return aSchedule.timestamp - bSchedule.timestamp;
  if (aSchedule?.timestamp) return -1;
  if (bSchedule?.timestamp) return 1;
  const aName = String(a?.name || a?.title || '');
  const bName = String(b?.name || b?.title || '');
  return aName.localeCompare(bName, 'es');
});

const getLocalSchedule = (channel = {}) => {
  const text = [
    channel.name,
    channel.title,
    channel.category_name,
  ].filter(Boolean).join(' ');
  const match = String(text).match(/\b([01]?\d|2[0-3])(?:(?:[:.hH]([0-5]\d))\s*(a\.?m\.?|p\.?m\.?|am|pm)?|\s*(a\.?m\.?|p\.?m\.?|am|pm))\b/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] || '0', 10);
  const meridiem = String(match[3] || match[4] || '').toLowerCase();
  if (meridiem.startsWith('p') && hour < 12) hour += 12;
  if (meridiem.startsWith('a') && hour === 12) hour = 0;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() < Date.now() - 6 * 60 * 60 * 1000) date.setDate(date.getDate() + 1);

  return {
    timestamp: date.getTime(),
    label: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
};

export default function SportsRow({ navigation, liveChannels = [] }) {
  const [tab, setTab] = useState('live');

  const sportsChannels = useMemo(
    () => sortChannels((liveChannels || []).filter(isSportsChannel)),
    [liveChannels]
  );

  const activeTab = CHANNEL_TABS.find(item => item.key === tab) || CHANNEL_TABS[0];
  const filteredChannels = useMemo(() => {
    const result = sportsChannels.filter(channel => matchesTab(channel, activeTab));
    return result.slice(0, isTV ? 24 : 18);
  }, [activeTab, sportsChannels]);

  const openChannel = useCallback((channel) => {
    if (!navigation || !channel) return;
    const channelIndex = filteredChannels.findIndex(item => getChannelKey(item) === getChannelKey(channel));
    navigation.navigate('Player', {
      stream: channel,
      type: 'live',
      returnRoute: 'MainTabs',
      channelList: filteredChannels,
      channelIndex: channelIndex >= 0 ? channelIndex : 0,
    });
  }, [filteredChannels, navigation]);

  if (!sportsChannels.length) return null;

  const TabButton = ({ item, index }) => {
    const active = tab === item.key;
    const Component = isTV ? FocusableButton : TouchableOpacity;
    const props = isTV
      ? {
          style: [styles.tabBtn, active && styles.tabBtnActive],
          focusedStyle: styles.tabBtnFocused,
          trapFocusLeft: index === 0,
          trapFocusRight: index === CHANNEL_TABS.length - 1,
          onPress: () => setTab(item.key),
        }
      : { style: [styles.tabBtn, active && styles.tabBtnActive], activeOpacity: 0.85, onPress: () => setTab(item.key) };

    return (
      <Component {...props}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
      </Component>
    );
  };

  const renderChannel = ({ item, index }) => (
    <SportsChannelCard
      item={item}
      index={index}
      total={filteredChannels.length}
      onPress={openChannel}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.rowHeader}>
        <View>
          <Text style={styles.rowTitle}>🏆 Deportes</Text>
          <Text style={styles.rowSubtitle}>{filteredChannels.length} canal{filteredChannels.length !== 1 ? 'es' : ''} disponible{filteredChannels.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {isTV ? (
        <FlatList
          data={CHANNEL_TABS}
          horizontal
          keyExtractor={item => item.key}
          renderItem={({ item, index }) => <TabButton item={item} index={index} />}
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {CHANNEL_TABS.map((item, index) => <TabButton key={item.key} item={item} index={index} />)}
        </ScrollView>
      )}

      <FlatList
        data={filteredChannels}
        renderItem={renderChannel}
        keyExtractor={(item, index) => `sports-channel-${item.stream_id || item.id || index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        removeClippedSubviews={!isTV}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Sin señales en esta categoría</Text>
        }
      />
    </View>
  );
}

const getChannelKey = (channel = {}) => String(channel.stream_id || channel.id || channel.name || channel.title || '');

const styles = StyleSheet.create({
  container: { marginBottom: isTV ? 26 : 24 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: layout.horizontalPadding,
    marginBottom: isTV ? 8 : 12,
  },
  rowTitle: { color: colors.white, fontSize: isTV ? 18 : 28, fontWeight: '900' },
  rowSubtitle: { color: colors.textSecondary, fontSize: isTV ? 11 : 14, marginTop: 2 },
  tabsScroll: { marginBottom: isTV ? 10 : 14 },
  tabsContent: { paddingHorizontal: layout.horizontalPadding, gap: isTV ? 8 : 10 },
  tabBtn: {
    paddingHorizontal: isTV ? 12 : 16,
    paddingVertical: isTV ? 7 : 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceElevated || colors.card,
    borderWidth: isTV ? 1.5 : 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tabBtnActive: {
    backgroundColor: isTV ? '#9B5CFF' : colors.primary,
    borderColor: isTV ? '#9B5CFF' : colors.primary,
  },
  tabBtnFocused: {
    borderColor: isTV ? '#9B5CFF' : colors.accentWarm || colors.accent,
    backgroundColor: isTV ? 'rgba(155,92,255,0.20)' : 'rgba(246,182,63,0.18)',
  },
  tabText: { color: colors.textSecondary, fontSize: isTV ? 11 : 15, fontWeight: '800' },
  tabTextActive: { color: colors.white },
  list: { paddingHorizontal: layout.horizontalPadding, gap: isTV ? 12 : 14, paddingTop: isTV ? 6 : 2, paddingBottom: isTV ? 12 : 8 },
  channelCard: { width: CARD_WIDTH, overflow: 'visible', borderWidth: isTV ? 2 : 0, borderColor: 'transparent', borderRadius: isTV ? 12 : 0, padding: isTV ? 2 : 0 },
  channelCardFocused: { borderColor: isTV ? '#9B5CFF' : colors.accentWarm || '#F6B63F', backgroundColor: isTV ? 'rgba(155,92,255,0.10)' : 'rgba(246,182,63,0.10)' },
  logoBox: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: isTV ? 10 : 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logoImg: { width: '100%', height: '100%', backgroundColor: colors.card },
  logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11131c' },
  logoPlaceholderText: { fontSize: isTV ? 28 : 36 },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(230,0,18,0.92)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveText: { color: colors.white, fontSize: isTV ? 10 : 11, fontWeight: '900' },
  channelName: { color: colors.white, fontSize: isTV ? 11 : 14, lineHeight: isTV ? 15 : 18, fontWeight: '800', marginTop: 7 },
  channelMeta: { color: '#BFA7FF', fontSize: isTV ? 10 : 12, fontWeight: '700', marginTop: 3 },
  emptyText: { color: colors.textSecondary, fontSize: isTV ? 12 : 14, paddingHorizontal: layout.horizontalPadding, paddingVertical: 18 },
});

function SportsChannelCard({ item, index, total, onPress }) {
  const image = item.stream_icon || item.cover || item.logo || null;
  const schedule = getLocalSchedule(item);
  const Component = isTV ? FocusableButton : TouchableOpacity;
  const props = isTV
    ? {
        style: styles.channelCard,
        focusedStyle: styles.channelCardFocused,
        onPress: () => onPress(item),
        trapFocusLeft: index === 0,
        trapFocusRight: index === total - 1,
      }
    : { style: styles.channelCard, activeOpacity: 0.86, onPress: () => onPress(item) };

  return (
    <Component {...props}>
      <View style={styles.logoBox}>
        {image ? (
          <Image source={{ uri: image }} style={styles.logoImg} resizeMode="cover" />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>🏆</Text>
          </View>
        )}
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>● VIVO</Text>
        </View>
      </View>
      <Text style={styles.channelName} numberOfLines={2}>
        {item.name || item.title || 'Canal deportivo'}
      </Text>
      {schedule?.label && (
        <Text style={styles.channelMeta} numberOfLines={1}>{schedule.label}</Text>
      )}
    </Component>
  );
}
