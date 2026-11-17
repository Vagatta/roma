import type { Game } from './types';

export const placeProofPhotoId = (placeId: string) => `visit-${placeId}`;

export function confirmPlaceVisit(game: Game, placeId: string, date = new Date().toISOString()): Game {
  if (!game.photos?.[placeProofPhotoId(placeId)]) return game;
  if (game.visited.includes(placeId)) return game;
  return { ...game, visited: [...game.visited, placeId], visitDates: { ...game.visitDates, [placeId]: date } };
}
