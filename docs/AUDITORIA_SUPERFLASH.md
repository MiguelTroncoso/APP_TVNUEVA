# Auditoria Super Flash v1.0.0

Base auditada: **LinkPlay v1.0.40** (arbol de trabajo, mas nuevo que el commit
v1.0.39 publicado en GitHub).

Alcance: 54 archivos JS/JSON, `app.json`, `eas.json`, `version.json`,
`package.json`, assets e iconos.

## Verificaciones ejecutadas

| Prueba | Resultado |
|---|---|
| Parseo JSX/JS de los 54 archivos | 0 errores |
| Imports relativos resueltos | 257 revisados, 0 rotos |
| `npx expo-doctor` | 18/18 checks OK |
| `npm audit` | 23 avisos (14 moderados, 9 altos) en dependencias transitivas |
| Build EAS real | **No ejecutado en este entorno** |
| Prueba en Android TV / Fire TV fisico | **No ejecutado** |

---

## Criticos (corregidos)

### 1. El layout nunca se adaptaba a la pantalla real

`src/utils/tv.js` calculaba columnas, poster y tipografias **una sola vez** al
arrancar, leyendo `Dimensions.get('window')`. Todo el resto de la app
importaba ese objeto estatico.

Consecuencia: al girar el celular, al redimensionar la ventana del emulador o
al rotar una tablet, la UI mantenia las medidas del arranque. En un emulador
que cambia de resolucion en caliente, quedaba desalineada.

**Correccion:** nuevo modulo `src/utils/responsive.js` con
`detectDeviceType()`, `buildLayout()` y el hook `useResponsive()`.
`ContentRow`, `MoviesScreen`, `SeriesScreen` y sus `GridCard` ahora recalculan
medidas con el hook. `src/utils/tv.js` mantiene la API vieja para no romper el
resto de las pantallas.

### 2. Una tablet de 10" se detectaba como televisor

La regla anterior era:

```js
isTV = platformIsTV || (W >= 960 && aspect >= 1.6 && H <= 720)
                 || (Platform.OS === 'android' && W >= 1280 && aspect >= 1.6);
```

Una tablet 1280x800 en horizontal tiene `aspect = 1.6`, por lo que entraba en
la segunda condicion: la app cargaba el layout de TV (sin tab bar, foco de
D-pad) en una tablet.

**Correccion:** el respaldo exige ahora `aspect >= 1.7` **y** `alto <= 720`
**y** ancho `>= 1280`. 1280x800 queda fuera; 1280x720 y 1920x1080 siguen
detectandose como TV.

### 3. Los titulos de las filas se mutilaban

`ContentRow` aplicaba `cleanCategoryName()` a **todos** los titulos, incluidos
los que la app escribe a mano. Efecto real:

```
"⭐ Recomendado para ti"  ->  "Recomendado Para Ti"
"🆕 Recién agregadas"     ->  "Recién Agregadas"
"▶ Continuar viendo"      ->  "Continuar Viendo"
```

Se perdian los emojis y la capitalizacion original.

**Correccion:** `title` se muestra tal cual. Las categorias que si vienen del
servidor pasan `sanitizeTitle` (`MoviesScreen` y `SeriesScreen`).

### 4. El splash estaba fuera de `expo` y se ignoraba

`app.json` tenia la clave `splash` en la **raiz** del archivo, no dentro de
`expo`. Con SDK 54 esa configuracion no se aplica. Movida a `expo.splash`.

### 5. Icono de notificaciones invalido en Android

El plugin `expo-notifications` apuntaba a `assets/icon.png` (a color). Android
renderiza ese icono como silueta y un PNG a color queda como un bloque blanco.
**Correccion:** `assets/notification-icon.png` (rayo blanco sobre transparente).

### 6. Version hardcodeada y desincronizada

`ProfileTabScreen` mostraba `Super Flash v1.0.29` fijo mientras la app iba en
1.0.40. Ahora usa `version.json`.

### 7. Claves de almacenamiento

Todas las claves (`session`, `profiles`, `library`, `theme`, `pin`, `servers`,
cache, vault de descargas) usaban el prefijo `linkplay_`. Renombradas a
`superflash_`. Nota: al ser un package nuevo no hay datos previos que migrar;
si en el futuro se reutiliza el package, habria que migrar.

---

## Medios (corregidos)

### 8. Codigo muerto de foco en TV

`TVFocusProvider` **nunca estaba montado** en el arbol de `App.js`, y
`TVFocusCursor` no se renderizaba en ninguna pantalla. Es decir, ~380 lineas
de un sistema de cursor global que no hacia nada (el foco real lo maneja
`react-native-tvos` de forma nativa).

**Correccion:** eliminados `src/context/TVFocusContext.js` y
`src/components/TVFocusCursor.js`. `FocusableButton` sigue aplicando el foco
visual (borde + escala) y `hasTVPreferredFocus` sigue funcionando.

### 9. Bloque sin efecto en HomeScreen

Un `setTimeout` de 5 s llamaba `areNotificationsEnabled()` y no hacia nada con
el resultado. Eliminado junto con su import.

### 10. `extra.eas.projectId` apuntaba al proyecto de LinkPlay

Al compilar, la build se habria subido al proyecto EAS anterior. Se elimino;
requiere `eas init` en este repositorio.

### 11. Updater apuntaba a `linkplay-updates`

`VERSION_CHECK_URL`, `APP_PACKAGE`, el nombre del APK y el `User-Agent`
apuntaban al proyecto anterior. Ademas, el nombre de archivo quedaba con un
espacio (`"Super Flash-v1.0.0.apk"`). Corregido a `App_SuperFlash_Tv` y
`SuperFlash-vX.Y.Z.apk`.

---

## Seguridad (hallazgos abiertos)

### 12. Contrasena del panel en dos lugares

`AuthContext._persistSession()` guarda la contrasena en `expo-secure-store` y
ademas, **siempre**, un respaldo en `AsyncStorage` codificado en base64. Base64
no es cifrado: cualquiera con acceso al sandbox de la app (o a un backup de
Android sin cifrar) puede leerla.

Es una decision de compatibilidad deliberada del codigo original ("por si
SecureStore falla"). Recomendacion: dejar el respaldo solo si SecureStore
falla, y no en todos los casos.

### 13. Trafico en claro

`expo-build-properties` define `usesCleartextTraffic: true` porque el panel
`superflash.ovh` responde por HTTP. Si el proveedor habilita HTTPS, conviene
ponerlo en `false`.

### 14. Auto-actualizacion sin verificacion de integridad

La app pide `REQUEST_INSTALL_PACKAGES` y descarga un APK desde GitHub Releases.
No se verifica hash ni firma antes de abrir el instalador. Si alguien
comprometiera el repositorio de releases, podria distribuir un APK malicioso
a todos los usuarios. Recomendacion: publicar un `sha256` en `version.json` y
compararlo antes de instalar.

### 15. Dependencias con avisos

`npm audit`: 23 avisos (14 moderados, 9 altos), todos en dependencias
transitivas de Expo/Metro. No hay parche sin cambiar de SDK.

---

## Observaciones funcionales

- **Servidor fijo en el login**: `LoginScreen` usa
  `http://superflash.ovh:80` hardcodeado. Sirve para el panel propio, pero el
  usuario no puede cambiarlo desde el login (si existe `ServersScreen` para
  multi-cuenta despues de entrar).
- **`PlayerScreen` (2.283 lineas)** concentra reproduccion, pistas de audio,
  subtitulos, seek, PiP, Cast y guardado de progreso. No se refactorizo en
  esta pasada a proposito: es el archivo con mayor riesgo de regresion y
  conviene tocarlo solo con pruebas en dispositivo.
- **`orientation: "default"`**: la app rota libremente. Ahora el layout
  responde a esa rotacion (antes no).

## Pruebas recomendadas antes de publicar

1. Celular pequeno (320-360 dp) en vertical y horizontal.
2. Celular grande (>= 430 dp).
3. Tablet 10" en vertical y horizontal (verificar que **no** entra en modo TV).
4. Android TV 1080p: recorrer con D-pad los 5 tabs, el hero, las filas y las
   grillas.
5. Fire TV Stick: idem, mas el flujo de descarga/actualizacion.
6. Emulador: redimensionar la ventana en caliente y confirmar que las filas
   y grillas se reacomodan.
