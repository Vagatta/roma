export type Intensity = 'playful' | 'flirty' | 'sensual' | 'daring';
export type Category = 'Tourist Challenge' | 'Italian Chaos' | 'Flirt Mode' | 'Temptation Mode' | 'Night Mode';
export type Deck = 'Roman Chaos' | 'Flirt Mode' | 'Temptation';
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Special';
export type ScoreCategory = 'Adventure' | 'Creativity' | 'Chemistry' | 'Daring' | 'Cooperation';
export type Player = 0 | 1;
export type TripMoment = 'morning' | 'afternoon' | 'evening';
export type ExpenseCategory = 'tickets' | 'food' | 'transport' | 'other';
export interface TripExpense { id: string; day: string; category: ExpenseCategory; note: string; amount: number; }
export type DuelCategory = 'Rapidez' | 'Memoria' | 'Estimación' | 'Creatividad' | 'Estrategia';
export type DuelMechanic = 'timed' | 'judged' | 'estimate' | 'memory' | 'reflex' | 'gesture';
export interface DuelChallenge {
  id: string; title: string; category: DuelCategory; prompt: string; rules: string;
  mechanic?: DuelMechanic; duration?: number; answer?: number;
  memoryWords?: string[]; alternateWords?: string[];
}
export interface DuelResult { id: string; title: string; category: DuelCategory; winner: Player | null; date: string; detail?: string; }
export interface DuelState { target: number; scores: [number, number]; rounds: DuelResult[]; current?: DuelChallenge; turn: Player; }
export interface MysteryState { caseId?: string; cluesFound: string[]; turn: Player; solved?: boolean; attempts: number; verdict?: string; }
export interface Mission {
  id: string; title: string; description: string; category: Category; difficulty: Difficulty;
  points: number; duration: number; intensity: Intensity; location?: string;
  requiresConsent: boolean; requiresPhoto?: boolean; indoor?: boolean; mode: 'solo' | 'together'; scoreCategory: ScoreCategory;
}
export interface Card {
  id: string; title: string; description: string; deck: Deck; difficulty: Difficulty;
  points: number; intensity: Intensity; requiresConsent: boolean;
}
export interface Entry {
  id: string; kind: 'mission' | 'card' | 'secret' | 'bonus'; itemId: string; title: string;
  player: Player; points: number; shared: number; date: string; scoreCategory: ScoreCategory;
}
export interface Secret { id: string; player: Player; missionId: string; revealed: boolean; completed: boolean; }
export interface Draw { cardId: string; date: string; status: 'drawn' | 'completed' | 'skipped'; }
export interface Game {
  version: 1; names: [string, string]; start?: string; end?: string; goal: number; intensity: Intensity;
  entries: Entry[]; draws: Draw[]; favorites: string[]; visited: string[]; secrets: Secret[];
  unlocked: string[]; doubleNext: boolean; dailyPromptDate?: string; photos?: Record<string, string>; route?: string[]; favoritePhotos?: string[];
  routeMoments?: Record<string, TripMoment>; expenses?: TripExpense[]; dailyBudget?: number;
  adultConfirmed?: boolean;
  duel?: DuelState;
  mystery?: MysteryState;
}
