import type { Category, Deck, ExpeditionTheme } from '../lib/types';

export const expeditionThemes: Record<ExpeditionTheme, {
  name: string; intro: string; finaleCategory: Category; cardDeck: Deck; postcard: string;
}> = {
  chaos: {
    name: 'Caos', intro: 'Un hallazgo raro, una carta inesperada y un final difícil de explicar.',
    finaleCategory: 'Italian Chaos', cardDeck: 'Roman Chaos', postcard: 'El plan era no tener plan.',
  },
  exploration: {
    name: 'Exploración', intro: 'Seguid los detalles que casi todo el mundo pasa por alto.',
    finaleCategory: 'Tourist Challenge', cardDeck: 'Roman Chaos', postcard: 'Encontramos algo que no está en las guías.',
  },
  night: {
    name: 'Noche', intro: 'Un plan breve para cuando cae la tarde, dentro o fuera de casa.',
    finaleCategory: 'Night Mode', cardDeck: 'Flirt Mode', postcard: 'La noche decidió por nosotros.',
  },
};
