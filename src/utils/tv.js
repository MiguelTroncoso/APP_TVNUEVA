/**
 * tv.js - Deteccion de plataforma y layout base (compatibilidad)
 *
 * El calculo real del layout vive ahora en src/utils/responsive.js, que es
 * reactivo. Este modulo mantiene la API historica (isTV, isTablet, layout)
 * para no romper las pantallas que ya la importan, pero la deteccion de
 * dispositivo ahora es compartida y coherente en toda la app.
 *
 * Para codigo nuevo usar useResponsive(): devuelve medidas frescas cuando
 * cambia el tamano de pantalla o la orientacion.
 */
import { Dimensions } from 'react-native';
import { buildLayout, detectDeviceType, useResponsive } from './responsive';

const { width: W, height: H } = Dimensions.get('window');
const deviceType = detectDeviceType(W, H);

export const isTV = deviceType === 'tv';
export const isTablet = deviceType === 'tablet';
export const isPhone = deviceType === 'phone';
export const isLargeScreen = isTV || isTablet;

// Snapshot inicial (no reactivo). Para medidas que deben cambiar al rotar,
// usar useResponsive().
export const layout = buildLayout(W, H, deviceType);

export { useResponsive };
export { DEVICE_PHONE, DEVICE_TABLET, DEVICE_TV } from './responsive';
