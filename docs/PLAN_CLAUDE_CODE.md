# Plan de trabajo — Super Flash v1.1

Documento para Claude Code. Léelo completo antes de tocar código.
Proyecto: Expo SDK 54 + react-native-tvos 0.81, Android (celular, tablet, TV).
Antes de escribir código, lee AGENTS.md y la doc versionada de Expo 54.
Uso personal del dueño (Miguel); después puede replicarse para otro cliente,
así que mantén la marca centralizada (theme.js, assets, app.json).

## Reglas de trabajo

- Un commit por fase (y por sub-tarea grande). Nada de commits gigantes.
- No romper lo que ya funciona: descargas, Cast, PiP, Kids, favoritos,
  historial, continuar viendo, eventos deportivos, actualizador, backup.
- `PlayerScreen.js` (2.283 líneas) es el archivo más frágil: cambios mínimos
  y aislados; si hay que extraer lógica, hazlo a hooks/componentes nuevos sin
  cambiar el comportamiento.
- Todo debe funcionar con D-pad en Android TV (foco visible, `hasTVPreferredFocus`
  donde corresponda, BACK coherente) y con touch en celular/tablet.
- Textos de la UI en español.
- Al cerrar cada fase: `npx expo-doctor`, revisar imports y resumir qué cambió
  y qué hay que probar en dispositivo real.

## Fuera de alcance (NO implementar)

- Grabación (interna, USB o NAS).
- Biblioteca propia (Jellyfin, Emby, NAS).
- Pausa/retroceso en vivo y Catch-Up.
- Panel web, cuentas en la nube, sincronización, licencias o pagos.
  El login sigue siendo solo usuario + contraseña contra `superflash.ovh`.

---

## Fase 0 — Revisión completa del código (primero, antes de cambiar nada)

Revisa TODO `src/`, `App.js` y la configuración. Entrega un informe en
`docs/REVISION_v1.1.md` con hallazgos ordenados por severidad (crítico,
medio, menor), cada uno con archivo, línea y corrección propuesta. Busca:

- Bugs de lógica, estados que no se limpian, `useEffect` sin cleanup,
  listeners/intervalos/timers que quedan vivos, fugas de memoria del reproductor.
- Rendimiento con listas grandes (miles de canales/VOD): FlatList sin
  `getItemLayout`/`keyExtractor`/`windowSize`, renders innecesarios,
  contextos que re-renderizan toda la app.
- Manejo de errores de red (panel caído, timeout, credenciales vencidas,
  cuenta expirada según `user_info.exp_date`).
- Foco en TV: pantallas donde el foco se pierde o no hay foco inicial.
- Código muerto, archivos sin uso (`legacy/` incluido) y dependencias sin uso.
- Hallazgos abiertos de `docs/AUDITORIA_SUPERFLASH.md` (#12–#15).

Luego aplica las correcciones críticas y medias. Las menores, solo si son seguras.

## Fase 1 — Seguridad y limpieza

1. **Contraseña del panel**: guardar solo en `expo-secure-store`. El respaldo
   en AsyncStorage (base64) se usa únicamente si SecureStore falla al escribir.
   Migrar sesiones existentes sin cerrar sesión al usuario.
2. **Actualizador con verificación**: agregar `sha256` a `version.json`;
   `src/services/updater.js` calcula el hash del APK descargado y solo abre el
   instalador si coincide. Si no coincide, borrar el archivo y avisar.
3. Quitar `expo-av` de `package.json` si ya no se usa en ningún archivo.
4. Eliminar `legacy/` si nada lo importa.

## Fase 2 — Perfiles sin fricción (eliminar el exceso de PIN)

Hoy hay tres capas de PIN: bloqueo de la app (`PinLockScreen`), PIN por
perfil (`ProfileContext.selectProfile`) y PIN de contenido adulto
(`verifyAdultPin` / `PinModal`). Es tedioso. Nuevo modelo:

1. **Sin PIN por perfil.** Quitar el campo PIN del formulario de perfiles y
   la validación en `selectProfile`. Migración: ignorar/borrar `pin` de
   perfiles guardados.
2. **Recordar el último perfil.** Al abrir la app, entrar directo al último
   perfil usado (sin pantalla de selección). Cambiar de perfil desde la barra
   o la pestaña Perfil. Si solo hay un perfil, nunca mostrar el selector.
3. **Un único PIN parental, opcional y apagado por defecto**, en Ajustes.
   Solo se pide para:
   - salir de un perfil Kids,
   - ver contenido adulto.
   Una vez ingresado, queda desbloqueado por un tiempo configurable
   (sesión actual / 1 h / 4 h) para no pedirlo a cada rato.
4. **Bloqueo de la app (`PinLockScreen`)**: mantener solo como opción en
   Ajustes, apagado por defecto. Si el PIN parental existe, reutilizar ese
   mismo PIN (no crear uno distinto).
5. Asegurar que `verifyAdultPin`, `PinModal` y `PinLockScreen` usen la misma
   fuente (un solo módulo `src/services/parentalPin.js` con SecureStore).

## Fase 3 — Nueva interfaz estilo TIVRA (reemplaza el estilo Netflix)

Referencia visual: https://tivratv.com (capturas de Home, Live TV, Guide,
Movies y Multi-View). Estilo: oscuro, limpio, denso en información, pensado
primero para TV con control remoto; menos héroes gigantes y más listas útiles.

Principios:
- Fondo casi negro, tarjetas planas, un solo color de acento (usar la marca:
  cian/violeta de `theme.js`), foco = borde de acento + leve escala.
- Tipografía más chica y ordenada que el estilo Netflix; mucha información
  visible sin hacer scroll.
- Navegación lateral en TV (rail izquierdo con iconos + texto que se expande
  al recibir foco); en celular/tablet se mantiene la barra inferior.
- Mantener el sistema responsivo actual (`src/utils/responsive.js`).

Pantallas:
1. **Inicio**: arriba "Continuar viendo" como bloque principal (no carrusel
   de héroe a pantalla completa); debajo "Favoritos en vivo — ahora" (canal +
   programa actual del EPG + barra de progreso), "Canales recientes" y filas
   de VOD recientes. La fila de deportes se mantiene.
2. **TV en vivo**: lista de canales a la izquierda (número, logo, nombre,
   programa actual y barra de progreso), vista previa del canal enfocado a la
   derecha con info del programa actual y siguiente. Categorías en un panel
   que se desliza desde la izquierda (LEFT en TV). OK = pantalla completa.
3. **Películas y Series**: grilla de pósters con categorías en panel lateral,
   filtros y orden (recientes, A–Z, popularidad). Detalle con backdrop,
   sinopsis, reparto y "más como esto" (adaptar las pantallas actuales).
4. **Reproductor**: superponer controles estilo TIVRA (barra inferior con
   canal/programa, audio, subtítulos, favorito, guía). Zapping arriba/abajo
   en vivo. No cambiar la lógica de reproducción, solo la capa visual.
5. Quitar del estilo actual lo que sobre: `HeroCarousel`/`HeroBanner` solo si
   ya no se usan tras el rediseño (en Inicio pueden quedar como un banner
   chico de Continuar viendo).

## Fase 4 — Guía EPG en grilla

Reemplazar la `EPGScreen` actual (lista por canal) por una guía tipo TV:

- Vista previa + info del programa enfocado arriba; grilla abajo: canales en
  filas (~7 visibles en TV), horas en columnas, línea "AHORA".
- Navegación con D-pad: arriba/abajo cambia canal, izquierda/derecha cambia
  programa; OK sobre un programa en vivo abre el canal.
- Filtrar por categoría (mismo panel lateral de TV en vivo).
- Datos: descargar el EPG completo del panel (`xmltv.php` o
  `get_simple_data_table`) una vez, parsearlo fuera del hilo de UI (en
  partes, sin bloquear), cachearlo en disco y refrescarlo cada X horas.
  `get_short_epg` queda como respaldo por canal.
- Virtualizar la grilla: con miles de canales no puede renderizarse todo.
- Reutilizar estos datos para "programa actual/siguiente" en TV en vivo e Inicio.

## Fase 5 — Multi-View (máximo 4 canales)

- Layouts: 2 (lado a lado) y 4 (2x2). Máximo 4.
- Cada celda elige canal por categoría o favoritos.
- Solo la celda enfocada tiene audio; mover el foco mueve el audio.
- OK sobre una celda = ampliar a pantalla completa; BACK vuelve a la grilla
  con los demás streams vivos.
- Implementar con varias instancias de `useVideoPlayer` de `expo-video`
  (sin módulos nativos nuevos). Celdas no enfocadas: calidad/bitrate más bajo
  si el stream lo permite.
- **Límite de conexiones**: leer `user_info.max_connections` del panel; si es
  menor a 4, ofrecer solo el layout permitido y explicar por qué.
- Si un stream se cae, reintentar solo esa celda automáticamente.
- Liberar todos los players al salir (sin fugas de memoria).
- Advertencia en UI para equipos lentos: si una celda no arranca en N segundos,
  mostrar "Tu equipo puede no soportar 4 canales a la vez".

## Fase 6 — Deportes vinculados a los canales

Ya existe `src/services/sports.js` (ESPN) + `EventsScreen` + `SportsRow`.
Agregar:

- Para cada partido, buscar canales que lo transmiten: coincidencia de
  nombres de equipos/liga contra nombres de canales y títulos del EPG
  (normalizar acentos, mayúsculas, abreviaturas comunes).
- En la tarjeta del partido: marcador en vivo + "Ver en: canal X".
  OK = vista previa del canal; segundo OK = pantalla completa.
- Modo "sin spoilers" (ocultar marcadores) y elegir/ordenar ligas.
- Priorizar ligas relevantes para Chile y Latinoamérica (Primera chilena,
  Libertadores, Sudamericana, Premier, LaLiga, Champions, NBA, NFL).

## Al terminar

- Subir versión en `app.json`, `package.json` y `version.json` (1.1.0).
- Actualizar `README.md` y el changelog de `version.json`.
- Lista de pruebas manuales: celular, tablet 10" (que no entre en modo TV),
  Android TV 1080p con D-pad, Fire TV, y Multi-View de 4 canales en un TV box.
