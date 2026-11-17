export type GameMode = 'duel' | 'radar' | 'mystery' | 'game';

interface ModeRule {
  label: string;
  title: string;
  steps: { title: string; text: string }[];
  note: string;
}

export const modeRules: Record<GameMode, ModeRule> = {
  duel: {
    label: 'DUELO',
    title: 'Una prueba, un punto.',
    steps: [
      { title: 'Elegid la meta', text: 'Antes del primer reto, decidid si gana quien llegue a 3, 5 o 7 puntos. Se alterna quién empieza cada ronda.' },
      { title: 'Sacad un reto', text: 'La app sortea una prueba de rapidez, memoria, estimación, reflejos o estrategia. Seguid las instrucciones que aparecen para esa prueba.' },
      { title: 'Cerrad la ronda', text: 'Quien gana suma 1 punto; si hay empate, nadie suma. La primera persona en alcanzar la meta gana el Duelo.' },
    ],
    note: 'Las rondas se controlan en una pantalla y el turno avanza sin un paso de «pasar el móvil». Este marcador no se mezcla con Radar ni Roma.',
  },
  radar: {
    label: 'RADAR',
    title: 'Adivinad la elección del otro.',
    steps: [
      { title: 'Identificaos', text: 'Cada persona elige su propio nombre en su móvil. Para compartir la partida, unid los dos dispositivos a la misma sala desde Ajustes.' },
      { title: 'Elegid en secreto', text: 'En cada dilema, marca lo que harías tú y lo que crees que elegirá el otro. Al confirmar, no puedes cambiarlo. Las respuestas se revelan cuando ambos terminan.' },
      { title: 'Sumad puntos', text: 'Se juegan 7 rondas. Acertar la predicción da 2 puntos. En la última puedes apostar: +4 si aciertas o -2 si fallas; sin apuesta, +2 o 0.' },
    ],
    note: 'Gana quien tenga más puntos al final; el empate es posible. Radar tiene marcador propio.',
  },
  mystery: {
    label: 'MISTERIO',
    title: 'Reconstruid el caso juntos.',
    steps: [
      { title: 'Abrid documentos', text: 'Leed las pistas en el orden que queráis. La pantalla indica a quién le toca abrir la siguiente; separad testimonios de pruebas materiales.' },
      { title: 'Elegid una hipótesis', text: 'Podéis dar un veredicto en cualquier momento, sin abrir todas las pistas. Uno incorrecto suma un intento y da pistas sobre lo que no encaja; no resta puntos.' },
      { title: 'Cerrad el expediente', text: 'Al acertar se muestra la resolución documentada y recibís 20 puntos compartidos. Reabrir el caso no concede el bonus otra vez.' },
    ],
    note: 'Se juega en equipo: no hay ganador individual. El bonus también aparece en el marcador compartido de Roma.',
  },
  game: {
    label: 'ROMA',
    title: 'Una aventura a vuestro ritmo.',
    steps: [
      { title: 'Empezad una expedición', text: 'Elegid Caos, Exploración o Noche, en Roma o desde cualquier sitio. Una foto validada desbloquea una carta; después elegís entre dos misiones finales. La postal aparece al terminar.' },
      { title: 'Sacad cartas', text: 'Elegid un mazo y sacad una carta. Podéis completarla o pasar sin perder puntos. Cada persona genera su propia misión secreta.' },
      { title: 'Mostrad las pruebas', text: 'Las fotos curiosas necesitan aprobación del otro para puntuar. Tras subir la foto de un lugar, elegid un microreto, guardad vuestra respuesta y jugad sus misiones desbloqueadas. El GPS es opcional.' },
      { title: 'Guardad el recuerdo', text: 'La meta cuenta misiones normales y secretas; las cartas solo dan puntos. Podéis añadir una frase a cada foto directamente en Recuerdos o en el Resumen; se comparte entre los dos.' },
    ],
    note: 'Toda propuesta íntima requiere un sí claro de ambos. Podéis saltar una misión o carta sin penalización.',
  },
};
