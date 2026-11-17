import type { DuelChallenge, DuelResult, Player } from './types';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function validSpeedAnswers(answers: string[], confirmed: boolean, used: string[] = []): boolean {
  const normalized = answers.map(normalize);
  const previouslyUsed = new Set(used.map(normalize));
  return confirmed && normalized.length === 3 && normalized.every(Boolean)
    && new Set(normalized).size === 3 && normalized.every(word => !previouslyUsed.has(word));
}

export function countRecalled(input: string, words: string[]): number {
  const answers = new Set(input.split(/[,;\n]+/).map(normalize).filter(Boolean));
  return words.filter(word => answers.has(normalize(word))).length;
}

export function higherScore(first: number, second: number): 0 | 1 | null {
  return first === second ? null : first > second ? 0 : 1;
}

export function closestEstimate(first: number, second: number, answer: number): 0 | 1 | null {
  return higherScore(-Math.abs(first - answer), -Math.abs(second - answer));
}

export function fastestReaction(first: number[], second: number[]): Player | null {
  if (!first.length || !second.length) return null;
  const average = (times: number[]) => times.reduce((total, time) => total + time, 0) / times.length;
  return higherScore(-average(first), -average(second));
}

export type Gesture = 'piedra' | 'papel' | 'tijera';
export function gestureWinner(first: Gesture, second: Gesture): Player | null {
  if (first === second) return null;
  const beats: Record<Gesture, Gesture> = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
  return beats[first] === second ? 0 : 1;
}

export function chooseDuelChallenge(
  challenges: DuelChallenge[],
  rounds: DuelResult[],
  random: () => number = Math.random,
): DuelChallenge | undefined {
  const byId = new Map(challenges.map(challenge => [challenge.id, challenge]));
  const challengeId = (round: DuelResult) => round.id.split(':')[0] ?? round.id;
  const recentIds = new Set(rounds.map(challengeId));
  const recentMechanics = new Set(rounds.slice(0, 2)
    .map(round => byId.get(challengeId(round))?.mechanic)
    .filter((mechanic): mechanic is NonNullable<DuelChallenge['mechanic']> => Boolean(mechanic)));
  const unused = challenges.filter(challenge => !recentIds.has(challenge.id));
  const fresh = unused.filter(challenge => !recentMechanics.has(challenge.mechanic ?? 'timed'));
  const candidates = fresh.length ? fresh : unused.length ? unused : challenges;
  const mechanics = [...new Set(candidates.map(challenge => challenge.mechanic ?? 'timed'))];
  const mechanic = mechanics[Math.min(mechanics.length - 1, Math.floor(random() * mechanics.length))];
  const pool = candidates.filter(challenge => (challenge.mechanic ?? 'timed') === mechanic);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
