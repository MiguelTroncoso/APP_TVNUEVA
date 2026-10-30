# Revisión de código — Super Flash v1.1 (Fase 0)

Alcance: `App.js`, `index.js`, configuración (`app.json`, `eas.json`,
`package.json`, `version.json`), `src/` completo y `legacy/`.

Método: lectura completa de configuración, contextos, servicios, `LiveTVScreen`,
`EPGScreen`, `HomeScreen` (primera mitad), `SearchScreen`, `updater.js`, y
revisión dirigida (efectos, timers, listeners, listas, filtro Kids) del resto,
incluido `PlayerScreen.js`. **No se ejecutó la app ni hay pruebas en
dispositivo**; solo se verificó que los archivos modificados parsean con Babel.

Leyenda: ✅ corregido en esta fase · ➡️ pendiente (fase indicada) · 📝 solo documentado.

---

## Críticos

### C1 ✅ El watchdog de congelamiento del reproductor nunca se disparaba
`src/screens/PlayerScreen.js` (efecto del `setInterval`, ~l.752–870).
El intervalo corre cada `STALL_TICK_MS = 3000` (l.126) pero el efecto tenía
`currentTime` en sus dependencias. `currentTime` cambia cada segundo
(`timeUpdateEventInterval = 1`), así que el intervalo se destruía y recreaba
antes de cumplir los 3 s: la detección y recuperación de streams congelados
(en vivo y VOD) quedaba prácticamente inerte.
**Corrección:** el intervalo lee la última posición desde
`playbackInfoRef.current.currentTime` y `currentTime` salió de las dependencias.

### C2 ✅ Un perfil Kids podía ver contenido adulto desde Búsqueda y EPG
`SearchScreen.js` y `EPGScreen.js` no aplicaban `isAdultContent` (sí lo hacían
Inicio, TV en vivo, Películas, Series y Eventos).
**Corrección:** ambas pantallas filtran por categoría/nombre cuando
`activeProfile.isKids`.

---

## Medios

### M1 ✅ El listener de eventos del player se resuscribía cada segundo
`PlayerScreen.js` ~l.744: el efecto de `statusChange/playingChange/playToEnd/
timeUpdate` listaba `currentTime` y `playbackStarted` como dependencias, aunque
el cuerpo no los lee. Cada tick quitaba y volvía a poner 4 listeners nativos y
alternaba `isReleasedRef` (true → false) en cada ciclo.
**Corrección:** dependencias recortadas. Mismo patrón en
`persistCurrentProgress` (~l.1013), que hacía recrear `goBackSafe`, el
`BackHandler` y el listener `beforeRemove` cada segundo; ahora lee la posición
del ref.

### M2 ✅ Login: errores crudos y cuenta vencida aceptada
`src/services/xtream.js` `login()`. Los fallos llegaban como `Aborted`,
`Network request failed` o `HTTP 502`, y una cuenta con `exp_date` pasado o
`status` Expired/Banned/Disabled iniciaba sesión y recién fallaba después.
**Corrección:** mensajes en español (timeout, sin conexión, panel caído,
respuesta inválida), rechazo de cuentas vencidas/desactivadas con la fecha, y
`auth === '0'` también cuenta como inválido.

### M3 ✅ Sesión a medias si SecureStore no devolvía la contraseña
`src/context/AuthContext.js` `loadStoredSession`. Si SecureStore expiraba (3 s)
y no había respaldo, la app entraba con `password = ''` y todas las llamadas al
panel fallaban sin explicación. Además la migración desde la sesión v1 guardaba
los datos pero dejaba al usuario sin sesión.
**Corrección:** sin contraseña recuperable se descarta la sesión y se muestra el
login; la migración v1 ahora deja la sesión activa.

### M4 ✅ EPG: respuestas tardías pisaban el canal seleccionado
`EPGScreen.js` `loadEpg`. Al moverse rápido entre canales, la respuesta de un
canal anterior podía sobrescribir la guía del actual. Además el botón
"Actualizar" no hacía nada si el caché estaba fresco.
**Corrección:** contador de petición (solo la última escribe) y
`loadChannels(true)` / `loadEpg(..., true)` fuerzan red al actualizar.

### M5 ✅ TV en vivo: conteo de categorías O(categorías × canales) por render
`LiveTVScreen.js` `renderCategory`. Con miles de canales y cientos de
categorías, cada render recorría la lista completa por cada chip.
**Corrección:** `categoryCounts` memoizado; `keyExtractor` de categorías usa el
id, no el índice.

### M6 ✅ Descargas re-renderizaban toda la app en cada callback de progreso
`DownloadsContext.js` (~l.390). Cada callback hacía dos `setState`
(`progressMap` y `activeDownloads`) sobre un contexto sin dividir; en redes
rápidas son decenas por segundo.
**Corrección:** límite de ~2 actualizaciones/s por descarga.
📝 Pendiente de fondo: separar el progreso en su propio contexto/store para que
solo `DownloadsScreen` y `DownloadStatusSheet` lo escuchen.

### M7 📝 `LibraryContext.persistPayload` usa estado capturado (lectura obsoleta)
`LibraryContext.js` l.64: los parámetros por defecto (`favs = favorites`, …)
leen el estado del cierre. Dos escrituras seguidas (p. ej. `addToContinueWatching`
y `recordWatchSession`) pueden pisarse mutuamente. La ventana es pequeña
(15 s / 60 s) pero real. Se deja documentado: la solución correcta es un ref
con el último payload, y conviene hacerla junto con pruebas en dispositivo.

### M8 📝 `PinLockScreen` abre si SecureStore falla
`PinLockScreen.js` l.85 (`onUnlocked?.()` en el `catch`) y `hasPin` (l.134)
devuelven "sin PIN"/"desbloqueado" ante cualquier error de SecureStore: un
fallo transitorio salta el bloqueo. Se resuelve en **Fase 2** con
`parentalPin.js`.

### M9 📝 Contraseña del panel duplicada en AsyncStorage (auditoría #12)
`AuthContext._persistSession` guarda siempre el respaldo base64 (`if (true)`).
➡️ **Fase 1, punto 1.**

### M10 📝 Actualizador sin verificación de integridad (auditoría #14)
`updater.js` descarga y abre el APK sin comprobar hash. ➡️ **Fase 1, punto 2.**

### M11 📝 Tráfico HTTP en claro (auditoría #13) y avisos de `npm audit` (#15)
Sin cambios: `usesCleartextTraffic` sigue siendo necesario mientras
`superflash.ovh` responda solo por HTTP; los 23 avisos son transitivos de
Expo/Metro y no tienen parche sin cambiar de SDK.

---

## Menores

| # | Hallazgo | Estado |
|---|---|---|
| m1 | `LiveTVScreen`: estado muerto (`epg`, `epgLoading`, `selectedChannel`, `usingCache`), import `getShortEPG`, estilos `count`/`cacheText` sin uso. | ➡️ Se elimina al rediseñar (Fase 3) |
| m2 | `LiveTVScreen`: `filterBySearch` sin debounce filtra miles de canales en cada tecla; `renderChannel` construye `buildPlayerChannelWindow` por fila; sin `getItemLayout`. | ➡️ Fase 3 (lista nueva) |
| m3 | `EPGScreen`: `FlatList` de canales sin `windowSize`/`getItemLayout`. | ➡️ Se reemplaza en Fase 4 |
| m4 | `HomeScreen`: `loadContent` actualiza estado tras desmontar (sin bandera de cancelación) y no hay manejo visible de error de red: si todo falla muestra pantalla vacía sin aviso. | ➡️ Fase 3 (Inicio nuevo) |
| m5 | `checkSessionValid`: un 403 de un proxy/WAF cierra la sesión como "expirada". | 📝 |
| m6 | `PlayerScreen`: sleep timer llama `player.pause()` dentro del updater de `setState`; el estado `showSkipCredits` se lee obsoleto en el listener (idempotente, inofensivo). | 📝 |
| m7 | `ProfileContext`: `useMemo` omite las funciones en sus deps (cierres con `profiles` viejo posible tras `saveProfiles`). | ➡️ Fase 2 reescribe el contexto |
| m8 | `expo-av` en `package.json` sin ningún import (solo un comentario). | ➡️ Fase 1, punto 3 |
| m9 | `axios` y `expo-status-bar` sin ningún import en `src/` ni `App.js`. | ➡️ Fase 1 (junto a `expo-av`, requiere `npm uninstall`) |
| m10 | `src/components/HeroBanner.js`: ningún archivo lo importa. | ➡️ Fase 3, punto 5 |
| m11 | `legacy/` (backup de `package-lock` de 9.788 líneas, `src.rar`, notas) no es importado por nada. | ➡️ Fase 1, punto 4 |
| m12 | `App.js` encabezado dice "Base: LinkPlay v1.0.40" / `HomeScreen` conserva `expirationDate` leyendo `user.expiration_date` (campo inexistente en Xtream; es `exp_date`). | 📝 Revisar en Fase 3 |
| m13 | `FocusableButton`/foco TV: no se pudo validar foco inicial por pantalla sin dispositivo; `LiveTVScreen` y `EPGScreen` ya usan `hasTVPreferredFocus`. | 📝 Incluir en pruebas manuales |

---

## Dependencias

| Paquete | Uso en código | Acción |
|---|---|---|
| `expo-av` | ninguno | quitar (Fase 1) |
| `axios` | ninguno | quitar (Fase 1) |
| `expo-status-bar` | ninguno | quitar o confirmar con `expo-doctor` (Fase 1) |
| `expo-asset` | solo plugin en `app.json` | conservar |
| resto | en uso | — |

## Cambios aplicados en esta fase

`PlayerScreen.js` (dependencias de 3 hooks y una lectura vía ref; sin tocar
lógica de reproducción), `xtream.js`, `AuthContext.js`, `SearchScreen.js`,
`EPGScreen.js`, `LiveTVScreen.js`, `DownloadsContext.js`.

## Qué probar en dispositivo real

1. En vivo: cortar la red del TV box con un canal abierto → debe mostrar
   "Señal congelada. Reintentando..." a los ~8 s y recuperar (C1).
2. VOD: pausar, adelantar y salir con BACK → el progreso se guarda y vuelve a
   "Continuar viendo" (M1).
3. Perfil Kids: buscar "xxx"/"adult" en Búsqueda y abrir EPG → no debe aparecer
   nada adulto (C2).
4. Login con usuario vencido, con servidor apagado y sin internet → mensajes
   claros (M2).
5. EPG: recorrer canales rápido; "Actualizar" debe volver a pedir al panel (M4).
6. Descargar un archivo grande en Wi-Fi rápido: la UI no debe trabarse (M6).
