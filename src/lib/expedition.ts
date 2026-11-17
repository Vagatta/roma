import type { Card, Entry, Expedition, ExpeditionTheme, Game, Mission, Player } from './types';

export interface ExpeditionCandidates {
  photos: Mission[];
  cards: Card[];
  finales: Mission[];
  placeFinales: Mission[];
}

const entryFor = (game: Game, kind: Entry['kind'], itemId: string) =>
  game.entries.find(entry => entry.kind === kind && entry.itemId === itemId);

export function expeditionEntries(game: Game, expedition: Expedition): Entry[] {
  return [
    entryFor(game, 'mission', expedition.photoMissionId),
    entryFor(game, 'card', expedition.cardId),
    expedition.branch === undefined ? undefined : entryFor(game, 'mission', expedition.finaleOptions[expedition.branch]),
  ].filter((entry): entry is Entry => Boolean(entry));
}

export function expeditionStage(game: Game, expedition: Expedition): 'photo' | 'card' | 'branch' | 'finale' | 'done' {
  if (!entryFor(game, 'mission', expedition.photoMissionId)) return 'photo';
  if (!entryFor(game, 'card', expedition.cardId)) return 'card';
  if (expedition.branch === undefined) return 'branch';
  return entryFor(game, 'mission', expedition.finaleOptions[expedition.branch]) ? 'done' : 'finale';
}

export function expeditionScores(game: Game, expedition: Expedition): [number, number] {
  return expeditionEntries(game, expedition).reduce<[number, number]>((scores, entry) => {
    if (entry.shared > 0) return [scores[0] + entry.points, scores[1] + entry.points];
    scores[entry.player] += entry.points;
    return scores;
  }, [0, 0]);
}

export function createExpedition(
  game: Game, theme: ExpeditionTheme, setting: Expedition['setting'], candidates: ExpeditionCandidates,
  id: string, startedAt: string, seed: number,
): Game | null {
  if ((game.expeditions ?? []).some(expedition => expeditionStage(game, expedition) !== 'done')) return null;
  const available = (mission: Mission) => !game.entries.some(entry => entry.kind === 'mission' && entry.itemId === mission.id);
  const photos = candidates.photos.filter(mission => !mission.location && mission.requiresPhoto && mission.requiresPeerValidation &&
    available(mission) && !game.photoSubmissions?.some(submission => submission.missionId === mission.id && submission.status === 'pending'));
  const cards = candidates.cards.filter(card => !entryFor(game, 'card', card.id));
  const photo = photos[Math.abs(seed) % photos.length];
  const card = cards[Math.abs(seed + 1) % cards.length];
  if (!photo || !card) return null;
  const finales = candidates.finales.filter(mission => !mission.location && !mission.requiresPhoto && !mission.requiresConsent &&
    mission.id !== photo.id && available(mission));
  const placeFinales = candidates.placeFinales.filter(mission => mission.location && game.visited.includes(mission.location) &&
    !mission.requiresPhoto && !mission.requiresConsent && available(mission));
  const first = placeFinales.length ? placeFinales[Math.abs(seed + 2) % placeFinales.length] : finales[Math.abs(seed + 2) % finales.length];
  const remaining = finales.filter(mission => mission.id !== first?.id);
  const second = remaining[Math.abs(seed + 3) % remaining.length];
  if (!first || !second) return null;
  const expedition: Expedition = {
    id, theme, setting, startedAt, photoMissionId: photo.id, cardId: card.id, finaleOptions: [first.id, second.id],
  };
  return { ...game, expeditions: [expedition, ...(game.expeditions ?? [])] };
}

export function drawExpeditionCard(game: Game, expeditionId: string, date: string): Game {
  const expedition = game.expeditions?.find(item => item.id === expeditionId);
  if (!expedition || expeditionStage(game, expedition) !== 'card' || game.draws.some(draw => draw.status === 'drawn')) return game;
  return { ...game, draws: [{ cardId: expedition.cardId, date, status: 'drawn' }, ...game.draws] };
}

export function chooseExpeditionBranch(game: Game, expeditionId: string, branch: Player): Game {
  const expedition = game.expeditions?.find(item => item.id === expeditionId);
  if (!expedition || expeditionStage(game, expedition) !== 'branch' || (branch !== 0 && branch !== 1)) return game;
  return { ...game, expeditions: game.expeditions!.map(item => item.id === expeditionId ? { ...item, branch } : item) };
}

export function choosePlaceStory(game: Game, placeId: string, choice: Player, date: string): Game {
  if (!game.visited.includes(placeId) || (choice !== 0 && choice !== 1)) return game;
  if (game.placeStories?.[placeId]?.choice === choice) return game;
  return { ...game, placeStories: { ...game.placeStories, [placeId]: { choice, date } } };
}

export function completePlaceStory(game: Game, placeId: string, response: string, date: string): Game {
  const story = game.placeStories?.[placeId];
  const answer = response.trim();
  if (!game.visited.includes(placeId) || !story || answer.length < 3 || answer.length > 120) return game;
  if (story.completedAt && story.response === answer) return game;
  return { ...game, placeStories: {
    ...game.placeStories,
    [placeId]: { ...story, response: answer, completedAt: date },
  } };
}
