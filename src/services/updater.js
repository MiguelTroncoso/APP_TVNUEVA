import * as FileSystem from 'expo-file-system/legacy';
import { Alert, AppState, Linking, Platform } from 'react-native';
import versionInfo from '../../version.json';
import logger from '../utils/logger';

const VERSION_CHECK_URL =
  'https://raw.githubusercontent.com/MiguelTroncoso/APP_TVNUEVA/main/version.json';

const APK_MIME = 'application/vnd.android.package-archive';
const ANDROID_ACTION_VIEW = 'android.intent.action.VIEW';
const ANDROID_ACTION_INSTALL_PACKAGE = 'android.intent.action.INSTALL_PACKAGE';
const ANDROID_UNKNOWN_SOURCES_SETTINGS = 'android.settings.MANAGE_UNKNOWN_APP_SOURCES';
const ANDROID_APPLICATION_DETAILS_SETTINGS = 'android.settings.APPLICATION_DETAILS_SETTINGS';
const APP_PACKAGE = 'com.migueltroncoso.tvnueva';

// Android intent flags
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;
const INSTALL_FLAGS = FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK;

let updateInProgress = false;
let lastDownloadedApkUri = null;
let appStateSubscription = null;

const normalizeVersion = (value) => String(value || '').trim().replace(/^v/i, '');
const safeFileVersion = (value) => normalizeVersion(value).replace(/[^0-9A-Za-z._-]/g, '_');

const getApkDirectory = () => `${FileSystem.documentDirectory || FileSystem.cacheDirectory}updates/`;
const getApkUri = (version) => `${getApkDirectory()}TVNueva-v${safeFileVersion(version)}.apk`;

const fetchWithTimeout = (url, ms = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return fetch(url, {
    signal: controller.signal,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  }).finally(() => clearTimeout(timer));
};

const getErrorMessage = (error) => {
  const msg = error?.message || error?.toString?.() || 'Error desconocido';
  return String(msg).replace(/\s+/g, ' ').slice(0, 240);
};

const validateRemoteManifest = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('version.json remoto vacío o inválido');
  }

  const remoteCode = Number(data.versionCode);
  if (!Number.isFinite(remoteCode) || remoteCode <= 0) {
    throw new Error('versionCode remoto inválido');
  }

  const updateUrl = String(data.updateUrl || '').trim();
  const lowerUrl = updateUrl.toLowerCase();

  const hasDownloadUrl =
    updateUrl.startsWith('https://') &&
    lowerUrl.includes('.apk') &&
    !updateUrl.includes('TU_USUARIO') &&
    !updateUrl.includes('TU_REPOSITORIO') &&
    !lowerUrl.includes('placeholder');

  return {
    ...data,
    version: normalizeVersion(data.version),
    versionCode: remoteCode,
    updateUrl,
    hasDownloadUrl,
    mandatory: Boolean(data.mandatory),
  };
};

const ensureUpdateDirectory = async () => {
  const dir = getApkDirectory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  return dir;
};

const cleanupOldApks = async (keepUri) => {
  try {
    const dir = await ensureUpdateDirectory();
    const files = await FileSystem.readDirectoryAsync(dir).catch(() => []);

    await Promise.all(
      files
        .filter((name) => /\.apk$/i.test(name))
        .map((name) => `${dir}${name}`)
        .filter((uri) => uri !== keepUri)
        .map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}))
    );
  } catch (_) {}
};

const getExistingApk = async (version) => {
  const localUri = getApkUri(version);
  const info = await FileSystem.getInfoAsync(localUri, { size: true }).catch(() => null);

  if (info?.exists && (info.size || 0) > 1024 * 1024) {
    return localUri;
  }

  return null;
};

const openInstallPermissionSettings = async () => {
  try {
    const IntentLauncher = await import('expo-intent-launcher');
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction?.MANAGE_UNKNOWN_APP_SOURCES || ANDROID_UNKNOWN_SOURCES_SETTINGS,
      { data: `package:${APP_PACKAGE}` }
    );
  } catch (error) {
    logger.log('No se pudo abrir permiso de instalación:', getErrorMessage(error));

    try {
      const IntentLauncher = await import('expo-intent-launcher');
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction?.APPLICATION_DETAILS_SETTINGS || ANDROID_APPLICATION_DETAILS_SETTINGS,
        { data: `package:${APP_PACKAGE}` }
      );
    } catch (_) {
      Linking.openSettings().catch(() => {});
    }
  }
};

const startAndroidInstaller = async (fileUri) => {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });

  if (!info?.exists) {
    throw new Error('El APK descargado ya no existe');
  }

  if ((info.size || 0) < 1024 * 1024) {
    throw new Error('El APK descargado está incompleto');
  }

  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  const IntentLauncher = await import('expo-intent-launcher');

  const params = {
    data: contentUri,
    type: APK_MIME,
    flags: INSTALL_FLAGS,
  };

  let lastError = null;

  for (const action of [ANDROID_ACTION_VIEW, ANDROID_ACTION_INSTALL_PACKAGE]) {
    try {
      await IntentLauncher.startActivityAsync(action, params);
      return true;
    } catch (error) {
      lastError = error;
      logger.log(`Falló instalador con ${action}:`, getErrorMessage(error));
    }
  }

  throw lastError || new Error('Android no encontró instalador para APK');
};

const askToInstallDownloadedApk = (fileUri) => {
  Alert.alert(
    '¿Instalar ahora?',
    'Si ya activaste el permiso, toca “Instalar”. No se descargará otra copia.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Instalar', onPress: () => retryInstall(fileUri) },
    ],
    { cancelable: true }
  );
};

const waitForReturnAndPromptInstall = (fileUri) => {
  let prompted = false;

  const removeListener = () => {
    if (appStateSubscription?.remove) {
      appStateSubscription.remove();
    }
    appStateSubscription = null;
  };

  const showPromptOnce = () => {
    if (prompted) return;
    prompted = true;
    removeListener();
    setTimeout(() => askToInstallDownloadedApk(fileUri), 500);
  };

  removeListener();

  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      showPromptOnce();
    }
  });

  // Fallback para equipos donde la pantalla de ajustes no cambia AppState correctamente.
  setTimeout(() => {
    if (AppState.currentState === 'active') {
      showPromptOnce();
    }
  }, 1500);
};

const promptInstallPermission = (fileUri) => {
  Alert.alert(
    '⚙️ Permiso requerido',
    'Android necesita que habilites “Instalar apps desconocidas” para TV Nueva.\n\nActiva el permiso y vuelve a la app para instalar la actualización ya descargada.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Ir a configuración',
        onPress: async () => {
          await openInstallPermissionSettings();
          waitForReturnAndPromptInstall(fileUri);
        },
      },
    ],
    { cancelable: true }
  );
};

const showInstallerError = (fileUri, error) => {
  Alert.alert(
    'No se pudo abrir el instalador',
    `La actualización quedó descargada, pero Android no abrió el instalador.\n\nDetalle: ${getErrorMessage(error)}`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Permiso', onPress: () => promptInstallPermission(fileUri) },
      { text: 'Reintentar', onPress: () => retryInstall(fileUri) },
    ],
    { cancelable: true }
  );
};

export const checkForUpdates = async (silent = false) => {
  try {
    const response = await fetchWithTimeout(`${VERSION_CHECK_URL}?t=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const remote = validateRemoteManifest(await response.json());
    const currentCode = Number(versionInfo.versionCode || 1);

    if (remote.versionCode <= currentCode) {
      if (!silent) {
        Alert.alert(
          '✓ TV Nueva actualizado',
          `Tienes la versión más reciente (v${versionInfo.version}).`
        );
      }
      return { upToDate: true };
    }

    const mensaje =
      `Nueva versión: v${remote.version}\n` +
      `Versión actual: v${versionInfo.version}\n\n` +
      (remote.changelog || 'Mejoras y correcciones.');

    const botones = remote.mandatory
      ? [
          {
            text: remote.hasDownloadUrl ? 'Actualizar ahora' : 'OK',
            onPress: remote.hasDownloadUrl ? () => downloadAndInstall(remote) : undefined,
          },
        ]
      : remote.hasDownloadUrl
        ? [
            { text: 'Después', style: 'cancel' },
            { text: 'Actualizar', onPress: () => downloadAndInstall(remote) },
          ]
        : [{ text: 'OK' }];

    Alert.alert('🚀 Actualización disponible', mensaje, botones, {
      cancelable: !remote.mandatory,
    });

    return { upToDate: false, version: remote.version };
  } catch (error) {
    const msg = error?.name === 'AbortError'
      ? 'Tiempo de espera agotado.'
      : getErrorMessage(error);

    logger.log('Error verificando actualizaciones:', msg);

    if (!silent) {
      Alert.alert('Sin conexión', `No se pudo verificar actualizaciones.\n${msg}`);
    }

    return { error: msg };
  }
};

const downloadAndInstall = async (data) => {
  if (!data?.hasDownloadUrl) {
    Alert.alert('Actualización inválida', 'El servidor no entregó una URL de descarga válida para la APK.');
    return;
  }

  if (Platform.OS === 'ios') {
    Linking.openURL(data.updateUrl).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace de actualización.')
    );
    return;
  }

  if (Platform.OS !== 'android') {
    Linking.openURL(data.updateUrl).catch(() => {});
    return;
  }

  if (updateInProgress) {
    Alert.alert(
      'Actualización en curso',
      'La descarga o instalación ya está en proceso. Espera unos segundos.'
    );
    return;
  }

  updateInProgress = true;

  try {
    await ensureUpdateDirectory();

    const existingUri = await getExistingApk(data.version);
    if (existingUri) {
      lastDownloadedApkUri = existingUri;
      Alert.alert(
        'APK ya descargado',
        `TV Nueva v${data.version} ya está descargado. ¿Quieres abrir el instalador ahora?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Instalar', onPress: () => retryInstall(existingUri) },
        ],
        { cancelable: true }
      );
      return;
    }

    const localUri = getApkUri(data.version);
    await cleanupOldApks(localUri);
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});

    Alert.alert(
      '⬇️ Descargando actualización',
      `Descargando TV Nueva v${data.version}…\n\nNo presiones varias veces el botón de actualizar.`
    );

    const task = FileSystem.createDownloadResumable(
      data.updateUrl,
      localUri,
      {
        headers: {
          'User-Agent': 'TVNueva-Updater/1.0',
          Accept: `${APK_MIME},application/octet-stream,*/*`,
        },
      },
      (progress) => {
        const expected = progress.totalBytesExpectedToWrite || 0;
        const written = progress.totalBytesWritten || 0;
        const pct = expected > 0 ? Math.round((written / expected) * 100) : 0;
        logger.log(`Descarga actualización: ${pct}%`);
      }
    );

    const result = await task.downloadAsync();
    if (!result?.uri) {
      throw new Error('Descarga incompleta');
    }

    const info = await FileSystem.getInfoAsync(result.uri, { size: true });
    if ((info.size || 0) < 1024 * 1024) {
      await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
      throw new Error('El archivo descargado es demasiado pequeño');
    }

    lastDownloadedApkUri = result.uri;

    try {
      await startAndroidInstaller(result.uri);
    } catch (installError) {
      logger.log('Error abriendo instalador:', getErrorMessage(installError));
      promptInstallPermission(result.uri);
    }
  } catch (error) {
    logger.log('Error descargando actualización:', getErrorMessage(error));
    Alert.alert(
      '❌ No se pudo descargar',
      `No se pudo descargar la actualización.\n\nDetalle: ${getErrorMessage(error)}`,
      [
        { text: 'OK' },
        { text: 'Abrir GitHub', onPress: () => Linking.openURL(data.updateUrl).catch(() => {}) },
      ]
    );
  } finally {
    updateInProgress = false;
  }
};

const retryInstall = async (localUri = lastDownloadedApkUri) => {
  if (!localUri) {
    Alert.alert('Sin APK descargado', 'Vuelve a presionar “Actualizar ahora” para descargar la actualización.');
    return;
  }

  try {
    await startAndroidInstaller(localUri);
  } catch (error) {
    logger.log('retryInstall error:', getErrorMessage(error));
    showInstallerError(localUri, error);
  }
};
