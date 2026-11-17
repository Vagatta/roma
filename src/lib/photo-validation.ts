import type { Game, Mission, PhotoSubmission, Player } from './types';

export function queuePhotoSubmission(game: Game, mission: Pick<Mission, 'id' | 'requiresPeerValidation'>, player: Player, id: string, submittedAt: string): Game {
  if (!mission.requiresPeerValidation || game.entries.some(entry => entry.kind === 'mission' && entry.itemId === mission.id)) return game;
  if (game.photoSubmissions?.some(submission => submission.missionId === mission.id && submission.status === 'pending')) return game;
  const submission: PhotoSubmission = { id, missionId: mission.id, player, status: 'pending', submittedAt };
  return { ...game, photoSubmissions: [submission, ...(game.photoSubmissions ?? [])] };
}

export function decidePhotoSubmission(game: Game, id: string, reviewer: Player, approved: boolean, decidedAt: string): Game {
  const submission = game.photoSubmissions?.find(item => item.id === id);
  if (!submission || submission.status !== 'pending' || submission.player === reviewer) return game;
  const photoSubmissions = game.photoSubmissions!.map(item => item.id === id
    ? { ...item, status: approved ? 'approved' as const : 'rejected' as const, decidedBy: reviewer, decidedAt }
    : item);
  return { ...game, photoSubmissions };
}
