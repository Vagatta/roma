import { z } from 'zod';
import { missions } from '../data/missions';
import { cards } from '../data/cards';
import type { Game, Entry, Player, Intensity, Mission, Card } from './types';

export const levels: Intensity[] = ['playful', 'flirty', 'sensual', 'daring'];
export const allowed = (game: Game, intensity: Intensity) => levels.indexOf(intensity) <= levels.indexOf(game.intensity);
const entrySchema = z.object({
  id: z.string(), kind: z.enum(['mission', 'card', 'secret', 'bonus']), itemId: z.string(),
  title: z.string(), player: z.union([z.literal(0), z.literal(1)]), points: z.number().nonnegative(),
  shared: z.number().nonnegative(), date: z.string(), scoreCategory: z.enum(['Adventure', 'Creativity', 'Chemistry', 'Daring', 'Cooperation']),
});
const duelCategorySchema = z.enum(['Rapidez', 'Memoria', 'Estimación', 'Creatividad', 'Estrategia', 'Farol'])
  .transform(category => category === 'Farol' ? 'Creatividad' : category);
export const gameSchema = z.object({
  version: z.literal(1), names: z.tuple([z.string().min(1), z.string().min(1)]),
  start: z.string().optional(), end: z.string().optional(), goal: z.number().int().min(1).max(300),
  intensity: z.enum(['playful', 'flirty', 'sensual', 'daring']), entries: z.array(entrySchema),
  draws: z.array(z.object({ cardId: z.string(), date: z.string(), status: z.enum(['drawn', 'completed', 'skipped']) })),
  favorites: z.array(z.string()), visited: z.array(z.string()),
  secrets: z.array(z.object({ id: z.string(), player: z.union([z.literal(0), z.literal(1)]), missionId: z.string(), revealed: z.boolean(), completed: z.boolean() })),
  unlocked: z.array(z.string()), doubleNext: z.boolean(), dailyPromptDate: z.string().optional(),
  photos: z.record(z.string(), z.string()).optional(),
  route: z.array(z.string()).optional(),
  favoritePhotos: z.array(z.string()).optional(),
  routeMoments: z.record(z.string(), z.enum(['morning', 'afternoon', 'evening'])).optional(),
  expenses: z.array(z.object({
    id: z.string(), day: z.string(), category: z.enum(['tickets', 'food', 'transport', 'other']),
    note: z.string(), amount: z.number().nonnegative(),
  })).optional(),
  dailyBudget: z.number().nonnegative().optional(),
  adultConfirmed: z.boolean().optional(),
  duel: z.object({
    target: z.number().int().min(1).max(20),
    scores: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
    rounds: z.array(z.object({
      id: z.string(), title: z.string(), category: duelCategorySchema,
      winner: z.union([z.literal(0), z.literal(1)]).nullable(), date: z.string(), detail: z.string().optional(),
    })),
    current: z.object({
      id: z.string(), title: z.string(), category: duelCategorySchema,
      prompt: z.string(), rules: z.string(),
      mechanic: z.enum(['timed', 'judged', 'estimate', 'memory', 'reflex', 'gesture']).optional(),
      duration: z.number().int().nonnegative().optional(),
      answer: z.number().optional(), memoryWords: z.array(z.string()).optional(),
      alternateWords: z.array(z.string()).optional(),
    }).optional(),
    turn: z.union([z.literal(0), z.literal(1)]),
  }).optional(),
  mystery: z.object({
    caseId: z.string().optional(),
    cluesFound: z.array(z.string()), turn: z.union([z.literal(0), z.literal(1)]),
    solved: z.boolean().optional(), attempts: z.number().int().nonnegative(), verdict: z.string().optional(),
  }).optional(),
});
export const KEY = 'roma-secret-game:v1';
export function readGame(): Game | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = gameSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // A broken save can still be exported manually from the recovery key.
  }
  if (raw) {
    try { localStorage.setItem(`${KEY}:recovery`, raw); } catch { /* Storage may be full or disabled. */ }
  }
  return null;
}
export function saveGame(game: Game) { localStorage.setItem(KEY, JSON.stringify(game)); }
const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function mergeRecords<T extends Record<string, unknown>>(base: T[], local: T[], remote: T[], keyOf: (item: T) => string): T[] {
  const toMap = (items: T[]) => new Map(items.map(item => [keyOf(item), item]));
  const baseMap = toMap(base);
  const localMap = toMap(local);
  const remoteMap = toMap(remote);
  const keys = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);
  const merged: T[] = [];
  for (const key of keys) {
    const baseItem = baseMap.get(key);
    const localItem = localMap.get(key);
    const remoteItem = remoteMap.get(key);
    const chosen = sameValue(localItem, baseItem) ? remoteItem : localItem;
    if (chosen) merged.push(chosen);
  }
  return merged;
}
function mergeSet(base: string[], local: string[], remote: string[]): string[] {
  const baseSet = new Set(base);
  const localSet = new Set(local);
  const result = new Set(remote.filter(value => !(baseSet.has(value) && !localSet.has(value))));
  for (const value of localSet) if (!baseSet.has(value)) result.add(value);
  return [...result];
}
export function mergeGameStates(base: Game, local: Game, remote: Game): Game {
  const merged = { ...remote };
  const fields = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  for (const field of fields) {
    const baseValue = (base as unknown as Record<string, unknown>)[field];
    const localValue = (local as unknown as Record<string, unknown>)[field];
    const remoteValue = (remote as unknown as Record<string, unknown>)[field];
    if (field === 'entries' || field === 'secrets') {
      (merged as unknown as Record<string, unknown>)[field] = mergeRecords(
        (baseValue ?? []) as Record<string, unknown>[],
        (localValue ?? []) as Record<string, unknown>[],
        (remoteValue ?? []) as Record<string, unknown>[],
        item => field === 'entries' ? `${item.kind}:${item.itemId}` : String(item.id),
      );
    } else if (field === 'expenses') {
      (merged as unknown as Record<string, unknown>)[field] = mergeRecords(
        (baseValue ?? []) as Record<string, unknown>[],
        (localValue ?? []) as Record<string, unknown>[],
        (remoteValue ?? []) as Record<string, unknown>[],
        item => String(item.id),
      );
    } else if (field === 'draws') {
      (merged as unknown as Record<string, unknown>)[field] = mergeRecords(
        (baseValue ?? []) as Record<string, unknown>[],
        (localValue ?? []) as Record<string, unknown>[],
        (remoteValue ?? []) as Record<string, unknown>[],
        item => `${item.cardId}:${item.date}`,
      );
    } else if (field === 'favorites' || field === 'visited' || field === 'unlocked' || field === 'favoritePhotos') {
      (merged as unknown as Record<string, unknown>)[field] = mergeSet(
        (baseValue ?? []) as string[],
        (localValue ?? []) as string[],
        (remoteValue ?? []) as string[],
      );
    } else if (field === 'photos' || field === 'routeMoments') {
      const baseObject = (baseValue ?? {}) as Record<string, unknown>;
      const localObject = (localValue ?? {}) as Record<string, unknown>;
      const remoteObject = (remoteValue ?? {}) as Record<string, unknown>;
      const mergedObject = { ...remoteObject };
      for (const key of new Set([...Object.keys(baseObject), ...Object.keys(localObject)])) {
        if (sameValue(localObject[key], baseObject[key])) continue;
        if (localObject[key] === undefined) delete mergedObject[key];
        else mergedObject[key] = localObject[key];
      }
      (merged as unknown as Record<string, unknown>)[field] = mergedObject;
    } else if (!sameValue(localValue, baseValue)) {
      (merged as unknown as Record<string, unknown>)[field] = localValue;
    }
  }
  return merged;
}
export function shareLink(game: Game): string {
  const bytes = new TextEncoder().encode(JSON.stringify(game));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${window.location.origin}/#join=${payload}`;
}
export function decodeShareLink(hash: string): Game | null {
  const match = hash.match(/^#join=([A-Za-z0-9_-]+)/);
  if (!match) return null;
  try {
    const base64 = match[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const parsed = gameSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
export function createGame(names: [string, string], goal: number, intensity: Intensity, start?: string, end?: string): Game {
  return { version: 1, names, goal, intensity, ...(start ? { start } : {}), ...(end ? { end } : {}),
    entries: [], draws: [], favorites: [], visited: [], secrets: [], unlocked: [], doubleNext: false, route: [], routeMoments: {}, expenses: [] };
}
export const missionEntries = (game: Game) => game.entries.filter(e => e.kind === 'mission' || e.kind === 'secret');
export const completedCount = (game: Game) => missionEntries(game).length;
export const playerScore = (game: Game, player: Player) => game.entries.reduce((sum, e) => sum + (e.player === player || e.shared > 0 ? e.points : 0), 0);
export const sharedScore = (game: Game) => game.entries.reduce((sum, e) => sum + e.shared, 0);
export const today = () => new Date().toLocaleDateString('en-CA');
export const todayCount = (game: Game) => missionEntries(game).filter(e => new Date(e.date).toLocaleDateString('en-CA') === today()).length;
export const uniqueId = () => crypto.randomUUID();
export const randomOne = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];
export function award(game: Game, item: Mission | Card, kind: Entry['kind'], player: Player, entryId = uniqueId()): Game {
  if (game.entries.some(e => e.kind === kind && e.itemId === item.id)) return game;
  const points = item.points * (game.doubleNext ? 2 : 1);
  const together = kind === 'card' || (kind === 'mission' && 'mode' in item && item.mode === 'together');
  const scoreCategory = 'scoreCategory' in item ? item.scoreCategory : item.deck === 'Roman Chaos' ? 'Creativity' : item.deck === 'Flirt Mode' ? 'Chemistry' : 'Daring';
  const entry: Entry = { id: entryId, kind, itemId: item.id, title: item.title, player, points,
    shared: together ? points : 0, date: new Date().toISOString(), scoreCategory };
  return { ...game, entries: [entry, ...game.entries], doubleNext: false };
}
export const achievementList = [
  { id: 'first', title: 'Primera misión', description: 'Completa tu primer reto.', icon: '✦', test: (g: Game) => completedCount(g) >= 1 },
  { id: 'night', title: 'Primera noche en Roma', description: 'Completa un reto del modo noche.', icon: '☾', test: (g: Game) => g.entries.some(e => missions.find(m => m.id === e.itemId)?.category === 'Night Mode') },
  { id: 'gelato', title: 'Maestro del helado', description: 'Completa la ruleta del gelato.', icon: '✧', test: (g: Game) => g.entries.some(e => e.itemId === 'm-2-2') },
  { id: 'explorer', title: 'Explorador romano', description: 'Visita tres destinos.', icon: '⌖', test: (g: Game) => g.visited.length >= 3 },
  { id: 'photo', title: 'Cazador de fotos', description: 'Completa tres misiones turísticas.', icon: '▣', test: (g: Game) => g.entries.filter(e => missions.find(m => m.id === e.itemId)?.category === 'Tourist Challenge').length >= 3 },
  { id: 'chaos', title: 'Maestro del caos', description: 'Completa tres misiones de caos italiano.', icon: '✳', test: (g: Game) => g.entries.filter(e => missions.find(m => m.id === e.itemId)?.category === 'Italian Chaos').length >= 3 },
  { id: 'flirt', title: 'Coqueteo desbloqueado', description: 'Completa una misión de coqueteo.', icon: '♡', test: (g: Game) => g.entries.some(e => missions.find(m => m.id === e.itemId)?.category === 'Flirt Mode') },
  { id: 'owl', title: 'Ave nocturna', description: 'Completa tres misiones del modo noche.', icon: '☽', test: (g: Game) => g.entries.filter(e => missions.find(m => m.id === e.itemId)?.category === 'Night Mode').length >= 3 },
  { id: 'agent', title: 'Agente secreto', description: 'Completa una misión secreta.', icon: '✺', test: (g: Game) => g.entries.some(e => e.kind === 'secret') },
  { id: 'five', title: 'Cinco misiones', description: 'Supera cinco retos.', icon: 'Ⅴ', test: (g: Game) => completedCount(g) >= 5 },
  { id: 'ten', title: 'Diez misiones', description: 'Supera diez retos.', icon: 'Ⅹ', test: (g: Game) => completedCount(g) >= 10 },
  { id: 'twenty', title: 'Veinte misiones', description: 'Supera veinte retos.', icon: 'ⅩⅩ', test: (g: Game) => completedCount(g) >= 20 },
  { id: 'thirty', title: 'Treinta misiones', description: 'Supera treinta retos.', icon: 'ⅩⅩⅩ', test: (g: Game) => completedCount(g) >= 30 },
  { id: 'day', title: 'Día de viaje perfecto', description: 'Completa tres misiones en un día.', icon: '☼', test: (g: Game) => Object.values(g.entries.filter(e => e.kind === 'mission' || e.kind === 'secret').reduce<Record<string, number>>((acc, e) => { const day = new Date(e.date).toLocaleDateString('en-CA'); acc[day] = (acc[day] ?? 0) + 1; return acc; }, {})).some(n => n >= 3) },
  { id: 'legend', title: 'Leyenda de Roma', description: 'Alcanza el objetivo del viaje.', icon: '♛', test: (g: Game) => completedCount(g) >= g.goal },
  { id: 'collector', title: 'Coleccionista de cartas', description: 'Completa cinco cartas sacadas.', icon: '◇', test: (g: Game) => g.entries.filter(e => e.kind === 'card').length >= 5 },
  { id: 'wanderer', title: 'El caminante', description: 'Visita al menos nueve lugares.', icon: '◎', test: (g: Game) => g.visited.length >= 9 },
  { id: 'surprise', title: 'Giro inesperado', description: 'Descubre una recompensa misteriosa.', icon: '★', test: (g: Game) => g.entries.some(e => e.itemId === 'mystery-reward') },
];
export function withAchievements(game: Game): Game {
  return { ...game, unlocked: achievementList.filter(a => a.test(game)).map(a => a.id) };
}
export const eligibleMissions = (game: Game) => missions.filter(m =>
  allowed(game, m.intensity) && (!m.location || game.visited.includes(m.location)) &&
  !game.entries.some(e => e.kind === 'mission' && e.itemId === m.id));
export const eligibleCards = (game: Game, deck: string) => cards.filter(c =>
  c.deck === deck && allowed(game, c.intensity) && (c.intensity !== 'daring' || game.adultConfirmed === true));
