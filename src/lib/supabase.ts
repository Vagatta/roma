import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { gameSchema } from './game';
import type { Game } from './types';

const env = import.meta.env as Record<string, string | undefined>;
const url = env.PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
const key = env.PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newRoomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
export const roomLink = (code: string) => `${window.location.origin}/#room=${code}`;

export async function createRoom(code: string, game: Game): Promise<boolean> {
  const { error } = await supabase!.from('rooms').upsert({ code, state: game, updated_at: new Date().toISOString() });
  return !error;
}
export async function fetchRoom(code: string): Promise<Game | null> {
  const { data } = await supabase!.from('rooms').select('state').eq('code', code).maybeSingle();
  const parsed = data && gameSchema.safeParse((data as { state: unknown }).state);
  return parsed && parsed.success ? parsed.data : null;
}
export async function pushRoom(code: string, game: Game): Promise<void> {
  await supabase!.from('rooms').update({ state: game, updated_at: new Date().toISOString() }).eq('code', code);
}
export function subscribeRoom(code: string, onState: (game: Game) => void) {
  return supabase!.channel(`room:${code}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, payload => {
      const parsed = gameSchema.safeParse((payload.new as { state: unknown }).state);
      if (parsed.success) onState(parsed.data);
    })
    .subscribe();
}

export async function uploadPhoto(code: string, entryId: string, file: Blob): Promise<string | null> {
  const path = `${code}/${entryId}.jpg`;
  const { error } = await supabase!.storage.from('photos').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
  if (error) return null;
  return `${supabase!.storage.from('photos').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

export async function compressImage(file: File, maxSize = 900, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', quality));
}
