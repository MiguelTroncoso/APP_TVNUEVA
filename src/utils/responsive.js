/**
 * responsive.js - Layout reactivo para Super Flash
 *
 * Antes, src/utils/tv.js calculaba columnas, tamano de poster y tipografias
 * UNA sola vez al arrancar la app, leyendo Dimensions.get('window').
 * Eso rompia la adaptacion real: al girar el celular, al redimensionar la
 * ventana del emulador o al rotar una tablet, la UI quedaba con las medidas
 * del arranque.
 *
 * Este modulo expone:
 *   - detectDeviceType(width, height)  -> 'phone' | 'tablet' | 'tv'
 *   - buildLayout(width, height, type) -> medidas coherentes entre si
 *   - useResponsive()                  -> hook reactivo (useWindowDimensions)
 *
 * Reglas de deteccion:
 *   - TV: Platform.isTV (build con react-native-tvos / LEANBACK) o, como
 *     respaldo para equipos sideloaded, Android con ancho >= 1280, aspect >= 1.7
 *     y alto <= 720. El respaldo exige las TRES condiciones para no confundir
 *     una tablet de 10" en horizontal (1280x800, aspect 1.6) con un televisor.
 *   - Tablet: lado menor >= 600 dp (estandar Android sw600dp).
 *   - Phone: el resto.
 */
import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export const DEVICE_PHONE = 'phone';
export const DEVICE_TABLET = 'tablet';
export const DEVICE_TV = 'tv';

const TV_FALLBACK_MIN_WIDTH = 1280;
const TV_FALLBACK_MIN_ASPECT = 1.7;
const TABLET_MIN_SIDE = 600;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const detectDeviceType = (width, height) => {
  const w = Math.max(1, Math.round(Number(width) || 0));
  const h = Math.max(1, Math.round(Number(height) || 0));
  const aspect = w / h;

  if (Platform.isTV === true) return DEVICE_TV;

  if (
    Platform.OS === 'android' &&
    w >= TV_FALLBACK_MIN_WIDTH &&
    aspect >= TV_FALLBACK_MIN_ASPECT &&
    h <= 720
  ) {
    return DEVICE_TV;
  }

  if (Math.min(w, h) >= TABLET_MIN_SIDE) return DEVICE_TABLET;
  return DEVICE_PHONE;
};

export const buildLayout = (width, height, deviceType = DEVICE_PHONE) => {
  const w = Math.max(1, Math.round(Number(width) || 0));
  const h = Math.max(1, Math.round(Number(height) || 0));
  const shortest = Math.min(w, h);
  const isTV = deviceType === DEVICE_TV;
  const isTablet = deviceType === DEVICE_TABLET;

  const horizontalPadding = isTV
    ? clamp(Math.round(w * 0.021), 22, 46)
    : isTablet
    ? clamp(Math.round(w * 0.03), 20, 40)
    : clamp(Math.round(w * 0.042), 12, 22);

  const cardGap = isTV ? 14 : isTablet ? 13 : clamp(Math.round(w * 0.024), 8, 12);

  // Poster de las filas horizontales: se calcula desde el ancho real de la
  // pantalla, asi en un celular de 320 dp entran ~2.5 tarjetas y en una TV
  // de 1920 dp entran ~9.
  let posterWidth;
  if (isTV) posterWidth = clamp(Math.round(w * 0.078), 130, 210);
  else if (isTablet) posterWidth = clamp(Math.round(shortest * 0.19), 132, 200);
  else posterWidth = clamp(Math.round(w * 0.345), 118, 168);

  const posterHeight = Math.round(posterWidth * 1.44);

  let gridColumns;
  if (isTV) gridColumns = clamp(Math.round(w / 240), 5, 9);
  else if (isTablet) gridColumns = clamp(Math.round(shortest / 190), 3, 6);
  else gridColumns = w >= 340 ? 3 : 2;

  const gridGap = isTV ? 14 : 12;
  const gridCardWidth = Math.max(
    72,
    Math.floor((w - horizontalPadding * 2 - gridGap * (gridColumns - 1)) / gridColumns)
  );
  const gridCardHeight = Math.round(gridCardWidth * 1.45);

  const base = isTV ? 1.15 : isTablet ? 1.08 : 1;

  return {
    width: w,
    height: h,
    shortestSide: shortest,
    isPortrait: h > w,
    isLandscape: w > h,
    deviceType,
    horizontalPadding,
    cardGap,
    posterWidth,
    posterHeight,
    gridColumns,
    gridGap,
    gridCardWidth,
    gridCardHeight,
    minTouchTarget: isTV ? 52 : isTablet ? 48 : 44,
    heroHeightRatio: isTV ? 0.72 : isTablet ? 0.5 : h > w ? 0.52 : 0.62,
    fontSize: {
      xs: Math.round(11 * base),
      sm: Math.round(12.5 * base),
      base: Math.round(14 * base),
      lg: Math.round(17 * base),
      xl: Math.round(20 * base),
      xxl: Math.round(24 * base),
    },
  };
};

/** Snapshot completo a partir de un ancho/alto dados. */
export const getResponsiveSnapshot = (width, height) => {
  const deviceType = detectDeviceType(width, height);
  return {
    width: Math.max(1, Math.round(Number(width) || 0)),
    height: Math.max(1, Math.round(Number(height) || 0)),
    deviceType,
    isTV: deviceType === DEVICE_TV,
    isTablet: deviceType === DEVICE_TABLET,
    isPhone: deviceType === DEVICE_PHONE,
    isLargeScreen: deviceType !== DEVICE_PHONE,
    layout: buildLayout(width, height, deviceType),
  };
};

// Hook reactivo: se recalcula cuando cambia el tamano de la ventana, la
// orientacion, o cuando el emulador cambia de resolucion.
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getResponsiveSnapshot(width, height), [width, height]);
}

export default useResponsive;
