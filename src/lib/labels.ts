import type { Category, Deck, Difficulty, Entry, Game, Intensity, ScoreCategory } from './types';
import { missions } from '../data/missions';
import { cards } from '../data/cards';

export const categoryLabel: Record<Category, string> = {
  'Tourist Challenge': 'Reto turístico',
  'Italian Chaos': 'Caos italiano',
  'Flirt Mode': 'Modo coqueteo',
  'Temptation Mode': 'Modo tentación',
  'Night Mode': 'Modo noche',
};
export const deckLabel: Record<Deck, string> = {
  'Roman Chaos': 'Caos romano',
  'Flirt Mode': 'Modo coqueteo',
  Temptation: 'Tentación',
};
export const difficultyLabel: Record<Difficulty, string> = {
  Easy: 'Fácil', Medium: 'Media', Hard: 'Difícil', Special: 'Especial',
};
export const scoreLabel: Record<ScoreCategory, string> = {
  Adventure: 'Aventura', Creativity: 'Creatividad', Chemistry: 'Química',
  Daring: 'Atrevimiento', Cooperation: 'Cooperación',
};
export const intensityLabel: Record<Intensity, string> = {
  playful: 'Divertida', flirty: 'Coqueta', sensual: 'Sensual', daring: 'Muy atrevida',
};
export const drawStatusLabel = {
  drawn: 'Pendiente', completed: 'Completada', skipped: 'Omitida',
} as const;

// Los identificadores guardados no cambian al traducir el contenido.
export function entryTitle(entry: Entry, game: Game): string {
  if (entry.itemId === 'mystery-reward') return 'Recompensa misteriosa';
  if (entry.kind === 'secret') {
    const missionId = game.secrets.find(s => s.id === entry.itemId)?.missionId;
    return missions.find(m => m.id === missionId)?.title ?? 'Misión secreta';
  }
  return missions.find(m => m.id === entry.itemId)?.title
    ?? cards.find(c => c.id === entry.itemId)?.title
    ?? entry.title;
}
