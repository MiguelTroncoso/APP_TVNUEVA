import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Alert, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useLibrary } from '../context/LibraryContext';
import { useDownloads } from '../context/DownloadsContext';
import { colors } from '../theme';
import { checkForUpdates } from '../services/updater';
import { checkForNewContent } from '../services/notifications';
import { getVodStreams, getSeries, isAdultContent } from '../services/xtream';
import { getCache, saveCache, pickHomeHighlights } from '../services/contentCache';
import HeroCarousel from '../components/HeroCarousel';
import ContentRow from '../components/ContentRow';
import SportsRow from '../components/SportsRow';
import FocusableButton from '../components/FocusableButton';
import { getLiveStreamsAll } from '../services/providers';
import LiveNowRow from '../components/LiveNowRow';
import ContinueBanner from '../components/ContinueBanner';
import BrandLogo from '../components/BrandLogo';
import Screensaver, { useScreensaver } from '../components/Screensaver';
import { isTV, isTablet, layout } from '../utils/tv';
import versionInfo from '../../version.json';
import logger from '../utils/logger';
import { getRecentlyAdded } from '../utils/contentFilters';
import { getResumePositionMillis, promptResumePlayback, shouldAskResume } from '../utils/resumePlayback';

const CURRENT_YEAR = new Date().getFullYear();

const MAX_HOME_LIVE_CHANNELS = isTV ? 1500 : 900;

const QUICK_TABS = [
  { label: '🔥 Eventos',  icon: '🏆', screen: 'Events' },
  { label: '🔖 Ver después', icon: '🔖', screen: 'Watchlist' },
  { label: '🔍 Buscar',   icon: '🔍', screen: 'Search' },
  { label: '📅 EPG',      icon: '📅', screen: 'EPG' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/**
 * isNewRelease — estrenos reales del año actual.
 * No usamos `added`: ese campo es fecha de subida al panel y marcaba
 * películas antiguas como "Estrenos 2026".
 */
const isNewRelease = (item) => {
  return getReleaseYear(item) === CURRENT_YEAR;
};

const byRating = (a, b) => {
  const ra = parseFloat((a.raw || a).rating || 0);
  const rb = parseFloat((b.raw || b).rating || 0);
  return rb - ra;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation, route }) {
  const { user, server, signOut, checkSession } = useAuth();
  const { activeProfile, changeProfile } = useProfile();
  const { favorites, continueWatching, watchStats, isFavorite, toggleFavorite, getContinueWatchingItem } = useLibrary();
  const { downloads } = useDownloads();

  const [loading, setLoading]       = useState(true);
  const { screensaverActive, resetScreensaverTimer, dismissScreensaver } = useScreensaver();
  const [refreshing, setRefreshing] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [liveChannels, setLiveChannels] = useState([]);
  const [movies, setMovies]         = useState([]);
  const [series, setSeries]         = useState([]);
  const preferContentFocus = isTV && route?.params?.tvFocusTarget === 'content';

  useEffect(() => {
    loadContent();
    const t = setTimeout(() => checkForUpdates(true), 4000);
    // Verificar sesión cada vez que el home se monta.
    // El permiso de notificaciones NO se pide automaticamente: el usuario lo
    // activa desde Perfil -> Ajustes.
    const s = setTimeout(async () => {
      const result = await checkSession?.();
      if (result?.expired) {
        Alert.alert('Sesión expirada', result.message || 'Tu sesión ha expirado.');
      }
    }, 3000);
    return () => { clearTimeout(t); clearTimeout(s); };
  }, [activeProfile?.id]);

  const applyKidsFilter = (items = []) => {
    if (!activeProfile?.isKids) return items || [];
    return (items || []).filter(i => !isAdultContent(i.category_name || '', i.name || i.title || ''));
  };

  // ─── Secciones derivadas ──────────────────────────────────────────────────

  // Estrenos del año actual (movies + series)
  const movieEstrenos = useMemo(() =>
    movies.filter(isNewRelease).slice(0, 20),
    [movies]
  );
  const seriesEstrenos = useMemo(() =>
    series.filter(isNewRelease).slice(0, 20),
    [series]
  );

  // Mejor calificadas
  const topRatedMovies = useMemo(() =>
    [...movies].sort(byRating).filter(m => parseFloat((m.raw || m).rating || 0) >= 6).slice(0, 20),
    [movies]
  );

  const recentlyAddedMovies = useMemo(() => getRecentlyAdded(movies, 18, 14), [movies]);

  // Motor de recomendaciones: basado en géneros/categorías del historial
  const recommendedMovies = useMemo(() => {
    if (watchStats.length === 0 || movies.length === 0) return [];
    // Obtener categorías más vistas
    const catCount = {};
    watchStats.slice(0, 30).forEach(w => {
      const raw = w.raw || w;
      const cat = raw.category_id || raw.category_name;
      if (cat) catCount[cat] = (catCount[cat] || 0) + 1;
    });
    const topCats = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);
    if (topCats.length === 0) return [];
    // Filtrar películas de esas categorías que no están en continueWatching
    const cwIds = new Set(continueWatching.map(i => (i.raw || i).stream_id || (i.raw || i).name));
    return movies
      .filter(m => {
        const raw = m.raw || m;
        return topCats.some(cat => String(raw.category_id) === String(cat) || raw.category_name === cat)
               && !cwIds.has(raw.stream_id || raw.name);
      })
      .slice(0, 20);
  }, [watchStats, movies, continueWatching]);
  const recentlyAddedSeries = useMemo(() => getRecentlyAdded(series, 18, 14), [series]);

  // Recomendaciones "Porque viste X..."
  // Toma el último visto y busca contenido de la misma categoría
  const lastWatched = continueWatching?.[0];
  const becauseYouWatched = useMemo(() => {
    if (!lastWatched) return [];
    const raw = lastWatched.raw || lastWatched;
    const cat = raw.category_name || raw.category_id;
    if (!cat) return [];
    const pool = [...movies, ...series];
    return pool
      .filter(i => {
        const r = i.raw || i;
        return (r.category_name === cat || r.category_id === cat) &&
               r.name !== raw.name;
      })
      .slice(0, 15);
  }, [lastWatched, movies, series]);

  // Items para el carrusel hero — siempre 6-8 items
  const heroItems = useMemo(() => {
    const used = new Set();
    const add = (arr, limit) => {
      const result = [];
      for (const item of arr) {
        if (result.length >= limit) break;
        const id = (item?.raw || item)?.stream_id || (item?.raw || item)?.series_id || (item?.raw || item)?.name;
        if (!id || used.has(id)) continue;
        used.add(id);
        result.push(item);
      }
      return result;
    };

    const pool = [
      ...add(movieEstrenos, 4),
      ...add(seriesEstrenos, 2),
      ...add(topRatedMovies, 3),
    ];

    // Si no llegamos a 6, completar con cualquier película disponible
    if (pool.length < 6 && movies.length > 0) {
      pool.push(...add(movies, 8 - pool.length));
    }
    // Si no llegamos a 6 con series tampoco, completar con series
    if (pool.length < 6 && series.length > 0) {
      pool.push(...add(series, 8 - pool.length));
    }

    return pool.slice(0, 8);
  }, [movieEstrenos, seriesEstrenos, topRatedMovies, movies, series]);

  const heroTypes = useMemo(() =>
    heroItems.map(item =>
      movies.includes(item) || movieEstrenos.includes(item) ? 'movie' : 'series'
    ),
    [heroItems, movies, movieEstrenos]
  );

  // Favoritos en vivo y canales recientes (Inicio estilo TIVRA)
  const favoriteChannels = useMemo(() =>
    favorites.filter(f => f.type === 'live').map(f => f.raw || f).filter(c => c.stream_id),
    [favorites]
  );
  const recentChannels = useMemo(() => {
    const byId = new Map(liveChannels.map(c => [`live-${c.provider === 'p2' ? 'p2-' : ''}${c.stream_id}`, c]));
    const seen = new Set();
    const out = [];
    for (const row of watchStats) {
      if (row.type !== 'live' || seen.has(row.itemId)) continue;
      seen.add(row.itemId);
      const ch = byId.get(String(row.itemId));
      if (ch) out.push(ch);
      if (out.length >= 12) break;
    }
    return out;
  }, [watchStats, liveChannels]);
  const epgAuth = useMemo(() => ({ server: server.url, username: user.username, password: user.password }), [server.url, user.username, user.password]);
  const playLive = useCallback((stream) => playWithResumePrompt(stream, 'live'), [playWithResumePrompt]);

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const applyHomeData = (live = [], vod = [], ser = [], fromCache = false) => {
    setLiveChannels(applyKidsFilter(live).slice(0, MAX_HOME_LIVE_CHANNELS));
    setMovies(pickHomeHighlights(applyKidsFilter(vod), 'movie', isTV ? 60 : 40));
    setSeries(pickHomeHighlights(applyKidsFilter(ser), 'series', isTV ? 60 : 40));
    setUsingCache(fromCache);
  };

  const loadCachedContent = async () => {
    const [liveCache, movieCache, seriesCache] = await Promise.all([
      getCache(server.url, user.username, 'home_live'),
      getCache(server.url, user.username, 'home_movies'),
      getCache(server.url, user.username, 'home_series'),
    ]);
    const hasCache = liveCache?.data?.length || movieCache?.data?.length || seriesCache?.data?.length;
    if (hasCache) {
      applyHomeData(liveCache?.data || [], movieCache?.data || [], seriesCache?.data || [], true);
      setLoading(false);
      const liveCacheLooksLimited = (liveCache?.data?.length || 0) < 80;
      return liveCache?.isFresh && movieCache?.isFresh && seriesCache?.isFresh && !liveCacheLooksLimited;
    }
    return false;
  };

  const loadContent = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cacheFresh = await loadCachedContent();
        if (cacheFresh) return;
      } else {
        setRefreshing(true);
      }

      const hasContent = liveChannels.length || movies.length || series.length;
      if (!hasContent) setLoading(true);

      const fetchLive = getLiveStreamsAll(server.url, user.username, user.password)
        .then(data => {
          const liveData = applyKidsFilter(data).slice(0, MAX_HOME_LIVE_CHANNELS);
          setLiveChannels(liveData);
          setLoading(false);
          saveCache(server.url, user.username, 'home_live', 'all', liveData);
          return liveData;
        }).catch(e => { logger.log('Error live:', e); return []; });

      const fetchMovies = getVodStreams(server.url, user.username, user.password)
        .then(data => {
          const compact = pickHomeHighlights(applyKidsFilter(data), 'movie', 80);
          setMovies(compact);
          setLoading(false);
          saveCache(server.url, user.username, 'home_movies', 'all', compact);
          return compact;
        }).catch(e => { logger.log('Error movies:', e); return []; });

      const fetchSeries = getSeries(server.url, user.username, user.password)
        .then(data => {
          const compact = pickHomeHighlights(applyKidsFilter(data), 'series', 80);
          setSeries(compact);
          setLoading(false);
          saveCache(server.url, user.username, 'home_series', 'all', compact);
          return compact;
        }).catch(e => { logger.log('Error series:', e); return []; });

      const [, movieData, seriesData] = await Promise.all([fetchLive, fetchMovies, fetchSeries]);
      setUsingCache(false);
      // Verificar nuevo contenido con los datos recién descargados, no con el state viejo.
      checkForNewContent(movieData, seriesData).catch(() => {});
    } catch (e) {
      logger.log('Error cargando contenido:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChangeProfile = () => {
    changeProfile(); // el navegador muestra la selección de perfil solo
  };

  const playWithResumePrompt = useCallback((stream, type = 'movie', options = {}) => {
    const { resumeItem: forcedResumeItem, ...playerOptions } = options;
    if (type === 'live') {
      navigation.navigate('Player', { stream, type, returnRoute: 'MainTabs', ...playerOptions });
      return;
    }

    const resumeItem = forcedResumeItem || getContinueWatchingItem(stream, type);
    const offlineUri = playerOptions.offlineUri || resumeItem?.fileUri || resumeItem?.offlineUri || null;
    const title = stream?.name || stream?.title || resumeItem?.name || 'este contenido';

    const openPlayer = (resumePosition = 0) => {
      navigation.navigate('Player', {
        stream,
        type,
        resumePosition,
        offlineUri,
        offlineMode: Boolean(offlineUri),
        returnRoute: 'MainTabs',
        ...playerOptions,
      });
    };

    if (shouldAskResume(resumeItem)) {
      promptResumePlayback({
        resumeItem,
        title,
        onContinue: () => openPlayer(getResumePositionMillis(resumeItem)),
        onRestart: () => openPlayer(0),
      });
      return;
    }

    openPlayer(0);
  }, [getContinueWatchingItem, navigation]);

  const goToLibraryItem = useCallback((raw, libraryItem) => {
    const item = libraryItem || raw;
    const type = item.type || 'movie';
    const stream = item.raw || raw;
    if (type === 'series' && stream.series_id && !stream.stream_id) {
      navigation.navigate('SeriesDetail', { serie: stream });
      return;
    }
    if (item.positionMillis > 0 || item.fileUri || item.offlineUri) {
      playWithResumePrompt(stream, type, {
        resumeItem: item,
        offlineUri: item.fileUri || item.offlineUri || null,
      });
    } else if (type === 'movie') {
      navigation.navigate('MovieDetail', { stream, type });
    } else {
      playWithResumePrompt(stream, type);
    }
  }, [navigation, playWithResumePrompt]);

  const handleHeroPlay = useCallback((item, type) => {
    if (type === 'series') navigation.navigate('SeriesDetail', { serie: item });
    else playWithResumePrompt(item, type || 'movie');
  }, [navigation, playWithResumePrompt]);

  const handleHeroInfo = useCallback((item, type) => {
    if (type === 'series') navigation.navigate('SeriesDetail', { serie: item });
    else if (type === 'movie') navigation.navigate('MovieDetail', { stream: item, type });
    else navigation.navigate('Player', { stream: item, type, returnRoute: 'MainTabs' });
  }, [navigation]);

  const expirationDate = user?.expiration_date
    ? new Date(parseInt(user.expiration_date) * 1000).toLocaleDateString('es-ES')
    : 'Sin fecha';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Cargando TV Nueva...</Text>
        <Text style={styles.loadingSubText}>Optimizando contenido para tu dispositivo</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadContent(true)}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── HEADER ── */}
        {!isTV && (
        <View style={styles.header}>
          <BrandLogo variant="nav" style={styles.logo} />
          <View style={styles.headerRight}>
            <FocusableButton style={styles.profilePill} onPress={handleChangeProfile}>
              <Text style={styles.profileAvatar}>{activeProfile?.avatar || '👤'}</Text>
              <Text style={styles.profileName} numberOfLines={1}>{activeProfile?.name || 'Perfil'}</Text>
            </FocusableButton>
            <FocusableButton style={styles.searchBtn} onPress={() => navigation.navigate('Search')}>
              <Text style={styles.searchBtnText}>🔍</Text>
            </FocusableButton>

            <FocusableButton onPress={() => navigation.navigate('Servers')} style={styles.serversBtn}>
              <Text style={styles.serversBtnText}>👤</Text>
            </FocusableButton>
            <FocusableButton onPress={signOut} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Salir</Text>
            </FocusableButton>
          </View>
        </View>
        )}

        {/* ── HERO CARRUSEL ── */}
        {isTV ? (
          <ContinueBanner item={continueWatching[0]} onPress={goToLibraryItem} hasTVPreferredFocus={preferContentFocus} />
        ) : heroItems.length > 0 ? (
          <HeroCarousel
            items={heroItems}
            types={heroTypes}
            onPlay={handleHeroPlay}
            onInfo={handleHeroInfo}
            hasTVPreferredFocus={preferContentFocus}
          />
        ) : movies.length > 0 ? (
          <HeroCarousel
            items={movies.slice(0, 6)}
            types={movies.slice(0, 6).map(() => 'movie')}
            onPlay={handleHeroPlay}
            onInfo={handleHeroInfo}
            hasTVPreferredFocus={preferContentFocus}
          />
        ) : null}

        {/* ── ACCESOS RÁPIDOS (complementan los tabs) ── */}
        {!isTV && <View style={styles.navTabs}>
          {QUICK_TABS.map((tab, index) => (
            <FocusableButton
              key={tab.screen}
              style={styles.navTab}
              focusedStyle={styles.navTabFocused}
              trapFocusLeft={isTV && index === 0}
              trapFocusRight={isTV && index === QUICK_TABS.length - 1}
              onPress={() => navigation.navigate(tab.screen)}
            >
              <Text style={styles.navTabIcon}>{tab.icon}</Text>
              <Text style={styles.navTabText} numberOfLines={1}>{tab.label}</Text>
            </FocusableButton>
          ))}
        </View>}

        {/* ── CONTINUAR + EN VIVO ── */}
        <ContentRow
          title="▶ Continuar viendo"
          data={continueWatching}
          type="movie"
          showProgress
          onSeeAll={() => navigation.navigate('ContinueWatching')}
          onPress={goToLibraryItem}
        />
        <LiveNowRow title="Ahora en favoritos" channels={favoriteChannels} auth={epgAuth} onPress={playLive} />
        <LiveNowRow title="Canales recientes" channels={recentChannels} auth={epgAuth} onPress={playLive} />

        {/* ── DEPORTES ── */}
        <SportsRow navigation={navigation} liveChannels={liveChannels} />

        {/* ── RECOMENDACIONES ── */}
        {recommendedMovies.length > 0 && (
          <ContentRow
            title="⭐ Recomendado para ti"
            subtitle="Basado en lo que ves"
            data={recommendedMovies}
            type="movie"
            showEstrenoBadge
            onPress={(item) => navigation.navigate('MovieDetail', { stream: item, type: 'movie' })}
          />
        )}

        {/* ── RECIÉN AGREGADOS ── */}
        {recentlyAddedMovies.length > 0 && (
          <ContentRow
            title="🆕 Recién agregadas"
            subtitle="Lo último subido al servidor"
            data={recentlyAddedMovies}
            type="movie"
            showEstrenoBadge
            showFavoriteButton
            isFavorite={isFavorite}
            onFavoritePress={toggleFavorite}
            onPress={(item) => navigation.navigate('MovieDetail', { stream: item, type: 'movie' })}
            onSeeAll={() => navigation.navigate('Movies')}
          />
        )}

        {recentlyAddedSeries.length > 0 && (
          <ContentRow
            title="🆕 Series recién agregadas"
            subtitle="Nuevas cargas del servidor"
            data={recentlyAddedSeries}
            type="series"
            showEstrenoBadge
            showFavoriteButton
            isFavorite={isFavorite}
            onFavoritePress={toggleFavorite}
            onPress={(item) => navigation.navigate('SeriesDetail', { serie: item })}
            onSeeAll={() => navigation.navigate('Series')}
          />
        )}

        {/* ── ESTRENOS PELÍCULAS ── */}
        {movieEstrenos.length > 0 && (
          <ContentRow
            title={`🎬 Estrenos ${CURRENT_YEAR}`}
            subtitle="Películas de este año"
            data={movieEstrenos}
            type="movie"
            showEstrenoBadge
            showFavoriteButton
            isFavorite={isFavorite}
            onFavoritePress={toggleFavorite}
            onPress={(item) => navigation.navigate('MovieDetail', { stream: item, type: 'movie' })}
            onSeeAll={() => navigation.navigate('Movies')}
          />
        )}

        {/* ── ESTRENOS SERIES ── */}
        {seriesEstrenos.length > 0 && (
          <ContentRow
            title={`📡 Series ${CURRENT_YEAR}`}
            subtitle="Series estrenadas este año"
            data={seriesEstrenos}
            type="series"
            showEstrenoBadge
            showFavoriteButton
            isFavorite={isFavorite}
            onFavoritePress={toggleFavorite}
            onPress={(item) => navigation.navigate('SeriesDetail', { serie: item })}
            onSeeAll={() => navigation.navigate('Series')}
          />
        )}

        {/* ── MEJOR CALIFICADAS ── */}
        {topRatedMovies.length > 0 && (
          <ContentRow
            title="⭐ Las mejor calificadas"
            subtitle="Top valoradas por audiencia"
            data={topRatedMovies}
            type="movie"
            showFavoriteButton
            isFavorite={isFavorite}
            onFavoritePress={toggleFavorite}
            onPress={(item) => navigation.navigate('MovieDetail', { stream: item, type: 'movie' })}
            onSeeAll={() => navigation.navigate('Movies')}
          />
        )}

        {/* ── PORQUE VISTE X ── */}
        {becauseYouWatched.length > 0 && lastWatched && (
          <ContentRow
            title={`Porque viste ${(lastWatched.raw || lastWatched).name || ''}`}
            subtitle="Contenido similar"
            data={becauseYouWatched}
            type="movie"
            showFavoriteButton
            isFavorite={isFavorite}
            onFavoritePress={toggleFavorite}
            onPress={(item) => {
              const raw = item.raw || item;
              if (raw.series_id && !raw.stream_id) navigation.navigate('SeriesDetail', { serie: raw });
              else navigation.navigate('MovieDetail', { stream: raw, type: 'movie' });
            }}
          />
        )}

        {/* ── DESCARGAS OFFLINE ── */}
        <ContentRow
          title="⬇ Descargas offline"
          data={downloads.slice(0, isTV ? 30 : 20)}
          type="movie"
          onSeeAll={() => navigation.navigate('Downloads')}
          onPress={goToLibraryItem}
        />

        {/* ── FAVORITOS ── */}
        <ContentRow
          title="❤️ Mis favoritos"
          data={favorites.slice(0, isTV ? 30 : 20)}
          type="movie"
          onSeeAll={() => navigation.navigate('Favorites')}
          onPress={goToLibraryItem}
        />

        {/* ── TODAS LAS PELÍCULAS ── */}
        <ContentRow
          title="🎬 Películas destacadas"
          data={movies}
          type="movie"
          showFavoriteButton
          isFavorite={isFavorite}
          onFavoritePress={toggleFavorite}
          onPress={(item) => navigation.navigate('MovieDetail', { stream: item, type: 'movie' })}
          onSeeAll={() => navigation.navigate('Movies')}
        />

        {/* ── TODAS LAS SERIES ── */}
        <ContentRow
          title="📡 Series populares"
          data={series}
          type="series"
          showFavoriteButton
          isFavorite={isFavorite}
          onFavoritePress={toggleFavorite}
          onPress={(item) => navigation.navigate('SeriesDetail', { serie: item })}
          onSeeAll={() => navigation.navigate('Series')}
        />

        {/* ── INFO CUENTA ── */}
        <View style={styles.userCard}>
          <Text style={styles.userCardTitle}>Mi cuenta</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeLabel}>Usuario</Text>
              <Text style={styles.infoBadgeValue}>{user?.username}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeLabel}>Perfil</Text>
              <Text style={styles.infoBadgeValue}>{activeProfile?.isKids ? 'Kids' : 'Adulto'}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeLabel}>Vence</Text>
              <Text style={styles.infoBadgeValue}>{expirationDate}</Text>
            </View>
          </View>
        </View>

        <FocusableButton style={styles.updateBtn} onPress={() => checkForUpdates(false)}>
          <Text style={styles.updateBtnText}>🔄 Buscar actualizaciones</Text>
        </FocusableButton>

        <Text style={styles.versionText}>
          TV Nueva v{versionInfo.version} · {isTV ? 'Modo TV' : 'Modo móvil'}
        </Text>
      </ScrollView>
      {screensaverActive && (
        <Screensaver onDismiss={() => { dismissScreensaver(); resetScreensaverTimer(); }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: colors.white, fontSize: isTV ? 24 : 14, fontWeight: 'bold' },
  loadingSubText: { color: colors.textSecondary, fontSize: isTV ? 16 : 12 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: layout.horizontalPadding,
    paddingTop: isTV ? 26 : 10, paddingBottom: isTV ? 22 : 14,
    gap: isTV ? 16 : 8,
  },
  logo: { flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: isTV ? 16 : 7, flexShrink: 0, maxWidth: isTV ? '58%' : '54%' },
  profilePill: {
    maxWidth: isTV ? 220 : 112, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: colors.accentWarm || colors.primary,
    borderRadius: 999, paddingHorizontal: isTV ? 10 : 8, paddingVertical: isTV ? 6 : 5,
  },
  profileAvatar: { fontSize: isTV ? 24 : 15 },
  profileName: { color: colors.white, fontSize: isTV ? 16 : 10, fontWeight: '600' },
  searchBtn: { padding: isTV ? 12 : 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  searchBtnText: { fontSize: isTV ? 28 : 18 },
  serversBtn: { padding: isTV ? 12 : 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)' },
  serversBtnText: { fontSize: isTV ? 22 : 15 },
  logoutBtn: { borderWidth: 1, borderColor: colors.accentWarm || colors.primary, paddingHorizontal: isTV ? 20 : 10, paddingVertical: isTV ? 10 : 5, borderRadius: 8 },
  logoutText: { color: colors.textSecondary, fontSize: isTV ? 17 : 11, fontWeight: '800' },

  navTabs: {
    flexDirection: 'row',
    paddingHorizontal: layout.horizontalPadding,
    gap: isTV ? 10 : 8,
    marginTop: isTV ? 12 : 14,
    marginBottom: isTV ? 22 : 20,
  },
  navTab: { flex: 1, backgroundColor: colors.surfaceElevated || colors.card, borderRadius: 12, paddingVertical: isTV ? 10 : 13, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', gap: 4 },
  navTabFocused: { borderColor: '#9B5CFF', backgroundColor: 'rgba(155,92,255,0.16)' },
  navTabIcon: { fontSize: isTV ? 18 : isTablet ? 22 : 18 },
  navTabText: { color: colors.white, fontSize: isTV ? 11 : isTablet ? 12 : 10, fontWeight: '900' },

  userCard: { marginHorizontal: layout.horizontalPadding, marginVertical: 16, backgroundColor: colors.card, borderRadius: 16, padding: isTV ? 22 : 16, borderWidth: 1, borderColor: '#2a2a3a' },
  userCardTitle: { color: colors.white, fontSize: isTV ? 20 : 14, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoBadge: { flex: 1, backgroundColor: '#0f0f14', borderRadius: 10, padding: isTV ? 15 : 10, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3a' },
  infoBadgeLabel: { color: colors.accent, fontSize: isTV ? 12 : 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  infoBadgeValue: { color: colors.white, fontSize: isTV ? 16 : 11, fontWeight: '600' },

  updateBtn: { marginHorizontal: layout.horizontalPadding, marginTop: 4, backgroundColor: colors.card, borderRadius: 12, padding: isTV ? 18 : 14, alignItems: 'center', borderWidth: 1, borderColor: colors.accentWarm || colors.primary },
  updateBtnText: { color: colors.primary, fontWeight: '600', fontSize: isTV ? 17 : 13 },
  versionText: { color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: 12, marginBottom: 30, fontSize: isTV ? 14 : 12 },
});
