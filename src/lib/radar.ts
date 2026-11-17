import type { Game, Player, RadarPick } from './types';

export const RADAR_ROUNDS = 7;

export function radarQuestionIndex(seed: number, round: number, questionCount: number): number {
  return (seed + round * 5) % questionCount;
}

export function startRadar(game: Game, id: string, seed: number): Game {
  return { ...game, radar: { id, seed, round: 0 } };
}

export function radarRoundPicks(game: Game, round: number): [RadarPick | null, RadarPick | null] {
  const picks = (game.radarPicks ?? []).filter(pick => pick.sessionId === game.radar?.id && pick.round === round);
  return [picks.find(pick => pick.player === 0) ?? null, picks.find(pick => pick.player === 1) ?? null];
}

export function submitRadarPick(game: Game, sessionId: string, round: number, player: Player, answer: number, prediction: number, bet: boolean, date: string): Game {
  if (game.radar?.id !== sessionId || game.radar.round !== round || round >= RADAR_ROUNDS) return game;
  if (![answer, prediction].every(value => Number.isInteger(value) && value >= 0 && value <= 2)) return game;
  if (radarRoundPicks(game, round)[player]) return game;
  const pick: RadarPick = {
    id: `${sessionId}:${round}:${player}`, sessionId, round, player, answer, prediction,
    bet: round === RADAR_ROUNDS - 1 && bet, date,
  };
  return { ...game, radarPicks: [pick, ...(game.radarPicks ?? [])] };
}

export function radarRoundPoints(pick: RadarPick, opponent: RadarPick): number {
  const correct = pick.prediction === opponent.answer;
  if (pick.round === RADAR_ROUNDS - 1 && pick.bet) return correct ? 4 : -2;
  return correct ? 2 : 0;
}

export function radarScores(game: Game): [number, number] {
  const scores: [number, number] = [0, 0];
  for (let round = 0; round < RADAR_ROUNDS; round += 1) {
    const [first, second] = radarRoundPicks(game, round);
    if (first && second) {
      scores[0] += radarRoundPoints(first, second);
      scores[1] += radarRoundPoints(second, first);
    }
  }
  return scores;
}

export function advanceRadar(game: Game, sessionId: string, round: number): Game {
  if (game.radar?.id !== sessionId || game.radar.round !== round || round >= RADAR_ROUNDS - 1) return game;
  const [first, second] = radarRoundPicks(game, round);
  return first && second ? { ...game, radar: { ...game.radar, round: round + 1 } } : game;
}
