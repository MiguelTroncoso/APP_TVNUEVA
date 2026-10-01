import { Alert } from 'react-native';

export const MIN_RESUME_MILLIS = 2 * 60 * 1000;
export const FINISHED_PROGRESS_LIMIT = 0.9;

/**
 * legacyItemToMillis
 * Fallback de compatibilidad exclusivo para datos históricos que no poseen positionMillis explícito.
 */
const legacyItemToMillis = (item, field = 'position') => {
  if (!item) return 0;
  const rawValue = Number(item[field] || 0);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return 0;

  // Si tiene durationMillis o progress fiable, derivar matemáticamente
  const durMillis = Number(item.durationMillis || 0);
  const prog = Number(item.progress || 0);
  if (field === 'position' && durMillis > 0 && prog > 0 && prog <= 1) {
    return Math.floor(prog * durMillis);
  }

  const legacyDuration = Number(item.duration || 0);
  // Si la duración registrada está en segundos (ej. <= 36,000 = 10 horas)
  if (legacyDuration > 0 && legacyDuration <= 36000) {
    return Math.floor(rawValue * 1000);
  }

  return Math.floor(rawValue);
};

export const getResumePositionMillis = (resumeItem) => {
  if (!resumeItem) return 0;
  // Contrato canónico: LibraryContext almacena siempre positionMillis en milisegundos
  if (typeof resumeItem.positionMillis === 'number' && Number.isFinite(resumeItem.positionMillis) && resumeItem.positionMillis > 0) {
    return Math.floor(resumeItem.positionMillis);
  }
  return legacyItemToMillis(resumeItem, 'position');
};

export const getResumeDurationMillis = (resumeItem) => {
  if (!resumeItem) return 0;
  // Contrato canónico: LibraryContext almacena siempre durationMillis en milisegundos
  if (typeof resumeItem.durationMillis === 'number' && Number.isFinite(resumeItem.durationMillis) && resumeItem.durationMillis > 0) {
    return Math.floor(resumeItem.durationMillis);
  }
  return legacyItemToMillis(resumeItem, 'duration');
};

export const formatResumeClock = (millis = 0) => {
  const n = Number(millis || 0);
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(n) && n > 0 ? n : 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const shouldAskResume = (resumeItem) => {
  if (!resumeItem) return false;
  const positionMillis = getResumePositionMillis(resumeItem);
  const durationMillis = getResumeDurationMillis(resumeItem);
  if (positionMillis < MIN_RESUME_MILLIS) return false;
  if (durationMillis > 0) {
    const progress = positionMillis / durationMillis;
    // Si ya está prácticamente terminada (>= 90%), no forzamos continuar desde el final.
    if (progress >= FINISHED_PROGRESS_LIMIT) return false;
  }
  return true;
};

export const promptResumePlayback = ({ resumeItem, title = 'este contenido', onContinue, onRestart, onCancel }) => {
  if (!shouldAskResume(resumeItem)) {
    onRestart?.();
    return false;
  }

  const positionMillis = getResumePositionMillis(resumeItem);
  const time = formatResumeClock(positionMillis);

  Alert.alert(
    'Continuar viendo',
    `Ya habías empezado "${title}".\n\n¿Quieres continuar desde ${time} o comenzar desde el inicio?`,
    [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Desde el inicio', onPress: onRestart },
      { text: `Continuar (${time})`, onPress: onContinue },
    ],
    { cancelable: true, onDismiss: onCancel }
  );
  return true;
};
