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
export const gameSchema = z.object({
  version: z.literal(1), names: z.tuple([z.string().min(1), z.string().min(1)]),
  start: z.string().optional(), end: z.string().optional(), goal: z.number().int().min(1).max(300),
  intensity: z.enum(['playful', 'flirty', 'sensual', 'daring']), entries: z.array(entrySchema),
  draws: z.array(z.object({ cardId: z.string(), date: z.string(), status: z.enum(['drawn', 'completed', 'skipped']) })),
  favorites: z.array(z.string()), visited: z.array(z.string()),
  secrets: z.array(z.object({ id: z.string(), player: z.union([z.literal(0), z.literal(1)]), missionId: z.string(), revealed: z.boolean(), completed: z.boolean() })),
  unlocked: z.array(z.string()), doubleNext: z.boolean(), dailyPromptDate: z.string().optional(),
  photos: z.record(z.string(), z.string()).optional(),
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
export function shareLink(game: Game): string {
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(game)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${window.location.origin}/#join=${payload}`;
}
export function decodeShareLink(hash: string): Game | null {
  const match = hash.match(/^#join=([A-Za-z0-9_-]+)/);
  if (!match) return null;
  try {
    const parsed = gameSchema.safeParse(JSON.parse(decodeURIComponent(escape(atob(match[1]!.replace(/-/g, '+').replace(/_/g, '/'))))));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
export function createGame(names: [string, string], goal: number, intensity: Intensity, start?: string, end?: string): Game {
  return { version: 1, names, goal, intensity, ...(start ? { start } : {}), ...(end ? { end } : {}),
    entries: [], draws: [], favorites: [], visited: [], secrets: [], unlocked: [], doubleNext: false };
}
export const missionEntries = (game: Game) => game.entries.filter(e => e.kind === 'mission' || e.kind === 'secret');
export const completedCount = (game: Game) => missionEntries(game).length;
export const playerScore = (game: Game, player: Player) => game.entries.reduce((sum, e) => sum + (e.player === player || e.shared > 0 ? e.points : 0), 0);
export const sharedScore = (game: Game) => game.entries.reduce((sum, e) => sum + e.shared, 0);
export const today = () => new Date().toLocaleDateString('en-CA');
export const todayCount = (game: Game) => missionEntries(game).filter(e => new Date(e.date).toLocaleDateString('en-CA') === today()).length;
export const uniqueId = () => crypto.randomUUID();
export const randomOne = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];
export function award(game: Game, item: Mission | Card, kind: Entry['kind'], player: Player): Game {
  if (game.entries.some(e => e.kind === kind && e.itemId === item.id)) return game;
  const points = item.points * (game.doubleNext ? 2 : 1);
  const together = kind === 'card' || (kind === 'mission' && 'mode' in item && item.mode === 'together');
  const scoreCategory = 'scoreCategory' in item ? item.scoreCategory : item.deck === 'Roman Chaos' ? 'Creativity' : item.deck === 'Flirt Mode' ? 'Chemistry' : 'Daring';
  const entry: Entry = { id: uniqueId(), kind, itemId: item.id, title: item.title, player, points,
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
  { id: 'wanderer', title: 'El caminante', description: 'Visita los nueve lugares.', icon: '◎', test: (g: Game) => g.visited.length >= 9 },
  { id: 'surprise', title: 'Giro inesperado', description: 'Descubre una recompensa misteriosa.', icon: '★', test: (g: Game) => g.entries.some(e => e.itemId === 'mystery-reward') },
];
export function withAchievements(game: Game): Game {
  return { ...game, unlocked: achievementList.filter(a => a.test(game)).map(a => a.id) };
}
export const eligibleMissions = (game: Game) => missions.filter(m =>
  allowed(game, m.intensity) && (!m.location || game.visited.includes(m.location)) &&
  !game.entries.some(e => e.kind === 'mission' && e.itemId === m.id));
export const eligibleCards = (game: Game, deck: string) => cards.filter(c => c.deck === deck && allowed(game, c.intensity));
