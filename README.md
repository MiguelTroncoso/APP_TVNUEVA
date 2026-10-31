# TV Nueva

App de streaming para panel IPTV (Xtream Codes), construida con **Expo SDK 54 +
React Native 0.81 (react-native-tvos)**. Interfaz estilo Netflix: hero
carousel, filas por categoria, grillas, perfiles, Kids, descargas offline,
EPG, eventos deportivos, favoritos, historial y "continuar viendo".

Este repositorio es la continuacion brandeada de **LinkPlay v1.0.40**. El
proyecto original queda intacto; aqui solo cambia la identidad (nombre, slug,
package, iconos, textos) y se aplican las correcciones de la auditoria.

---

## Dispositivos soportados

| Dispositivo | Soporte |
|---|---|
| Celulares Android (chico, mediano, grande, plegables) | Si, layout de 1-3 columnas y filas horizontales |
| Tablets Android (7", 8", 10", 12") en vertical y horizontal | Si, layout de 3-6 columnas |
| Android TV / Google TV / Fire TV | Si, navegacion con D-pad y foco nativo |
| Emuladores Android (cualquier resolucion) | Si, el layout se recalcula al redimensionar |
| iOS / iPadOS | Configurado, pero pensado para Android/TV |

La deteccion de dispositivo vive en `src/utils/responsive.js`:

- **TV**: `Platform.isTV` (build con LEANBACK) o, como respaldo, Android con
  ancho >= 1280, aspect >= 1.7 y alto <= 720. Las tres condiciones evitan que
  una tablet de 10" en horizontal (1280x800) se tome como televisor.
- **Tablet**: lado menor >= 600 dp (estandar Android `sw600dp`).
- **Phone**: el resto.

---

## Requisitos

- Node.js 20 o superior (probado con 24)
- npm 10 o superior
- `eas-cli` para compilar (`npm i -g eas-cli`)
- Cuenta Expo con acceso al proyecto EAS

## Comandos

```bash
npm install                 # dependencias (.npmrc usa legacy-peer-deps)
npx expo start -c           # Metro con cache limpia
npx expo start --android    # abrir en dispositivo/emulador Android
npx expo-doctor             # chequeo de salud del proyecto
```

## Compilar APK / AAB

```bash
# APK interno (incluye la variante TV con EXPO_TV=1)
eas build --platform android --profile preview

# AAB de produccion
eas build --platform android --profile production
```

`eas.json` define el perfil `preview` con `EXPO_TV=1` para que
`@react-native-tvos/config-tv` genere el manifiesto de Android TV
(`LEANBACK_LAUNCHER`) y el banner/icono de TV.

Si es la primera build en un equipo nuevo:

```bash
eas login
eas init        # vincula el proyecto y escribe extra.eas.projectId en app.json
```

---

## Actualizaciones de la app

`src/services/updater.js` revisa `version.json` remoto y, si hay una version
mayor, descarga el APK y abre el instalador de Android.

- Manifiesto remoto:
  `https://raw.githubusercontent.com/MiguelTroncoso/APP_TVNUEVA/main/version.json`
- APK: se publica como release en este mismo repositorio.

Para publicar una version nueva: subir `app.json` (`version` y `versionCode`),
`package.json` y `version.json`, compilar el APK y adjuntarlo al release con el
nombre `TVNueva-vX.Y.Z.apk` (debe coincidir con `updateUrl`).

---

## Estructura

```text
App.js                     Providers + Stack/Tab navigator
src/components/            ContentRow, HeroCarousel, FocusableButton, TVTopNav...
src/context/               Auth, Profile, Library, Downloads, Theme
src/screens/               Home, LiveTV, Movies, Series, Player, Perfiles...
src/services/              xtream, contentCache, updater, notifications, sports
src/utils/                 responsive, tv, navigation, labels, contentFilters
assets/                    Iconos adaptativos, splash, logo, banner de TV
docs/                      Documentacion y auditoria
legacy/                    Archivos sueltos heredados de LinkPlay (sin uso)
```

## Identidad de marca

Todos los assets de `assets/` fueron regenerados para Super Flash
(rayo + wordmark sobre degradado cian -> violeta):

| Archivo | Uso |
|---|---|
| `icon.png` | Icono de la app |
| `android-icon-foreground/background/monochrome.png` | Icono adaptativo de Android |
| `notification-icon.png` | Icono de notificaciones (blanco, obligatorio en Android) |
| `splash-icon.png` | Splash |
| `favicon.png` | Favicon (build web) |
| `brand-logo.png` | Logo dentro de la app (login, perfiles, barra superior) |
| `tv-icon.png` / `tv-banner.png` | Icono y banner de Android TV |

---

## Estado de la auditoria

Ver [`docs/AUDITORIA_SUPERFLASH.md`](docs/AUDITORIA_SUPERFLASH.md).

- `npx expo-doctor`: **18/18 checks OK**
- Parseo de los 54 archivos JS: **0 errores**
- Imports relativos: **257 revisados, 0 rotos**

## Notas de seguridad

- La app usa `usesCleartextTraffic: true` porque el panel (`superflash.ovh`)
  sirve por HTTP. Si el proveedor habilita HTTPS, conviene apagarlo.
- La contrasena del panel se guarda en `expo-secure-store` y, como respaldo,
  en base64 en `AsyncStorage`. El respaldo existe para equipos donde
  SecureStore falla; en base64 no es cifrado real. Ver auditoria.
- `npm audit` reporta 23 avisos (14 moderados, 9 altos) en dependencias
  transitivas de Expo. Revisar antes de publicar en tiendas.
