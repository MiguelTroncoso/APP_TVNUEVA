/**
 * providers.js - segundo proveedor Xtream (inglés + español) y categorías ocultas.
 *
 * El proveedor principal sigue siendo el de AuthContext. El secundario aporta
 * solo canales en vivo, que se mezclan con los del principal. Cada canal del
 * secundario lleva `provider: 'p2'` y su category_id con prefijo `p2_` para no
 * chocar con los ids del principal.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { login, getLiveStreams, getLiveCategories } from './xtream';
import logger from '../utils/logger';

const P2_KEY = 'tvnueva_provider2';
const P2_PASS_KEY = 'tvnueva_provider2_pass';
const HIDDEN_KEY = 'tvnueva_hidden_categories';
const P2_PREFIX = 'p2_';

let secondary = null;      // { url, username, password }
let hidden = new Set();    // category_id (string) ocultos

/** Cargar ajustes guardados. Llamar una vez al iniciar la app. */
export const initProviders = async () => {
  try {
    const raw = await AsyncStorage.getItem(P2_KEY);
    const pass = await SecureStore.getItemAsync(P2_PASS_KEY).catch(() => '');
    secondary = raw && pass ? { ...JSON.parse(raw), password: pass } : null;
    const h = await AsyncStorage.getItem(HIDDEN_KEY);
    hidden = new Set(h ? JSON.parse(h) : []);
  } catch (e) {
    logger.log('initProviders:', e?.message || e);
  }
};

export const getSecondary = () => secondary;

export const saveSecondary = async (url, username, password) => {
  const result = await login(url, username, password);
  if (!result.success) return result;
  await AsyncStorage.setItem(P2_KEY, JSON.stringify({ url, username }));
  await SecureStore.setItemAsync(P2_PASS_KEY, password);
  secondary = { url, username, password };
  return result;
};

export const clearSecondary = async () => {
  secondary = null;
  await AsyncStorage.removeItem(P2_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(P2_PASS_KEY).catch(() => {});
};

/** Credenciales del proveedor al que pertenece un canal. */
export const authFor = (stream, primary) =>
  stream?.provider === 'p2' && secondary
    ? { server: secondary.url, username: secondary.username, password: secondary.password }
    : primary;

// ─── Categorías ocultas ──────────────────────────────────────────────────────
export const isCategoryHidden = (id) => hidden.has(String(id));
export const getHiddenCategories = () => [...hidden];

export const setCategoryHidden = async (id, value) => {
  const next = new Set(hidden);
  if (value) next.add(String(id)); else next.delete(String(id));
  hidden = next;
  await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden])).catch(() => {});
};

// ─── Canales y categorías mezclados ──────────────────────────────────────────
const tagStreams = (list) => (Array.isArray(list) ? list : []).map(s => ({
  ...s, provider: 'p2', category_id: P2_PREFIX + s.category_id,
}));
const tagCategories = (list) => (Array.isArray(list) ? list : []).map(c => ({
  ...c, category_id: P2_PREFIX + c.category_id,
}));

/** Misma firma que getLiveStreams, pero mezcla el proveedor secundario. */
export const getLiveStreamsAll = async (server, username, password) => {
  const [a, b] = await Promise.allSettled([
    getLiveStreams(server, username, password),
    secondary ? getLiveStreams(secondary.url, secondary.username, secondary.password) : Promise.resolve([]),
  ]);
  if (a.status === 'rejected' && (!secondary || b.status === 'rejected')) throw a.reason;
  return [
    ...(a.status === 'fulfilled' && Array.isArray(a.value) ? a.value : []),
    ...(b.status === 'fulfilled' ? tagStreams(b.value) : []),
  ];
};

export const getLiveCategoriesAll = async (server, username, password) => {
  const [a, b] = await Promise.allSettled([
    getLiveCategories(server, username, password),
    secondary ? getLiveCategories(secondary.url, secondary.username, secondary.password) : Promise.resolve([]),
  ]);
  return [
    ...(a.status === 'fulfilled' && Array.isArray(a.value) ? a.value : []),
    ...(b.status === 'fulfilled' ? tagCategories(b.value) : []),
  ];
};
