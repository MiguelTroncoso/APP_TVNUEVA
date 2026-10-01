# Auditoría Senior LinkPlay — Hallazgos

## CRÍTICOS (rompen funcionalidad)

### 1. getStreamUrl — SIN encodeURIComponent
- Archivo: src/services/xtream.js
- Si usuario o contraseña tienen caracteres especiales (@, #, &, +) la URL rompe
- FIX: encodeURIComponent en username, password y streamId

### 2. LiveTVScreen — category_id sin coerción de tipo
- Archivo: src/screens/LiveTVScreen.js línea 76
- `c.category_id === catId` falla cuando uno es número y el otro string
- FIX: String(c.category_id) === String(catId)

### 3. LiveTVScreen — no pasa returnRoute al Player
- Al dar "volver" desde Player que viene de LiveTV, cierra la app
- FIX: pasar returnRoute: 'LiveTV' en navigate('Player', ...)

### 4. HomeScreen — idem, no pasa returnRoute en canales en vivo ni otras filas
- FIX: agregar returnRoute a todos los navigate('Player')

### 5. DownloadsScreen — no pasa returnRoute al Player
- FIX: pasar returnRoute: 'Downloads'

### 6. ContinueWatchingScreen — no pasa returnRoute al Player
- FIX: pasar returnRoute apropiado

### 7. version.json — desfasado (dice 1.0.10, app real es 1.0.14+)
- Causa que el actualizador nunca detecte nuevas versiones correctamente
- FIX: sincronizar siempre con app.json

### 8. updater.js — no valida 'TU_USUARIO/TU_REPOSITORIO' en URL
- Solo valida 'placeholder', pero el historial menciona que la URL tenía ese string
- FIX: agregar ambas validaciones

### 9. MoviesScreen — Import duplicado de Image (ya fixeado en sesión anterior)

## MODERADOS (degradan experiencia)

### 10. FocusableButton v1.0.18 — necesita merge con nuestro código actual
- El ZIP de audit tiene una versión mejorada con scale + elevation + glowBlue
- FIX: usar la versión del ZIP auditado (es mejor)

### 11. PlayerScreen — ya viene del ZIP auditado (v1.0.18), es la versión más nueva
- Tiene: overlay auto-hide, seekBy, audio/CC tracks, goBackSafe con CommonActions
- FIX: usar este archivo del ZIP (reemplaza al nuestro)

### 12. MovieDetailScreen — viene del ZIP auditado con heroHeight limitado para TV
- FIX: usar este archivo del ZIP

### 13. SeriesDetailScreen — viene del ZIP auditado con heroHeight limitado para TV
- FIX: usar este archivo del ZIP

## Eventos en vivo (feature pendiente)
- Crear EventsScreen que filtra categorías del servidor por keywords deportivos
- Categorías prioritarias definidas en el historial
