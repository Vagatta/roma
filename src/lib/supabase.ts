import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { gameSchema } from './game';
import type { Game } from './types';

const env = import.meta.env as Record<string, string | undefined>;
const url = env.PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
const key = env.PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export async function ensureAnonymousSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  const { error } = await supabase.auth.signInAnonymously();
  return !error;
}

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const digest = async (token: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
};
export const newRoomCode = () => crypto.randomUUID();
export const roomLink = (code: string, token: string) =>
  `${window.location.origin}/#room=${encodeURIComponent(code)}&invite=${encodeURIComponent(token)}`;

export async function createRoom(code: string, game: Game, existingToken?: string): Promise<string | null> {
  const token = existingToken ?? randomToken();
  const { error } = await supabase!.rpc('create_room', {
    p_code: code,
    p_invite_hash: await digest(token),
    p_state: game,
  });
  return error ? null : token;
}

export async function joinRoom(code: string, token: string): Promise<Game | null> {
  const { data, error } = await supabase!.rpc('join_room', { p_code: code, p_invite_token: token });
  if (error || !data) return null;
  const state = typeof data === 'object' && 'state' in data ? data.state : data;
  const parsed = gameSchema.safeParse(state);
  return parsed.success ? parsed.data : null;
}

export async function fetchRoom(code: string): Promise<Game | null> {
  const { data, error } = await supabase!.from('rooms').select('state').eq('code', code).maybeSingle();
  if (error || !data) return null;
  const parsed = gameSchema.safeParse((data as { state: unknown }).state);
  return parsed.success ? parsed.data : null;
}

export async function pushRoom(code: string, base: Game, next: Game): Promise<Game | null> {
  const { data, error } = await supabase!.rpc('merge_room_state', {
    p_code: code,
    p_base: base,
    p_next: next,
  });
  if (error || !data) return null;
  const parsed = gameSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function subscribeRoom(code: string, onState: (game: Game) => void) {
  return supabase!.channel(`room:${code}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, payload => {
      const parsed = gameSchema.safeParse((payload.new as { state: unknown }).state);
      if (parsed.success) onState(parsed.data);
    })
    .subscribe();
}

export async function uploadPhoto(code: string, entryId: string, file: Blob): Promise<string | null> {
  const path = `${code}/${entryId}.jpg`;
  const { error } = await supabase!.storage.from('photos').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
  return error ? null : path;
}

export async function signedPhotoUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

export async function compressImage(file: File, maxSize = 900, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', quality));
}
