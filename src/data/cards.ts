import type { Card, Deck, Difficulty, Intensity } from '../lib/types';
const decks: { name: Deck; intensity: Intensity; prompts: string[] }[] = [
  { name: 'Roman Chaos', intensity: 'playful', prompts: [
    'Inventa un nombre nuevo para esta calle.', 'Pide tu próximo café como un personaje de cine.', 'Encuentra la puerta más dramática de los alrededores.',
    'Crea un anuncio de diez segundos para tu helado.', 'Deja que una moneda decida el siguiente giro.', 'Fotografía algo con forma de corazón.',
    'Inventa una historia disparatada para la estatua más cercana.', 'Describe vuestra próxima comida con tres palabras poéticas.', 'Encuentra tres cosas rojas en un minuto.',
    'Habla como si narraras un tráiler de cine durante dos minutos.', 'Escoge algo misterioso del menú.', 'Haz una pequeña postal de papel.',
    'Busca un nombre de calle que parezca el título de una canción.', 'Inventa un titular de prensa sobre vuestro día.', 'Haz una foto desde la altura de tus rodillas.',
    'Inventa el nombre de un superhéroe romano imaginario.', 'Escoged el camino bonito, no el más corto.', 'Encuentra una ventana digna de un cuadro.',
    'Inventa un baile de victoria de cinco segundos.', 'Ponle un título desmesurado al capítulo de hoy.',
  ] },
  { name: 'Flirt Mode', intensity: 'flirty', prompts: [
    'Haz un cumplido sin perder la compostura.', 'Elige la banda sonora para la próxima calle.', 'Planea una cita de diez minutos en una cafetería.',
    'Inventa el título de una película protagonizada por vosotros.', 'Propón un baile; siempre se puede decir que no.', 'Escribe una invitación divertida en una servilleta.',
    'Haz un retrato espontáneo con permiso.', 'Elige un nombre en clave para la otra persona.', 'Comparte tu mejor frase de un encuentro de película.',
    'Encuentra la mesa con más encanto a la vista.', 'Brindad por una pequeña victoria.', 'Elige un sitio para ver un atardecer otro día.',
    'Describe a la otra persona como un personaje de cine.', 'Inventad un saludo secreto si ambos estáis de acuerdo.', 'Haceos una foto con poses a juego.',
    'Ofrécete a elegir el próximo postre.', 'Inventa un apodo divertido para esta noche.', 'Haz un cumplido en italiano a la otra persona.',
    'Entrega un premio al mejor momento de hoy.', 'Planea una parada sorpresa con dos opciones.',
  ] },
  { name: 'Temptation', intensity: 'sensual', prompts: [
    'Propón un baile lento, solo si ambos queréis.', 'Cread ambiente con una lista de música compartida.', 'Planea una sorpresa privada y opcional.',
    'Ofrece un masaje de hombros; pregunta antes.', 'Elegid un rincón acogedor para tomar algo por la noche.', 'Deja una nota divertida para más tarde.',
    'Invita a la otra persona a una cena a la luz de las velas.', 'Haz una invitación amable y opcional para quedaros un poco más.', 'Elegid juntos una temática para vuestra ropa.',
    'Encuentra un aroma que te recuerde a Roma.', 'Ofrece tu mano para caminar juntos; acepta cualquier respuesta.', 'Diseña un menú para una noche de cine en privado.',
    'Haz un retrato con luz cálida.', 'Propón un momento tranquilo lejos del bullicio.', 'Prepara una lista de dos canciones para esta noche.',
    'Planea un postre sorpresa después de cenar.', 'Escribe una invitación de «elige tu propia aventura».', 'Ofrece organizar una pausa relajante.',
    'Elige un lugar de ensueño para tomar la última copa.', 'Acordad juntos un pequeño ritual nocturno privado.',
  ] },
];
export const cards: Card[] = decks.flatMap(({ name, intensity, prompts }, deck) =>
  prompts.map((description, index) => {
    const difficulty: Difficulty = index % 7 === 0 ? 'Hard' : index % 3 === 0 ? 'Easy' : 'Medium';
    return { id: `c-${deck + 1}-${index + 1}`, title: ['La invitación', 'Te toca', 'Un pequeño misterio', 'Solo en Roma', 'El momento'][index % 5]!,
      description, deck: name, difficulty, points: difficulty === 'Hard' ? 15 : difficulty === 'Easy' ? 5 : 10,
      intensity, requiresConsent: (deck === 0 && index === 18) ||
        (deck === 1 && [4, 13].includes(index)) ||
        (deck === 2 && [0, 3, 7, 10].includes(index)) };
  })
);
