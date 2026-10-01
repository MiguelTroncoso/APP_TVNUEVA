/**
 * ContentRow - fila horizontal de carrusel estilo Netflix.
 *
 * Cambios de la auditoria:
 *  - El tamano de tarjeta ahora es reactivo (useResponsive): al girar el
 *    celular, al redimensionar el emulador o en tablets que rotan, la fila
 *    recalcula ancho/alto en vez de quedarse con las medidas del arranque.
 *  - `title` ya NO se pasa por cleanCategoryName por defecto: eso convertia
 *    "Recomendado para ti" en "Recomendado Para Ti" y borraba los emojis
 *    intencionales del Home. Las categorias que SI vienen del servidor deben
 *    pasar `sanitizeTitle`.
 */
import React, { useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { colors } from '../theme';
import { useResponsive } from '../utils/tv';
import FocusableButton from './FocusableButton';
import { cleanContentTitle, cleanCategoryName } from '../utils/labels';

const CURRENT_YEAR = new Date().getFullYear();

const cleanName = cleanContentTitle;

const getReleaseYear = (item) => {
  const raw = item?.raw || item || {};
  const candidates = [
    raw.year,
    raw.releaseDate,
    raw.release_date,
    raw.releasedate,
    raw.info?.year,
    raw.info?.releaseDate,
    raw.info?.release_date,
    raw.info?.releasedate,
  ];

  for (const value of candidates) {
    const match = String(value || '').match(/\b(19|20)\d{2}\b/);
    if (match) return parseInt(match[0], 10);
  }

  const text = `${raw.name || ''} ${raw.title || ''}`;
  const titleMatch = text.match(/\b(19|20)\d{2}\b/);
  return titleMatch ? parseInt(titleMatch[0], 10) : 0;
};

const isNewRelease = (item) => getReleaseYear(item) === CURRENT_YEAR;

const makeStyles = (layout, isTV, cardWidth, posterHeight, textHeight, focusPad) =>
  StyleSheet.create({
    container: { marginBottom: isTV ? 24 : 40, overflow: 'visible' },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: layout.horizontalPadding,
      marginBottom: 12,
    },
    headerText: { flex: 1, paddingRight: 12 },
    rowTitle: {
      color: colors.white,
      fontSize: isTV ? 19 : 20,
      lineHeight: isTV ? 24 : 26,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    rowSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    seeAllBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    seeAll: { color: colors.accentWarm || colors.accent, fontSize: isTV ? 14 : 13, fontWeight: '800' },
    flatList: { height: posterHeight + textHeight + focusPad * 2, overflow: 'visible' },
    list: { paddingHorizontal: layout.horizontalPadding, paddingTop: focusPad, paddingBottom: focusPad },
    card: {
      width: cardWidth,
      height: posterHeight + textHeight,
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 14,
      overflow: 'visible',
    },
    cardFocused: {
      borderColor: isTV ? '#9B5CFF' : colors.accentWarm || '#F6B63F',
      backgroundColor: isTV ? 'rgba(155,92,255,0.10)' : 'rgba(246,182,63,0.10)',
      transform: isTV ? [{ scale: 1.03 }] : undefined,
    },
    posterWrapper: {
      width: cardWidth,
      height: posterHeight,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    poster: { width: cardWidth, height: posterHeight, backgroundColor: colors.card },
    posterPlaceholder: {
      width: cardWidth,
      height: posterHeight,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    posterIcon: { fontSize: isTV ? 32 : 36 },
    estrenoBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: colors.danger || '#E50914',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    estrenoText: { color: '#fff', fontSize: isTV ? 10 : 8, fontWeight: '900', letterSpacing: 0.5 },
    liveBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(255,0,0,0.8)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    liveText: { color: colors.white, fontSize: isTV ? 11 : 9, fontWeight: 'bold' },
    favoriteBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: isTV ? 28 : 30,
      height: isTV ? 28 : 30,
      borderRadius: isTV ? 14 : 15,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    favoriteIcon: { color: colors.accentWarm || '#FFD700', fontSize: isTV ? 17 : 18, fontWeight: 'bold' },
    progressTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 5,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    progressBar: { height: 5, backgroundColor: colors.accentWarm || colors.primary },
    ratingBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      backgroundColor: 'rgba(0,0,0,0.72)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingBadgeText: { color: colors.accentWarm || '#FFD700', fontSize: isTV ? 12 : 10, fontWeight: '800' },
    textArea: { minHeight: textHeight, paddingTop: 7, paddingRight: 4, zIndex: 2 },
    cardTitle: {
      color: colors.white,
      fontSize: isTV ? 12 : 14,
      lineHeight: isTV ? 16 : 19,
      fontWeight: '800',
      textShadowColor: 'rgba(0,0,0,0.55)',
      textShadowRadius: 2,
    },
  });

function ContentRowCard({
  item,
  index,
  total,
  type,
  showFavoriteButton,
  isFavorite,
  onFavoritePress,
  showProgress,
  showEstrenoBadge,
  onPress,
  styles,
  cardWidth,
  gap,
  isTV,
}) {
  const raw = item.raw || item;
  const image = item.stream_icon || item.cover || raw.stream_icon || raw.cover || raw.info?.movie_image || item.poster || raw.poster;
  const name = cleanName(item.name || raw.name || raw.title || 'Sin nombre');
  const rating = item.rating || raw.rating;
  const favoriteType = item.type || type;
  const favActive = isFavorite(raw, favoriteType);
  const progress = item.progress || 0;
  const showEstreno = showEstrenoBadge && isNewRelease(item);
  const isLive = favoriteType === 'live';

  return (
    <FocusableButton
      style={[styles.card, { marginRight: index === total - 1 ? 0 : gap }]}
      focusedStyle={styles.cardFocused}
      trapFocusLeft={isTV && index === 0}
      trapFocusRight={isTV && index === total - 1}
      onPress={() => onPress(raw, item)}
      onLongPress={() => showFavoriteButton && onFavoritePress?.(raw, favoriteType)}
    >
      <View style={styles.posterWrapper}>
        {image ? (
          <Image source={{ uri: image }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterIcon}>
              {isLive ? '📺' : favoriteType === 'movie' ? '🎬' : '📡'}
            </Text>
          </View>
        )}

        {showEstreno && (
          <View style={styles.estrenoBadge}>
            <Text style={styles.estrenoText}>ESTRENO</Text>
          </View>
        )}

        {isLive && !showEstreno && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>● VIVO</Text>
          </View>
        )}

        {showFavoriteButton && (!isTV || favActive) && (
          <TouchableOpacity
            style={styles.favoriteBtn}
            focusable={false}
            accessible={false}
            isTVSelectable={false}
            onPress={(e) => {
              e.stopPropagation();
              onFavoritePress && onFavoritePress(raw, favoriteType);
            }}
          >
            <Text style={styles.favoriteIcon}>{favActive ? '★' : '☆'}</Text>
          </TouchableOpacity>
        )}

        {showProgress && progress > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
        )}

        {rating && rating !== '0' && !Number.isNaN(parseFloat(rating)) && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>★ {parseFloat(rating).toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.textArea}>
        <Text style={styles.cardTitle} numberOfLines={2}>{name}</Text>
      </View>
    </FocusableButton>
  );
}

export default function ContentRow({
  title,
  subtitle,
  data,
  onPress,
  type,
  sanitizeTitle = false,
  showFavoriteButton = false,
  isFavorite = () => false,
  onFavoritePress,
  showProgress = false,
  showEstrenoBadge = false,
  onSeeAll,
}) {
  const { layout, isTV } = useResponsive();

  const cardWidth = layout.posterWidth;
  const posterHeight = layout.posterHeight;
  const textHeight = isTV ? 58 : 86;
  const focusPad = isTV ? 20 : 18;

  const styles = useMemo(
    () => makeStyles(layout, isTV, cardWidth, posterHeight, textHeight, focusPad),
    [layout, isTV, cardWidth, posterHeight, textHeight, focusPad]
  );

  if (!data || data.length === 0) return null;

  const displayTitle = sanitizeTitle ? cleanCategoryName(title) : title;

  const renderItem = ({ item, index }) => (
    <ContentRowCard
      item={item}
      index={index}
      total={data.length}
      type={type}
      showFavoriteButton={showFavoriteButton}
      isFavorite={isFavorite}
      onFavoritePress={onFavoritePress}
      showProgress={showProgress}
      showEstrenoBadge={showEstrenoBadge}
      onPress={onPress}
      styles={styles}
      cardWidth={cardWidth}
      gap={layout.cardGap}
      isTV={isTV}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.rowTitle} numberOfLines={1}>{displayTitle}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
        {onSeeAll && (
          <FocusableButton style={styles.seeAllBtn} onPress={onSeeAll}>
            <Text style={styles.seeAll}>Ver todo</Text>
          </FocusableButton>
        )}
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: cardWidth + layout.cardGap,
          offset: (cardWidth + layout.cardGap) * index,
          index,
        })}
        keyExtractor={(item, index) => {
          const raw = item.raw || item;
          const uid = item.id || raw.id || item.stream_id || raw.stream_id || item.series_id || raw.series_id || raw.name || raw.title || 'c';
          return `${item.type || type || 'row'}-${uid}-${index}`;
        }}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        initialNumToRender={isTV ? 10 : 6}
        maxToRenderPerBatch={isTV ? 12 : 8}
        windowSize={5}
        removeClippedSubviews={!isTV}
      />
    </View>
  );
}
