/**
 * kidsTimer.js — Control parental con límite de tiempo
 * Guarda el tiempo de uso diario del perfil Kids.
 * Al alcanzar el límite, bloquea el acceso hasta el día siguiente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMER_KEY = 'tvnueva_kids_timer';

const todayKey = () => {
  const d = new Date();
  return `${TIMER_KEY}_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
};

// Obtener minutos usados hoy
export const getUsedMinutes = async () => {
  try {
    const raw = await AsyncStorage.getItem(todayKey());
    return raw ? Number(raw) : 0;
  } catch (_) { return 0; }
};

// Agregar minutos usados
export const addUsedMinutes = async (minutes) => {
  try {
    const current = await getUsedMinutes();
    await AsyncStorage.setItem(todayKey(), String(current + minutes));
    return current + minutes;
  } catch (_) { return 0; }
};

// Verificar si excedió el límite
export const isTimeLimitExceeded = async (limitMinutes = 60) => {
  const used = await getUsedMinutes();
  return used >= limitMinutes;
};

// Resetear (cada día se resetea automáticamente por la key del día)
export const resetTimer = async () => {
  await AsyncStorage.setItem(todayKey(), '0').catch(() => {});
};

// Formatear tiempo restante
export const formatTimeLeft = (limitMinutes, usedMinutes) => {
  const left = Math.max(0, limitMinutes - usedMinutes);
  if (left === 0) return 'Sin tiempo restante hoy';
  if (left < 60) return `${left} min restantes hoy`;
  return `${Math.floor(left / 60)}h ${left % 60}m restantes hoy`;
};
