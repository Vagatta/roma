# ROMA: El juego secreto

Un juego privado de viaje para dos personas en Roma. Desarrollado con Astro, islas React, TypeScript, Tailwind CSS, Leaflet/OpenStreetMap y Zod. Sin registro, base de datos, GPS ni claves de API.

## Desarrollo local

Necesitas Node.js 22.12 o posterior.

```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
```

Abre la URL que muestra Astro. La aplicación está en español y está pensada para compartir un mismo móvil durante el viaje.

## Despliegue en Vercel

Importa este repositorio en Vercel, selecciona Astro (o usa `npm run build` y `dist`) y despliega. `@astrojs/vercel` está configurado para salida estática. No hacen falta variables de entorno. El servicio de uso sin conexión requiere HTTPS en producción.

## Juego y privacidad

Para empezar, elige dos apodos, fechas opcionales, un objetivo de retos (30 por defecto) y una intensidad. Completa misiones, visita destinos del mapa para desbloquear retos, saca cartas, realiza misiones secretas individuales y consigue logros. Las interacciones íntimas siempre son opcionales y requieren consentimiento mutuo en ese momento. Omitir un reto no tiene penalización. Los puntos premian la participación y la finalización, nunca la aceptación del contacto físico.

El progreso se guarda automáticamente en `localStorage` con un esquema versionado. Expórtalo desde Ajustes antes de borrar los datos del navegador o cambiar de dispositivo: **localStorage no sincroniza datos entre dispositivos**. La importación valida el archivo y sustituye la partida actual. Cuando es posible, los datos guardados no válidos se conservan en `roma-secret-game:v1:recovery`. También puedes eliminar registros de puntuación accidentales desde Ajustes. Los identificadores y valores internos de las partidas existentes se mantienen al traducir la interfaz; el progreso anterior sigue siendo compatible.

Después de la primera carga con conexión, el servicio de uso sin conexión guarda las páginas y recursos visitados. El mapa interactivo, sus teselas, las fotografías y las fuentes externas necesitan conexión hasta que se hayan almacenado en caché; la lista de destinos y las misiones permanecen disponibles sin GPS ni conexión. La atribución de OpenStreetMap se muestra en el mapa.
