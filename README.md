# ROMA: El juego secreto

Un juego para dos personas, en casa o donde queráis. Desarrollado con Astro, React y TypeScript. Incluye cuatro modos: Duelo, Radar, Misterio y la aventura opcional de Roma.

Radar propone siete dilemas: cada jugador elige una respuesta y predice la del otro desde su móvil. Las respuestas se revelan al confirmar ambos; la última ronda permite apostar puntos.

Roma incluye expediciones de tres pruebas: una foto curiosa que valida la otra persona, una carta sorpresa y un final que elegís entre dos misiones. Se pueden jugar en Roma o desde cualquier sitio sin GPS. Al terminar se genera una postal con las fotos y puntos ya conseguidos, sin un marcador nuevo. Cada visita confirmada con foto abre un reto de dos caminos: elegís uno, guardáis vuestra respuesta y desbloqueáis misiones de ese lugar. En `/recap` podéis escribir una frase para cada foto de misiones y visitas antes de compartir o imprimir el resumen.

## Desarrollo local

Necesitas Node.js 22.12 o posterior.

```sh
npm install
npm run dev -- --host 127.0.0.1
npm run check
npm run build
npm run preview
node --test tests/*.test.mjs
```

Abre la URL que muestra Astro. Si indica que hay un servidor activo pero el puerto no responde, añade `--force` a `npm run dev`.

## Despliegue en Vercel

Importa este repositorio en Vercel, selecciona Astro y despliega. `@astrojs/vercel` está configurado para salida estática. El servicio de uso sin conexión requiere HTTPS en producción.

Para sincronizar una partida entre dos móviles, configura `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`, activa el inicio de sesión anónimo y ejecuta `supabase/schema.sql` en el editor SQL de Supabase. Después cread una sala y compartid su enlace desde Ajustes. Actualizar el archivo SQL local no modifica automáticamente la base de datos desplegada.

## Juego y privacidad

Para empezar, elige dos apodos. Duelo y Radar tienen marcadores independientes; Misterio se juega en equipo. En Roma puedes completar misiones y cartas, registrar visitas con foto y guardar recuerdos. Las interacciones íntimas siempre son opcionales y requieren consentimiento mutuo en ese momento. Omitir un reto no tiene penalización.

El progreso se guarda automáticamente en `localStorage` con un esquema versionado. **Sin sala Supabase, no se sincroniza entre dispositivos**. En una sala compartida, el estado se sincroniza mediante Supabase Realtime y las fotos se guardan en Storage. Las subidas sin conexión quedan en cola. La foto pendiente, carta y elección final de las expediciones también se comparten. La selección de jugador en Radar se guarda por dispositivo; elegid nombres distintos en los dos móviles. Las respuestas se ocultan en la interfaz, pero no frente a alguien que inspeccione el estado de la sala: no hay identidad autenticada por jugador.

Después de la primera carga con conexión, el servicio de uso sin conexión guarda las páginas y recursos visitados. El mapa interactivo, sus teselas, las fotografías y las fuentes externas necesitan conexión hasta que se hayan almacenado en caché; la lista de destinos y las misiones permanecen disponibles sin GPS ni conexión. La atribución de OpenStreetMap se muestra en el mapa.
