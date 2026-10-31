# Plan de trabajo — TV Nueva v1.1 (app del cliente)

Documento para Claude Code. Léelo completo antes de tocar código.
Proyecto: Expo SDK 54 + react-native-tvos 0.81, Android (celular, tablet, TV).
Antes de escribir código, lee AGENTS.md y la doc versionada de Expo 54.

Esta app es una copia de Super Flash hecha para un cliente. Es una app
separada (`com.migueltroncoso.tvnueva`) que se instala junto a Super Flash en
el mismo equipo. Logo y assets de Super Flash son provisorios. Mantén la marca
centralizada (`theme.js`, `assets/`, `app.json`).

Fuente de verdad de lo que quiere el cliente:
[`REQUISITOS_CLIENTE_2026-10-31.md`](REQUISITOS_CLIENTE_2026-10-31.md).
Referencia visual: TIVRA TV.

## Reglas de trabajo

- Un commit por sub-tarea grande; una rama por semana (`semana-N-...`).
- No romper lo que ya funciona: descargas, Cast, PiP, Kids, favoritos,
  historial, continuar viendo, eventos deportivos, actualizador, backup.
- `PlayerScreen.js` es el archivo más frágil: cambios mínimos y aislados.
- Todo debe funcionar con D-pad en Android TV (foco visible, BACK coherente)
  y con touch en celular/tablet.
- Textos de la UI en español.
- Prefijo de almacenamiento: `tvnueva_` (no usar `superflash_`).
- Al cerrar cada semana: `npx expo-doctor`, revisar imports y resumir qué
  cambió y qué probar en dispositivo.

## Requisitos del cliente (resumen)

| # | Requisito | Entrega |
|---|-----------|---------|
| 1 | 2 proveedores Xtream (inglés + español) con canales mezclados en una sola lista | Semana 2 |
| 2 | Sin pestaña TV en vivo: la **Guía TV** es la pantalla de canales | Semana 1 (menú) / Semana 3 (guía) |
| 3 | Menú lateral izquierdo con logo, estilo TIVRA; nuevo Inicio | Semana 1 |
| 4 | Ocultar categorías; los favoritos de una categoría oculta siguen en Inicio | Semana 2 |
| 5 | Menú de canal (OK mantenido): favorito, Multi-View, mover, renombrar, asignar número | Semana 3 |
| 6 | Filtro **Boxeo** en Deportes (junto a Fútbol, Básquet, Hockey, MMA…) | Semana 4 |
| 7 | Catch-up solo si el proveedor lo informa; si no, ocultar la sección | Semana 4 |
| 8 | Rendimiento: al hacer clic, canal/imagen salen de inmediato | Todas |
| 9 | Grabación | **v1.2** (fuera de esta versión) |

## Fuera de alcance de v1.1 (NO implementar)

- Grabación (Grabando / Programadas / Completadas): queda para v1.2. El menú
  de canal **no** muestra "Grabar ahora" hasta entonces.
- Biblioteca propia (Jellyfin, Emby, NAS): el cliente no la usa; ocultarla.
- Pausa/retroceso en vivo.
- Panel web, cuentas en la nube, sincronización, licencias o pagos.

---

## Semana 1 — Interfaz base estilo TIVRA (rama `semana-1-interfaz`)

1. **Menú lateral izquierdo** (TV): rail con logo arriba e iconos + texto que
   se expande al recibir foco. Entradas: Inicio, Guía TV, Películas, Series,
   Deportes, Búsqueda, Ajustes. **Sin** "TV en vivo" ni "Library".
   En celular/tablet se mantiene la barra inferior con las mismas entradas.
2. **Nuevo Inicio**:
   - Continuar viendo: banner arriba + fila de pósters.
   - "Ahora en favoritos": canal + programa actual + barra de progreso.
   - "Canales recientes".
   - Filas de VOD recientes y fila de deportes se mantienen.
3. Quitar `TVTopNav` si queda sin uso; mantener el sistema responsivo
   (`src/utils/responsive.js`).
4. Marca provisoria: logo de Super Flash vía `BrandLogo.js`.

Hecho cuando: navegación completa con D-pad en emulador Android TV 1080p,
sin entrada "TV en vivo", y capturas de Inicio y menú listas.

## Semana 2 — Proveedores y categorías

1. **Dos proveedores Xtream** (inglés + español): guardar ambos (SecureStore
   para contraseñas), cargar en paralelo, tolerar que uno falle, y mezclar
   los canales en una sola lista identificando el proveedor de origen.
2. Unificar categorías de ambos proveedores y respetar `max_connections` de
   cada uno.
3. **Ocultar categorías**: pantalla/acción para ocultar y restaurar; persiste
   en `tvnueva_*`. Una categoría oculta desaparece de la Guía y del
   explorador, **pero los canales favoritos siguen visibles en Inicio**.
4. Cache por proveedor (`contentCache.js`) para arranque rápido.

## Semana 3 — Guía TV como pantalla de canales + menú de canal

1. **Guía TV en grilla** (reemplaza `EPGScreen` y `LiveTVScreen`): vista
   previa y programa actual arriba; canales en filas, horas en columnas,
   línea "AHORA". Virtualizada (miles de canales).
2. IZQUIERDA / BACK abre el panel de **categorías** a la izquierda.
3. EPG completo del panel (`xmltv.php`), parseado fuera del hilo de UI y
   cacheado en disco; `get_short_epg` como respaldo. Reutilizarlo en Inicio.
4. **Menú de canal** (mantener OK): agregar/quitar favorito, Multi-View,
   mover (reordenar), renombrar, asignar número. Sin "Grabar" (v1.2).
5. **Multi-View** (máx. 4, `expo-video`): layouts 2 y 4, audio solo en la
   celda enfocada, respeta `max_connections`, libera players al salir.

## Semana 4 — Deportes, catch-up y cierre

1. **Deportes**: Sports Hub en una sola pantalla con marcadores en vivo,
   vista previa y "en tus canales". Filtros: Fútbol, Básquet, Hockey, Soccer,
   Vóley, Golf, Racing, MMA y **Boxeo** (nuevo). MMA muestra la cartelera
   completa de la pelea. Vincular partidos con canales (`sports.js`).
2. **Catch-up solo si el proveedor lo informa** (`tv_archive` en los canales):
   si algún proveedor lo trae, mostrarlo; si ninguno, ocultar la sección.
3. Rendimiento: precargar imágenes/streams del elemento enfocado, revisar
   renders innecesarios y listas largas.
4. Cierre: subir versión (`app.json`, `package.json`, `version.json`) a
   1.1.0, actualizar `README.md` y changelog, y correr `eas init` para
   vincular el proyecto (ver README).

## Pruebas manuales al cerrar

Celular, tablet 10" (que no entre en modo TV), Android TV 1080p con D-pad,
Fire TV, Multi-View de 4 canales en un TV box, y convivencia con Super Flash
instalada en el mismo equipo.
