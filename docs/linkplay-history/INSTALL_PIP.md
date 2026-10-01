# LinkPlay v1.0.9 — Instrucciones de instalación (PiP)

## ¿Qué cambió?

El player fue migrado de `expo-av` a `expo-video` para soportar
Picture-in-Picture (PiP) nativo en Android e iOS.

`expo-av` **no se eliminó** — sigue en las dependencias por si
otro módulo lo usa. Solo el PlayerScreen usa `expo-video` ahora.

---

## Pasos OBLIGATORIOS (sin esto el PiP no funciona)

### 1. Instalar la nueva dependencia

```bash
npx expo install expo-video@~2.2.2
```

### 2. Rebuild nativo (necesario porque expo-video modifica AndroidManifest.xml)

Si usás EAS Build (recomendado):
```bash
eas build --platform android --profile development
```

Si usás dev client local:
```bash
npx expo prebuild --clean
cd android && ./gradlew assembleDebug
```

> ⚠️ **Expo Go NO soporta expo-video con PiP.**
> Necesitás un custom dev client o un build de producción.

### 3. Lo que el plugin hace automáticamente en el build

En `AndroidManifest.xml` agrega a MainActivity:
```xml
android:supportsPictureInPicture="true"
```

En `Info.plist` (iOS) agrega:
```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

---

## Comportamiento del PiP

| Acción | Resultado |
|--------|-----------|
| Presionar botón ⧉ en el player | Entra en PiP manualmente |
| Presionar Home o cambiar de app | Entra en PiP automáticamente (Android 12+) |
| Tap en la ventana PiP | Vuelve al player a pantalla completa |
| Cerrar ventana PiP (X) | Para la reproducción |

El audio y el video **siguen reproduciendo** en background mientras
la app está en PiP, incluyendo la notificación del sistema con
controles de play/pause.

---

## Versiones

- expo-video: ~2.2.2 (compatible con Expo SDK 54)
- Android mínimo para PiP: API 26 (Android 8). Auto-PiP al ir a Home: API 31 (Android 12)
- iOS mínimo para PiP: iOS 14
