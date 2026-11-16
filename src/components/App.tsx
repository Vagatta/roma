import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bell, BookOpen, Camera, Check, ChevronRight, Compass, Crosshair, Download, Heart, Link2, MapPin, Menu, RotateCcw, Search, Settings, ShieldCheck, Shuffle, Sparkles, Star, Upload, X } from 'lucide-react';
import { compressImage, createRoom, ensureAnonymousSession, fetchRoom, joinRoom, newRoomCode, pushRoom, roomLink, signedPhotoUrl, subscribeRoom, supabase, uploadPhoto } from '../lib/supabase';
import { getQueuedPhoto, listQueuedPhotos, queuePhoto, removeQueuedPhoto } from '../lib/offline';
import { missions } from '../data/missions';
import { cards } from '../data/cards';
import { mysteryCase } from '../data/modes';
import { locations, photo } from '../data/locations';
import { closestPlaceWithin } from '../lib/location';
import { achievementList, allowed, award, completedCount, createGame, decodeShareLink, eligibleCards, eligibleMissions, gameSchema, KEY, mergeGameStates, playerScore, randomOne, readGame, saveGame, shareLink, sharedScore, today, todayCount, uniqueId, withAchievements } from '../lib/game';
import type { Card, Category, Deck, ExpenseCategory, Game, Intensity, Mission, MysteryState, Player, TripExpense, TripMoment } from '../lib/types';
import { categoryLabel, deckLabel, difficultyLabel, drawStatusLabel, entryTitle, intensityLabel, scoreLabel } from '../lib/labels';
import RomeMap from './RomeMap';
import DuelPage from './DuelPage';

const nav = [
  { href: '/', label: 'Modos', icon: Compass },
  { href: '/duel', label: 'Duelo', icon: Sparkles },
  { href: '/mystery', label: 'Misterio', icon: BookOpen },
  { href: '/game', label: 'Roma', icon: MapPin },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];
const categories: Category[] = ['Tourist Challenge', 'Italian Chaos', 'Flirt Mode', 'Temptation Mode', 'Night Mode'];
const decks: Deck[] = ['Roman Chaos', 'Flirt Mode', 'Temptation'];
const deckImages = ['photo-1685562249871-8948aeda70a9', 'photo-1753086419993-af3c41c8f29b', 'photo-1554200856-55c05c342b96'];
const heroImage = 'photo-1552832230-c0197dd311b5';
const ROOM_KEY = 'roma-secret-game:room';
const INVITE_KEY = 'roma-secret-game:invite';
const rainSafeIds = new Set(['pantheon', 'vatican', 'santa-maria-maggiore', 'san-clemente']);
const momentLabels: Record<TripMoment, string> = { morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' };
const expenseLabels: Record<ExpenseCategory, string> = { tickets: 'Entradas', food: 'Comida', transport: 'Transporte', other: 'Otros' };

function Pill({ children }: { children: React.ReactNode }) { return <span className="eyebrow">{children}</span>; }
function Progress({ value, max }: { value: number; max: number }) { return <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><span style={{ transform: `scaleX(${Math.min(1, value / Math.max(1, max))})` }} /></div>; }
function SectionTitle({ title, aside }: { eyebrow?: string; title: string; aside?: React.ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2></div>{aside}</div>;
}

export default function App({ page }: { page: string }) {
  const [game, setGame] = useState<Game | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pendingJoin, setPendingJoin] = useState<Game | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ code: string; token: string } | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [queuedPhotoCount, setQueuedPhotoCount] = useState(0);
  const flushingPhotos = useRef(false);
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      if (roomCode && supabase) {
        void fetchRoom(roomCode).then(remote => {
          if (!remote) { setGame(current => current ? { ...current } : current); return; }
          const local = readGame() ?? remote;
          syncedGame.current = remote;
          setGame(current => mergeGameStates(remote, current ?? local, remote));
        });
      } else setGame(current => current ? { ...current } : current);
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [roomCode]);
  const syncedGame = useRef<Game | null>(null);
  const syncChain = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    const local = readGame();
    const params = new URLSearchParams(window.location.hash.slice(1));
    const inviteCode = params.get('room');
    const inviteToken = params.get('invite');
    if (inviteCode && inviteToken && supabase) {
      window.history.replaceState(null, '', window.location.pathname);
      setGame(local);
      setPendingInvite({ code: inviteCode, token: inviteToken });
      setReady(true);
      return;
    }
    const legacyInvite = decodeShareLink(window.location.hash);
    if (legacyInvite) {
      window.history.replaceState(null, '', window.location.pathname);
      setGame(local);
      setPendingJoin(legacyInvite);
      setReady(true);
      return;
    }
    setGame(local);
    const savedRoom = localStorage.getItem(ROOM_KEY);
    if (savedRoom && supabase && /^[0-9a-f-]{36}$/i.test(savedRoom)) {
      void (async () => {
        if (!navigator.onLine) {
          if (local) { syncedGame.current = local; setRoomCode(savedRoom); setGame(local); }
          setReady(true);
          return;
        }
        if (!await ensureAnonymousSession()) {
          setReady(true);
          notify('Activa el inicio de sesión anónimo en Supabase para conectar la sala.');
          return;
        }
        const remote = await fetchRoom(savedRoom);
        if (remote) {
          syncedGame.current = remote;
          setRoomCode(savedRoom);
          setGame(local ? mergeGameStates(remote, local, remote) : remote);
        } else {
          if (local) { syncedGame.current = local; setRoomCode(savedRoom); setGame(local); }
          notify('No se pudo conectar a la sala; se conserva la partida local.');
        }
        setReady(true);
      })();
      return;
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!roomCode || !supabase) return;
    const channel = subscribeRoom(roomCode, remote => {
      const base = syncedGame.current ?? remote;
      syncedGame.current = remote;
      setGame(current => mergeGameStates(base, current ?? remote, remote));
    });
    return () => { supabase!.removeChannel(channel); };
  }, [roomCode]);
  useEffect(() => {
    if (!ready || !game || !roomCode || !supabase) return;
    const base = syncedGame.current;
    if (!base) { syncedGame.current = game; return; }
    if (JSON.stringify(base) === JSON.stringify(game)) return;
    const sent = game;
    syncedGame.current = sent;
    syncChain.current = syncChain.current.then(async () => {
      const remote = await pushRoom(roomCode, base, sent);
      if (!remote) {
        syncedGame.current = base;
        if (navigator.onLine) notify('No se pudo sincronizar; comprobad la conexión.');
        return;
      }
      syncedGame.current = remote;
      setGame(current => current ? mergeGameStates(sent, current, remote) : remote);
    }).catch(() => notify('Error al sincronizar la partida.'));
  }, [game, ready, roomCode]);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const photos = game?.photos ?? {};
    const direct = Object.fromEntries(Object.entries(photos).filter(([, value]) => value.startsWith('data:') || value.startsWith('http')));
    setPhotoUrls(direct);
    for (const [id, path] of Object.entries(photos)) {
      if (path.startsWith('data:') || path.startsWith('http')) continue;
      if (path.startsWith('offline:')) {
        void getQueuedPhoto(id).then(queued => {
          if (!cancelled && queued) {
            const url = URL.createObjectURL(queued.blob);
            objectUrls.push(url);
            setPhotoUrls(current => ({ ...current, [id]: url }));
          }
        });
        continue;
      }
      void signedPhotoUrl(path).then(url => {
        if (!cancelled && url) setPhotoUrls(current => ({ ...current, [id]: url }));
      });
    }
    void listQueuedPhotos().then(queue => setQueuedPhotoCount(queue.length));
    return () => { cancelled = true; objectUrls.forEach(URL.revokeObjectURL); };
  }, [game?.photos, roomCode]);
  useEffect(() => {
    if (!ready || !isOnline || !roomCode || !supabase || flushingPhotos.current) return;
    let cancelled = false;
    void (async () => {
      flushingPhotos.current = true;
      let uploaded = 0;
      try {
        const queued = await listQueuedPhotos();
        for (const item of queued) {
          if (cancelled) break;
          const marker = `offline:${item.entryId}`;
          if (readGame()?.photos?.[item.entryId] !== marker) {
            await removeQueuedPhoto(item.entryId);
            continue;
          }
          const path = await uploadPhoto(roomCode, item.entryId, item.blob);
          if (!path) break;
          await removeQueuedPhoto(item.entryId);
          setGame(current => current?.photos?.[item.entryId] === marker
            ? { ...current, photos: { ...current.photos, [item.entryId]: path } }
            : current);
          uploaded += 1;
        }
        setQueuedPhotoCount((await listQueuedPhotos()).length);
        if (uploaded) notify(`${uploaded} ${uploaded === 1 ? 'foto subida' : 'fotos subidas'} al recuperar la conexión.`);
      } finally { flushingPhotos.current = false; }
    })();
    return () => { cancelled = true; };
  }, [ready, isOnline, roomCode]);
  const photoFor = (entryId: string) => photoUrls[entryId];
  const attachPhoto = async (entryId: string, file: File): Promise<boolean> => {
    try {
      const blob = await compressImage(file);
      let storedValue: string | null;
      let queued = false;
      if (roomCode && supabase && navigator.onLine) {
        storedValue = await uploadPhoto(roomCode, entryId, blob);
        if (!storedValue) {
          queued = await queuePhoto(entryId, blob);
          storedValue = queued ? `offline:${entryId}` : null;
        } else {
          const signed = await signedPhotoUrl(storedValue);
          if (signed) setPhotoUrls(current => ({ ...current, [entryId]: signed }));
        }
      } else if (!navigator.onLine) {
        queued = await queuePhoto(entryId, blob);
        storedValue = queued ? `offline:${entryId}` : null;
      } else {
        storedValue = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        setPhotoUrls(current => ({ ...current, [entryId]: storedValue! }));
      }
      if (!storedValue) { notify('No se pudo subir la foto'); return false; }
      if (queued) {
        setPhotoUrls(current => ({ ...current, [entryId]: URL.createObjectURL(blob) }));
        void listQueuedPhotos().then(queue => setQueuedPhotoCount(queue.length));
      }
      update(g => ({ ...g, photos: { ...(g.photos ?? {}), [entryId]: storedValue! } }), queued ? 'Foto guardada; se subirá al reconectar' : 'Foto guardada en el recuerdo');
      return true;
    } catch {
      notify('No se pudo subir la foto');
      return false;
    }
  };
  const shareGame = async () => {
    if (!game) return;
    if (supabase) {
      if (!await ensureAnonymousSession()) {
        notify('Activa el inicio de sesión anónimo en Supabase para crear la sala.');
        return;
      }
      const currentToken = roomCode ? localStorage.getItem(INVITE_KEY) : null;
      if (roomCode && !currentToken) {
        notify('Esta sala ya está unida a dos participantes y no admite más.');
        return;
      }
      const code = roomCode && /^[0-9a-f-]{36}$/i.test(roomCode) ? roomCode : newRoomCode();
      const token = currentToken ?? await createRoom(code, game);
      if (!token) { notify('No se pudo crear la sala.'); return; }
      if (!currentToken) {
        localStorage.setItem(ROOM_KEY, code);
        localStorage.setItem(INVITE_KEY, token);
        syncedGame.current = game;
        setRoomCode(code);
      }
      const link = roomLink(code, token);
      try {
        if (navigator.share) { await navigator.share({ title: 'ROMA · El juego secreto', url: link }); return; }
        await navigator.clipboard.writeText(link);
        notify('Enlace de sala copiado: sincronización protegida en directo');
      } catch {
        try { await navigator.clipboard.writeText(link); notify('Enlace de sala copiado'); }
        catch { notify(`No se pudo compartir. Código de sala: ${code}`); }
      }
      return;
    }
    const link = shareLink(game);
    try { await navigator.clipboard.writeText(link); notify('Enlace de invitación copiado'); } catch { notify('No se pudo copiar el enlace'); }
  };
  const acceptRoomInvite = async () => {
    if (!pendingInvite) return;
    if (!await ensureAnonymousSession()) {
      notify('Activa el inicio de sesión anónimo en Supabase para unirte.');
      return;
    }
    const joined = await joinRoom(pendingInvite.code, pendingInvite.token);
    if (!joined) {
      notify('El enlace no es válido o la sala ya tiene dos participantes.');
      return;
    }
    localStorage.setItem(ROOM_KEY, pendingInvite.code);
    localStorage.removeItem(INVITE_KEY);
    syncedGame.current = joined;
    setRoomCode(pendingInvite.code);
    setGame(withAchievements(joined));
    setPendingInvite(null);
    notify('Te has unido a la partida privada.');
  };
  useEffect(() => { if (ready && game) saveGame(game); }, [game, ready]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const notify = (message: string) => { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4300); };
  const update = (change: (previous: Game) => Game, message?: string) => {
    setGame(previous => {
      if (!previous) return null;
      const next = withAchievements(change(previous));
      const newUnlocks = next.unlocked.filter(id => !previous.unlocked.includes(id));
      if (newUnlocks.length) {
        const unlock = achievementList.find(a => a.id === newUnlocks[0]);
        setTimeout(() => notify(`✦ Logro desbloqueado: ${unlock?.title}`), 20);
      } else if (message) setTimeout(() => notify(message), 20);
      return next;
    });
  };
  const startGame = (names: [string, string], goal: number, intensity: Intensity, start?: string, end?: string) => {
    saveGame(createGame(names, goal, intensity, start, end));
    window.location.assign(page === 'home' ? '/' : `/${page}`);
  };
  if (!ready) return <div className="loading-shell"><span className="loading-mark">R</span><div className="skeleton" /></div>;

  const activeNavHref = page === 'home' ? '/' : ['missions', 'cards', 'map', 'memories', 'recap', 'achievements'].includes(page) ? '/game' : `/${page}`;
  const header = <header className="site-header">
    <a className="wordmark" href="/" aria-label="ROMA, inicio">ROMA <small>EL JUEGO SECRETO</small></a>
    <nav className="desktop-nav" aria-label="Navegación principal">{nav.map(item => <a key={item.href} href={item.href} className={activeNavHref === item.href ? 'active' : ''}>{item.label}</a>)}</nav>
    <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir menú">{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
  </header>;
  const bottom = <nav className="bottom-nav" aria-label="Navegación móvil">{nav.map(item => <a key={item.href} href={item.href} className={activeNavHref === item.href ? 'active' : ''}><item.icon size={20} strokeWidth={1.6} /><span>{item.label}</span></a>)}</nav>;
  const menu = mobileMenu && <div className="mobile-overlay"><button aria-label="Cerrar menú" onClick={() => setMobileMenu(false)}><X size={24} /></button>{[...nav, { href: '/missions', label: 'Misiones', icon: BookOpen }, { href: '/cards', label: 'Cartas', icon: Shuffle }, { href: '/map', label: 'Mapa', icon: MapPin }, { href: '/achievements', label: 'Logros', icon: Star }].map(item => <a href={item.href} key={item.href}>{item.label}<ArrowUpRight size={20} /></a>)}</div>;
  return <div className="app-shell">{header}{menu}{(!isOnline || queuedPhotoCount > 0) && <div className={`connection-banner ${isOnline ? 'pending' : 'offline'}`} role="status">{!isOnline ? 'Sin conexión · la partida se guarda en este dispositivo.' : `${queuedPhotoCount} ${queuedPhotoCount === 1 ? 'foto pendiente' : 'fotos pendientes'} de subir.`}</div>}{page === 'home' ?
    <Landing game={game} /> :
    game ? <main className="page-main">
      {page === 'game' && <Dashboard game={game} update={update} notify={notify} onPhoto={attachPhoto} photoFor={photoFor} />}
      {page === 'missions' && <Missions game={game} update={update} notify={notify} onPhoto={attachPhoto} />}
      {page === 'cards' && <Cards game={game} update={update} notify={notify} />}
      {page === 'map' && <MapPage game={game} update={update} />}
      {page === 'duel' && <DuelPage game={game} update={update} />}
      {page === 'mystery' && <MysteryPage game={game} update={update} />}
      {page === 'memories' && <Memories game={game} update={update} photoFor={photoFor} />}
      {page === 'recap' && <TripRecap game={game} photoFor={photoFor} notify={notify} />}
      {page === 'achievements' && <Achievements game={game} />}
      {page === 'settings' && <SettingsPage game={game} update={update} onImport={next => { setGame(withAchievements(next)); notify('Progreso importado correctamente'); }} notify={notify} onPhoto={attachPhoto} photoFor={photoFor} shareGame={shareGame} />}
    </main> : <StartGate page={page} onStart={startGame} />}
    {game && page !== 'home' && bottom}<footer className="footer"><span>ROMA · EL JUEGO SECRETO</span><span>{roomCode ? 'Sala compartida para dos.' : 'Progreso guardado en este dispositivo.'}</span></footer>
    {pendingJoin && <div className="modal-backdrop"><div className="detail-modal"><button className="modal-close" aria-label="Cerrar" onClick={() => setPendingJoin(null)}><X size={22} /></button><Pill>INVITACIÓN RECIBIDA</Pill><h2>Unirse a la partida</h2><p className="detail-description"><strong>{pendingJoin.names[0]}</strong> os ha invitado a jugar con <strong>{pendingJoin.names[1]}</strong>. Unirte sustituye la partida guardada en este dispositivo por una copia de la suya.</p><div className="complete-actions"><button className="button button-dark wide" onClick={() => { setGame(withAchievements(pendingJoin)); setPendingJoin(null); notify('¡Te has unido a la partida!'); }}>Unirme a la partida <Check size={17} /></button><button className="quiet-button" onClick={() => setPendingJoin(null)}>Seguir con mi partida actual</button></div></div></div>}
    {pendingInvite && <div className="modal-backdrop"><div className="detail-modal"><button className="modal-close" aria-label="Cerrar" onClick={() => setPendingInvite(null)}><X size={22} /></button><Pill>INVITACIÓN PRIVADA</Pill><h2>Unirse a la partida</h2><p className="detail-description">El enlace te invita a una sala privada para dos. Al unirte, la partida de este dispositivo se sustituirá por el progreso compartido.</p><div className="complete-actions"><button className="button button-dark wide" onClick={acceptRoomInvite}>Unirme a la partida <Check size={17} /></button><button className="quiet-button" onClick={() => setPendingInvite(null)}>Ahora no</button></div></div></div>}
    {toast && <div className={`toast ${toast.includes('Logro desbloqueado') ? 'celebration' : ''}`} role="status"><Sparkles size={18} />{toast}<button aria-label="Cerrar aviso" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}

type StartGame = (names: [string, string], goal: number, intensity: Intensity, start?: string, end?: string) => void;
type PhotoHandler = (entryId: string, file: File) => Promise<boolean>;
type PhotoResolver = (entryId: string) => string | undefined;

function PhotoButton({ entryId, photo, onPhoto, pending }: { entryId: string; photo?: string; onPhoto: PhotoHandler; pending?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return <>
    {photo ? <img className="entry-photo" src={photo} alt="Foto del recuerdo" onClick={() => ref.current?.click()} /> :
      <button className="icon-button photo-attach" aria-label={pending ? 'Foto pendiente de subir' : 'Añadir foto del recuerdo'} onClick={() => ref.current?.click()}><Camera size={16} /></button>}
    {pending && <small className="upload-pending">Pendiente</small>}
    <input ref={ref} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onPhoto(entryId, f); e.target.value = ''; }} />
  </>;
}

function StartGate({ page, onStart }: { page: string; onStart: StartGame }) {
  const [showStart, setShowStart] = useState(false);
  const chapters: Record<string, { title: string; description: string }> = {
    game: { title: 'La partida empieza aquí.', description: 'Poned vuestros apodos para llevar el marcador y guardar la aventura.' },
    missions: { title: 'Misiones por descubrir.', description: 'Cread vuestra partida para elegir retos y marcar los que completéis.' },
    cards: { title: 'La próxima carta os espera.', description: 'Cread vuestra partida para sacar cartas y conservar el historial.' },
    map: { title: 'Roma es vuestro tablero.', description: 'Cread vuestra partida para marcar los lugares que visitéis.' },
    duel: { title: 'El duelo empieza aquí.', description: 'Poned vuestros nombres y jugad por turnos: rapidez, memoria y estimación. El Duelo tiene su propio marcador.' },
    mystery: { title: 'Hay un caso por resolver.', description: 'Cread una partida para investigar pistas y resolver el misterio juntos.' },
    memories: { title: 'Vuestros recuerdos os esperan.', description: 'Cread una partida para guardar las fotos de vuestros retos.' },
    recap: { title: 'Vuestro capítulo romano.', description: 'Cread una partida para guardar el resumen de vuestro viaje.' },
    achievements: { title: 'Cada logro tiene su historia.', description: 'Cread vuestra partida para ir descubriendo vuestros logros.' },
    settings: { title: 'Vuestra partida, a vuestra manera.', description: 'Poned vuestros apodos para configurar el juego y guardar el progreso.' },
  };
  const chapter = chapters[page] ?? chapters.game!;
  return <main className="start-gate"><div className="start-gate-image" style={{ backgroundImage: `url(${photo(heroImage, 1200)})` }} /><div className="start-gate-content"><h1>{chapter.title}</h1><p>{chapter.description}</p><button className="button button-dark" onClick={() => setShowStart(true)}>Crear partida <ArrowUpRight size={18} /></button><a className="under-link" href="/">Elegir otro modo <ArrowRight size={16} /></a></div>{showStart && <StartModal onClose={() => setShowStart(false)} onStart={onStart} simple={page === 'duel' || page === 'mystery'} />}</main>;
}

function StartModal({ onClose, onStart, simple = false }: { onClose: () => void; onStart: StartGame; simple?: boolean }) {
  const [names, setNames] = useState<[string, string]>(['', '']);
  const [goal, setGoal] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>('flirty');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><form className="onboarding-modal" onSubmit={e => { e.preventDefault(); if (start && end && end < start) return; onStart([names[0].trim(), names[1].trim()], goal, simple ? 'playful' : intensity, start || undefined, end || undefined); }}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button><h2>Preparad la partida.</h2><p>Solo dos apodos. Sin cuentas ni preguntas personales.</p>
    <div className="form-grid"><label>JUGADOR 1<input required maxLength={24} placeholder="Tu apodo" value={names[0]} onChange={e => setNames([e.target.value, names[1]])} /></label><label>JUGADOR 2<input required maxLength={24} placeholder="Su apodo" value={names[1]} onChange={e => setNames([names[0], e.target.value])} /></label>{!simple && <><label>INICIO DEL VIAJE <span>OPCIONAL</span><input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>FIN DEL VIAJE <span>OPCIONAL</span><input type="date" min={start || undefined} value={end} onChange={e => setEnd(e.target.value)} /></label></>}</div>
    {!simple && <>{start && end && end < start && <p className="error">La fecha de fin debe ser posterior a la de inicio.</p>}
    <label className="full-label">OBJETIVO DE RETOS <input type="number" min="1" max="300" value={goal} onChange={e => setGoal(Number(e.target.value))} required /></label>
    <div className="full-label">ELEGID LA INTENSIDAD<div className="segmented">{(['playful', 'flirty', 'sensual', 'daring'] as Intensity[]).map(level => <button type="button" key={level} className={intensity === level ? 'chosen' : ''} onClick={() => setIntensity(level)}>{intensityLabel[level]}</button>)}</div></div>
    <p className="consent-copy"><ShieldCheck size={16} /> Los retos íntimos son solo para adultos y siempre opcionales. Cualquiera puede omitir un reto sin penalización.</p></>}<button type="submit" className="button button-dark wide">Crear partida <ArrowUpRight size={18} /></button>
  </form></div>;
}

function Landing({ game }: { game: Game | null }) {
  const modes = [
    { href: '/duel', number: '01', label: 'COMPETIR · PASAD EL MÓVIL', title: 'Duelo', description: 'Rondas por turnos de rapidez, memoria y estimación. Un punto por ronda; gana quien llegue primero a la meta.', status: game?.duel?.current ? 'Ronda en curso' : game?.duel?.rounds.length ? `${game.duel.scores[0]} — ${game.duel.scores[1]} · ${game.duel.rounds.length} ${game.duel.rounds.length === 1 ? 'ronda' : 'rondas'}` : 'Sin empezar', className: 'duel' },
    { href: '/mystery', number: '02', label: 'COOPERAR · CASO REAL', title: 'Misterio', description: 'Investigad juntos las fotografías de las hadas de Cottingley. Abrís pistas por turnos y debatís una hipótesis.', status: game?.mystery?.solved ? 'Caso resuelto' : game?.mystery?.cluesFound.length ? `${game.mystery.cluesFound.length} pistas abiertas` : 'Sin empezar', className: 'mystery' },
    { href: '/game', number: '03', label: 'PAQUETE OPCIONAL · ROMA', title: 'Roma', description: 'Misiones, cartas, mapa y recuerdos para cuando queráis jugar con la ciudad como tablero.', status: game?.entries.length ? `${completedCount(game)} retos completados` : 'Sin empezar', className: 'rome' },
  ];
  return <main className="mode-home">
    <header className="mode-home-intro"><Pill>ROMA · EL JUEGO SECRETO</Pill><h1>Elegid cómo <br /><em>queréis jugar.</em></h1><p>{game ? `Partida de ${game.names[0]} y ${game.names[1]}. Cada modo tiene sus propias reglas y progreso.` : 'Dos personas, una partida. Podéis competir, investigar juntos o jugar con Roma como escenario. No necesitáis viajar para empezar.'}</p></header>
    <section className="mode-home-list" aria-label="Modos de juego">{modes.map(mode => <a className={`mode-home-card ${mode.className}`} key={mode.href} href={mode.href}><span className="mode-home-number">{mode.number}</span><div><span className="eyebrow">{mode.label}</span><h2>{mode.title}</h2><p>{mode.description}</p><small>{game ? mode.status : 'Solo necesitáis dos apodos'}</small></div><span className="mode-home-arrow" aria-hidden="true"><ArrowUpRight size={25} /></span></a>)}</section>
    <p className="mode-home-note">La partida conserva vuestros nombres, pero los puntos del Duelo no se mezclan con los retos de Roma. El Misterio se resuelve en equipo.</p>
  </main>;
}

function Dashboard({ game, update, notify, onPhoto, photoFor }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; notify: (msg: string) => void; onPhoto: PhotoHandler; photoFor: PhotoResolver }) {
  const completed = completedCount(game);
  const [surprise, setSurprise] = useState('');
  const [activePlayer, setActivePlayer] = useState<Player>(0);
  const daily = eligibleMissions(game).find(m => !m.location) ?? eligibleMissions(game)[0];
  const secrets = game.secrets.filter(s => s.player === activePlayer);
  function newSecret() {
    const pool = missions.filter(m => m.mode === 'solo' && allowed(game, m.intensity) && !m.requiresConsent && (!m.location || game.visited.includes(m.location)) && !game.secrets.some(s => s.missionId === m.id && s.player === activePlayer));
    const pick = randomOne(pool);
    if (!pick) return notify('Ya habéis descubierto todas las misiones secretas.');
    update(g => ({ ...g, secrets: [{ id: uniqueId(), player: activePlayer, missionId: pick.id, revealed: false, completed: false }, ...g.secrets] }), 'Te espera una misión sellada.');
  }
  function triggerSurprise() {
    const kind = randomOne(['mission', 'double', 'card', 'special', 'achievement', 'reward'])!;
    if (kind === 'double') { update(g => ({ ...g, doubleNext: true }), 'Puntos dobles activados para el próximo reto.'); setSurprise('¡Puntos dobles! Vuestro próximo reto completado vale el doble.'); }
    if (kind === 'mission' || kind === 'special') {
      const pick = randomOne(eligibleMissions(game).filter(m => kind === 'mission' || m.difficulty === 'Hard')) ?? randomOne(eligibleMissions(game));
      setSurprise(pick ? `Misión sorpresa: ${pick.title} — ${pick.description}` : 'Habéis completado todas las misiones disponibles. Explorad el mapa para desbloquear más.');
    }
    if (kind === 'card') setSurprise('Una carta misteriosa os espera. Id a Cartas y sacad una de cualquier mazo.');
    if (kind === 'achievement') setSurprise(game.unlocked.includes('day') ? 'Reto extra: completad cinco cartas para conseguir Coleccionista de cartas.' : 'Reto extra: completad tres misiones hoy para conseguir Día de viaje perfecto.');
    if (kind === 'reward') {
      if (game.entries.some(e => e.itemId === 'mystery-reward')) { setSurprise('Ya encontrasteis la recompensa misteriosa. Como extra, elegid juntos el próximo desvío bonito.'); return; }
      update(g => ({ ...g, entries: [{ id: uniqueId(), kind: 'bonus', itemId: 'mystery-reward', title: 'Recompensa misteriosa', player: activePlayer, points: 20, shared: 20, date: new Date().toISOString(), scoreCategory: 'Cooperation' }, ...g.entries] }), '¡Recompensa misteriosa: 20 puntos compartidos!');
      setSurprise('Un poco de suerte romana: 20 puntos extra para los dos.');
    }
  }
  return <>
    <section className="dashboard-hero"><div className="dashboard-hero-content"><Pill>PAQUETE ROMA · RETOS Y LUGARES</Pill><h1>Cada día,<br /><em>una aventura.</em></h1><p>Aquí contáis misiones, cartas y destinos. El Duelo y el Misterio se juegan por separado.</p><div className="hero-actions"><a className="button button-gold" href="/missions">Buscar misión <span className="button-icon"><ArrowUpRight size={18} /></span></a><a href="/cards" className="text-link">Sacar una carta <ArrowRight size={16} /></a><a href="/map" className="text-link">Explorar mapa <ArrowRight size={16} /></a></div><a href="/" className="text-link">Elegir otro modo <ArrowRight size={16} /></a></div><div className="dashboard-hero-image" style={{ backgroundImage: `url(${photo('photo-1525874684015-58379d421a52', 1100)})` }} /></section>
    <section className="dashboard-content"><div className="dash-overview"><div className="progress-panel"><Pill>LA GRAN AVENTURA</Pill><div className="progress-main"><strong>{completed}<span>/{game.goal}</span></strong><div><h2>Historias por escribir.</h2><p>Faltan {Math.max(0, game.goal - completed)} retos para vuestro objetivo</p></div></div><Progress value={completed} max={game.goal} /><div className="progress-meta"><span>NIVEL {Math.floor(completed / 5) + 1} · {completed < 5 ? 'LA LLEGADA' : completed < 15 ? 'EXPLORADORES' : 'LEYENDAS'}</span><span>{Math.round(Math.min(100, completed / game.goal * 100))}% COMPLETADO</span></div></div>
      <div className="score-panel"><Pill>MARCADOR</Pill><div className="score-row"><span className="avatar">01</span><div><strong>{game.names[0]}</strong><small>JUGADOR 1</small></div><b>{playerScore(game, 0)}</b></div><div className="score-row"><span className="avatar second">02</span><div><strong>{game.names[1]}</strong><small>JUGADOR 2</small></div><b>{playerScore(game, 1)}</b></div><div className="shared-score"><span>✦ &nbsp; PUNTOS COMPARTIDOS</span><strong>{sharedScore(game)} PTS</strong></div><div className="score-categories">{(['Adventure', 'Creativity', 'Chemistry', 'Daring', 'Cooperation'] as const).map(category => <span key={category}>{scoreLabel[category]} <b>{game.entries.filter(e => e.scoreCategory === category).reduce((sum, e) => sum + e.points, 0)}</b></span>)}</div></div></div>
      <div className="dashboard-grid"><div className="dashboard-primary"><SectionTitle eyebrow="UNA PEQUEÑA IDEA" title="La invitación de hoy" aside={<span className="small-note">{todayCount(game)} COMPLETADAS HOY</span>} />
        {daily ? <div className="daily-card"><div className="daily-card-art" style={{ backgroundImage: `url(${photo('photo-1552832230-c0197dd311b5', 850)})` }} /><div className="daily-card-body"><Pill>RETO DEL DÍA · {categoryLabel[daily.category].toUpperCase()}</Pill><h3>{daily.title}</h3><p>{daily.description}</p><div className="card-bottom"><span>+{daily.points} PUNTOS · {daily.duration} MIN</span><a href={`/missions?mission=${daily.id}`} className="round-link" aria-label={`Abrir ${daily.title}`}><ArrowUpRight size={20} /></a></div></div></div> : <div className="empty-state">Habéis completado todas las misiones disponibles. Visitad nuevos lugares para encontrar más.</div>}
        <SectionTitle eyebrow="LA HISTORIA HASTA AHORA" title="Momentos recientes" aside={<span className="header-links"><a href="/recap" className="under-link">Resumen <ArrowUpRight size={15} /></a><a href="/memories" className="under-link">Galería <ArrowUpRight size={15} /></a></span>} />
        <div className="activity-list">{game.entries.slice(0, 4).length ? game.entries.slice(0, 4).map(e => <div className="activity-row" key={e.id}><span className="activity-symbol">✦</span><div><strong>{entryTitle(e, game)}</strong><small>{{ mission: 'MISIÓN', card: 'CARTA', secret: 'SECRETA', bonus: 'BONUS' }[e.kind]} · {new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</small></div><b>+{e.points}</b><PhotoButton entryId={e.id} photo={photoFor(e.id)} onPhoto={onPhoto} pending={game.photos?.[e.id]?.startsWith('offline:')} /></div>) : <div className="empty-state">Las mejores historias empiezan con un primer paso. Os toca.</div>}</div>
      </div><aside className="dashboard-aside"><div className="surprise-panel"><Sparkles size={22} strokeWidth={1.3} /><Pill>MEJOR SI ES INESPERADO</Pill><h3>Que decida<br />Roma.</h3><p>Deja que el azar le dé un giro al día.</p><button className="button button-light wide" onClick={triggerSurprise}>Sorpréndenos <Shuffle size={17} /></button>{surprise && <div className="surprise-result" role="status">{surprise}{surprise.includes('carta misteriosa') && <a href="/cards">Abrir cartas →</a>}</div>}</div>
        <div className="secret-panel"><Pill>SOLO PARA TUS OJOS</Pill><h3>De incógnito<br />en Roma.</h3><div className="player-switch">{game.names.map((name, i) => <button key={i} className={activePlayer === i ? 'chosen' : ''} onClick={() => setActivePlayer(i as Player)}>{name}</button>)}</div><p className="secret-caution">Pásale el móvil a {game.names[activePlayer]} antes de revelar la misión.</p>
          {secrets.filter(s => !s.completed).slice(0, 1).map(s => { const mission = missions.find(m => m.id === s.missionId); return <div className="secret-envelope" key={s.id}>{s.revealed ? <><strong>{mission?.title}</strong><p>{mission?.description}</p><button onClick={() => update(g => ({ ...g, secrets: g.secrets.map(x => x.id === s.id ? { ...x, completed: true } : x), entries: [{ id: uniqueId(), kind: 'secret', itemId: s.id, title: mission?.title ?? 'Misión secreta', player: activePlayer, points: 10, shared: 0, date: new Date().toISOString(), scoreCategory: 'Creativity' }, ...g.entries] }), '¡Misión secreta cumplida! +10 puntos')}>Marcar como completada <Check size={16} /></button></> : <button onClick={() => update(g => ({ ...g, secrets: g.secrets.map(x => x.id === s.id ? { ...x, revealed: true } : x) }))}>✉ &nbsp; Revelar misión secreta</button>}</div>; })}
          {!secrets.some(s => !s.completed) && <button className="secret-new" onClick={newSecret}>Generar misión secreta <ArrowUpRight size={16} /></button>}
          {secrets.some(s => s.completed) && <small>{secrets.filter(s => s.completed).length} misiones secretas completadas</small>}
        </div>
        <a href="/achievements" className="achievements-teaser"><span>VUESTRA VITRINA</span><strong>{game.unlocked.length} <small>/ {achievementList.length} DESBLOQUEADOS</small></strong><Progress value={game.unlocked.length} max={achievementList.length} /><span>Ver logros <ArrowUpRight size={16} /></span></a>
      </aside></div>
    </section>
  </>;
}

function Memories({ game, update, photoFor }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; photoFor: PhotoResolver }) {
  const [sortBy, setSortBy] = useState<'date' | 'place'>('date');
  const memories = game.entries.flatMap(entry => {
    if (!game.photos?.[entry.id]) return [];
    const locationId = missions.find(mission => mission.id === entry.itemId)?.location;
    const location = locations.find(place => place.id === locationId);
    return [{
      entry,
      title: entryTitle(entry, game),
      place: location?.name ?? 'Sin destino asociado',
      date: new Date(entry.date),
      url: photoFor(entry.id),
    }];
  }).sort((a, b) => sortBy === 'date'
    ? b.date.getTime() - a.date.getTime()
    : a.place.localeCompare(b.place, 'es') || b.date.getTime() - a.date.getTime());
  const groups = new Map<string, typeof memories>();
  for (const memory of memories) {
    const key = sortBy === 'date' ? memory.date.toLocaleDateString('es-ES', { dateStyle: 'long' }) : memory.place;
    groups.set(key, [...(groups.get(key) ?? []), memory]);
  }
  return <div className="content-wrap memories-wrap">
    <div className="page-heading"><Pill>VUESTRA HISTORIA EN IMÁGENES</Pill><h1>Recuerdos<br /><em>de Roma.</em></h1><p>Las fotos de los retos que habéis vivido juntos, guardadas en un solo lugar.</p></div>
    <div className="memories-toolbar"><span className="small-note">{memories.length} RECUERDOS</span><div className="segmented" aria-label="Ordenar recuerdos">{(['date', 'place'] as const).map(sort => <button key={sort} className={sortBy === sort ? 'chosen' : ''} onClick={() => setSortBy(sort)}>{sort === 'date' ? 'Por fecha' : 'Por lugar'}</button>)}</div></div>
    {!memories.length ? <div className="empty-state">Todavía no hay fotos en el álbum. Añadid una desde un reto completado o desde el historial.</div> :
      [...groups.entries()].map(([heading, items]) => <section className="memory-group" key={heading}><SectionTitle title={heading} aside={<span className="small-note">{items.length} {items.length === 1 ? 'FOTO' : 'FOTOS'}</span>} /><div className="memory-grid">{items.map(memory => <article className="memory-card" key={memory.entry.id}><div className={`memory-image ${memory.url ? '' : 'loading'}`}>{memory.url && <img src={memory.url} alt={`Recuerdo: ${memory.title}`} loading="lazy" />}<button className={`memory-favorite ${game.favoritePhotos?.includes(memory.entry.id) ? 'active' : ''}`} aria-label={game.favoritePhotos?.includes(memory.entry.id) ? 'Quitar de fotos favoritas' : 'Marcar como foto favorita'} onClick={() => update(g => ({ ...g, favoritePhotos: g.favoritePhotos?.includes(memory.entry.id) ? g.favoritePhotos.filter(id => id !== memory.entry.id) : [...(g.favoritePhotos ?? []), memory.entry.id] }))}><Heart size={18} fill={game.favoritePhotos?.includes(memory.entry.id) ? 'currentColor' : 'none'} /></button></div><div className="memory-caption"><Pill>{memory.place}</Pill><h3>{memory.title}</h3><span>{memory.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · {game.names[memory.entry.player]}</span></div></article>)}</div></section>)
    }
  </div>;
}

function TripRecap({ game, photoFor, notify }: { game: Game; photoFor: PhotoResolver; notify: (message: string) => void }) {
  const visited = locations.filter(place => game.visited.includes(place.id));
  const completed = game.entries.filter(entry => ['mission', 'card', 'secret'].includes(entry.kind));
  const favorites = game.favoritePhotos ?? [];
  const highlights = game.entries.filter(entry => game.photos?.[entry.id] && favorites.includes(entry.id)).slice(0, 4);
  const favoriteCards = cards.filter(card => game.favorites.includes(card.id));
  const favoriteTitles = highlights.map(entry => entryTitle(entry, game)).join(', ');
  const text = `Roma, nuestro juego secreto: ${game.names.join(' y ')} completamos ${completed.length} retos, visitamos ${visited.length} lugares y sumamos ${sharedScore(game)} puntos compartidos.${favoriteTitles ? ` Fotos favoritas: ${favoriteTitles}.` : ''}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Nuestro viaje a Roma', text });
      else { await navigator.clipboard.writeText(text); notify('Resumen copiado para compartir.'); }
    } catch { /* Compartir se puede cancelar desde el menú del dispositivo. */ }
  };
  return <div className="content-wrap recap-page">
    <div className="page-heading"><Pill>ROMA · VUESTRO CAPÍTULO</Pill><h1>Lo que vivimos<br /><em>juntos.</em></h1><p>Un pequeño resumen de las paradas, retos y recuerdos de vuestro viaje.</p></div>
    <div className="recap-stats"><div><strong>{visited.length}</strong><span>LUGARES</span></div><div><strong>{completed.length}</strong><span>RETOS</span></div><div><strong>{sharedScore(game)}</strong><span>PUNTOS COMPARTIDOS</span></div></div>
    <section className="recap-section"><SectionTitle title="Paradas romanas" /><div className="recap-places">{visited.length ? visited.map((place, i) => <span key={place.id}><b>{String(i + 1).padStart(2, '0')}</b>{place.name}</span>) : <p>Aún no hay destinos marcados como visitados.</p>}</div></section>
    <section className="recap-section"><SectionTitle title="Retos que completamos" /><div className="recap-challenges">{completed.slice(0, 8).map(entry => <span key={entry.id}>{entryTitle(entry, game)}</span>)}{!completed.length && <p>Vuestro primer reto todavía os espera.</p>}</div></section>
    {favoriteCards.length > 0 && <section className="recap-section"><SectionTitle title="Cartas favoritas" /><div className="recap-challenges">{favoriteCards.slice(0, 6).map(card => <span key={card.id}>{card.title}</span>)}</div></section>}
    {highlights.length > 0 && <section className="recap-section"><SectionTitle title="Fotos favoritas" /><div className="memory-grid">{highlights.map(entry => <figure className="memory-card" key={entry.id}><div className="memory-image">{photoFor(entry.id) && <img src={photoFor(entry.id)} alt={entryTitle(entry, game)} />}</div><figcaption className="memory-caption"><h3>{entryTitle(entry, game)}</h3></figcaption></figure>)}</div></section>}
    {!highlights.length && <p className="muted-copy">Elegid fotos favoritas desde la galería para incluirlas en el resumen imprimible.</p>}
    <div className="recap-actions"><button className="button button-dark" onClick={share}>Compartir resumen <ArrowUpRight size={17} /></button><button className="button button-outline" onClick={() => window.print()}>Imprimir / Guardar PDF <Download size={17} /></button></div>
  </div>;
}

function Missions({ game, update, notify, onPhoto }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; notify: (msg: string) => void; onPhoto: PhotoHandler }) {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initial = params.get('mission');
  const locationFilter = params.get('location');
  const locationName = locations.find(location => location.id === locationFilter)?.name;
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [selected, setSelected] = useState<Mission | null>(missions.find(m => m.id === initial) ?? null);
  const [player, setPlayer] = useState<Player>(0);
  const [consent, setConsent] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [sort, setSort] = useState('all');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const openMission = (m: Mission | null) => { setSelected(m); setConsent(false); setPhotoFile(null); setPhotoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); };
  const pickPhoto = (f: File | undefined) => { if (!f) return; setPhotoFile(f); setPhotoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); }); };
  const completeMission = async () => {
    if (!selected) return;
    const item = selected;
    const entryId = uniqueId();
    if (item.requiresPhoto && photoFile) {
      setSavingPhoto(true);
      const uploaded = await onPhoto(entryId, photoFile);
      setSavingPhoto(false);
      if (!uploaded) return;
    }
    update(g => award(g, item, 'mission', player, entryId), `¡Misión completada! +${item.points}${game.doubleNext ? ' × 2' : ''} puntos`);
    openMission(null);
  };
  const visible = missions.filter(m => (!locationFilter || m.location === locationFilter) && (filter === 'All' || m.category === filter) && allowed(game, m.intensity) && (sort !== 'available' || !game.entries.some(e => e.kind === 'mission' && e.itemId === m.id)) && (sort !== 'completed' || game.entries.some(e => e.kind === 'mission' && e.itemId === m.id)));
  const completed = game.entries.some(e => e.kind === 'mission' && e.itemId === selected?.id);
  const locked = !!selected?.location && !game.visited.includes(selected.location);
  return <div className="content-wrap"><div className="page-heading"><h1>{locationName ? <>Retos en <br /><em>{locationName}.</em></> : <>Elegid vuestra<br /><em>próxima historia.</em></>}</h1><p>{locationName ? 'Estos retos se desbloquean al visitar el lugar. Elegid uno para jugar.' : 'Algunas planeadas, otras inesperadas. Todas a vuestra manera.'}</p></div>
    <div className="list-toolbar"><div className="filter-scroll">{(['All', ...categories] as const).map(c => <button key={c} className={filter === c ? 'selected' : ''} onClick={() => setFilter(c)}>{c === 'All' ? 'Todas' : categoryLabel[c]}</button>)}</div><select aria-label="Filtrar por estado" value={sort} onChange={e => setSort(e.target.value)}><option value="all">Todas las misiones</option><option value="available">Sin completar</option><option value="completed">Completadas</option></select></div>
    <div className="mission-grid">{visible.map((m, i) => { const done = game.entries.some(e => e.kind === 'mission' && e.itemId === m.id); const unavailable = m.location && !game.visited.includes(m.location); return <button className={`mission-card ${done ? 'done' : ''}`} key={m.id} onClick={() => openMission(m)}><div className="mission-top"><span>{String(i + 1).padStart(2, '0')} / {categoryLabel[m.category].toUpperCase()}</span><span>{done ? '✓ HECHA' : unavailable ? '⌖ BLOQUEADA' : `${m.points} PTS`}</span></div><div className="mission-card-content"><span className="mission-glyph">{['✦', '✳', '♡', '◇', '☾'][categories.indexOf(m.category)]}</span><h3>{m.title}</h3><p>{m.description}</p></div><div className="mission-bottom"><span>{difficultyLabel[m.difficulty]} · {m.duration} MIN {m.mode === 'solo' ? '· INDIVIDUAL' : '· JUNTOS'}</span><ArrowUpRight size={19} /></div></button>; })}</div>
    {visible.length === 0 && <div className="empty-state">Por aquí no hay nada todavía. Prueba otro filtro o visita un lugar nuevo en el mapa.</div>}
    {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) openMission(null); }}><div className="detail-modal"><button className="modal-close" onClick={() => openMission(null)} aria-label="Cerrar"><X size={20} /></button><Pill>{categoryLabel[selected.category].toUpperCase()} · {difficultyLabel[selected.difficulty].toUpperCase()}</Pill><span className="detail-glyph">✦</span><h2>{selected.title}</h2><p className="detail-description">{selected.description}</p><div className="detail-facts"><span>◷ &nbsp; {selected.duration} MINUTOS</span><span>✦ &nbsp; +{selected.points} PUNTOS</span><span>{selected.mode === 'solo' ? 'UN JUGADOR' : 'JUGAD JUNTOS'}</span></div>
      {selected.location && <p className="location-hint"><MapPin size={16} /> {locations.find(l => l.id === selected.location)?.name} {locked && '· Visita este lugar o márcalo en el mapa para desbloquearlo.'}</p>}
      {selected.requiresConsent && <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Ambos estáis de acuerdo con esta interacción opcional ahora mismo. Podéis retirar vuestro consentimiento en cualquier momento.</label>}
      {!completed && !locked && <div className="complete-actions"><span>¿QUIÉN REGISTRA EL RETO?</span><div className="player-switch">{game.names.map((n, i) => <button key={i} className={player === i ? 'chosen' : ''} onClick={() => setPlayer(i as Player)}>{n}</button>)}</div>
        {selected.requiresPhoto && <div className="photo-require"><span className="photo-require-label"><Camera size={15} /> ESTE RETO PIDE FOTO</span>{photoPreview && <img className="photo-preview" src={photoPreview} alt="Vista previa del recuerdo" />}<label className="button button-outline photo-pick"><input type="file" accept="image/*" hidden onChange={e => pickPhoto(e.target.files?.[0])} />{photoPreview ? 'Cambiar foto' : 'Subir la foto del reto'} <Upload size={16} /></label></div>}
        <button className="button button-dark wide" disabled={savingPhoto || (selected.requiresConsent && !consent) || (selected.requiresPhoto && !photoFile)} onClick={completeMission}>{savingPhoto ? 'Subiendo foto…' : 'Marcar como completada'} {!savingPhoto && <Check size={18} />}</button></div>}
      {completed && <div className="complete-label"><Check size={18} /> Misión completada</div>}
      {locked && <a className="button button-dark wide" href="/map">Desbloquear en el mapa <ArrowUpRight size={18} /></a>}
      <button className="quiet-button" onClick={() => { setSelected(null); notify('Reto omitido. Nunca se pierden puntos por pasar.'); }}>Ahora no · pasar sin penalización</button>
    </div></div>}
  </div>;
}

function Cards({ game, update, notify }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; notify: (msg: string) => void }) {
  const pendingCard = cards.find(c => c.id === game.draws.find(d => d.status === 'drawn')?.cardId);
  const [deck, setDeck] = useState<Deck>(pendingCard?.deck ?? 'Roman Chaos');
  const [drawn, setDrawn] = useState<Card | null>(pendingCard ?? null);
  const [flipped, setFlipped] = useState(!!pendingCard);
  const [player, setPlayer] = useState<Player>(0);
  const [consent, setConsent] = useState(false);
  function draw() {
    if (drawn) update(g => ({ ...g, draws: g.draws.map((d, i) => i === 0 && d.status === 'drawn' ? { ...d, status: 'skipped' } : d) }));
    const pool = eligibleCards(game, deck);
    const last = game.draws[0]?.cardId ?? drawn?.id;
    const options = pool.filter(c => c.id !== last && !game.entries.some(e => e.kind === 'card' && e.itemId === c.id));
    const pick = randomOne(options.length ? options : pool.filter(c => c.id !== last));
    if (!pick) return notify('No hay cartas disponibles con esta intensidad. Cámbiala en Ajustes para ver más.');
    setFlipped(false); setDrawn(pick); setConsent(false);
    update(g => ({ ...g, draws: [{ cardId: pick.id, date: new Date().toISOString(), status: 'drawn' }, ...g.draws] }));
    setTimeout(() => setFlipped(true), 180);
  }
  const completed = !!drawn && game.entries.some(e => e.kind === 'card' && e.itemId === drawn.id);
  return <div className="content-wrap"><div className="page-heading"><h1>Dejadlo<br /><em>al azar.</em></h1><p>Elegid un mazo. Sacad una carta. Y a ver adónde os lleva la noche.</p></div>
    <div className="deck-selector">{decks.map((name, i) => <button key={name} className={`deck-option ${deck === name ? 'active' : ''}`} onClick={() => { if (drawn && !completed) update(g => ({ ...g, draws: g.draws.map(d => d.cardId === drawn.id && d.status === 'drawn' ? { ...d, status: 'skipped' } : d) })); setDeck(name); setDrawn(null); setFlipped(false); }} style={{ backgroundImage: `linear-gradient(0deg,rgba(30,17,20,.88),rgba(30,17,20,.08)),url(${photo(deckImages[i]!, 600)})` }}><strong>{deckLabel[name]}</strong></button>)}</div>
    <div className="draw-area"><div className="draw-copy"><Pill>EL MOMENTO DE LA VERDAD</Pill><h2>¿Qué os pedirá<br /><em>Roma hoy?</em></h2><p>Cada mazo tiene 20 propuestas distintas. Sin repeticiones inmediatas, sin presión y sin respuestas equivocadas.</p><button className="button button-dark" onClick={draw}><Shuffle size={17} /> {drawn ? 'Sacar otra carta' : 'Sacar una carta'} <span className="button-icon"><ArrowUpRight size={17} /></span></button><span className="draw-count">{game.draws.length} CARTAS SACADAS HASTA AHORA</span></div>
      <div className="card-stage"><div className={`physical-card ${flipped ? 'flipped' : ''}`}><div className="card-face card-back"><div className="card-frame"><span>ROMA · EL JUEGO SECRETO</span><strong>R<span>✦</span></strong><span>UNA INVITACIÓN OS ESPERA</span></div></div><div className="card-face card-front"><span className="card-label">{drawn && deckLabel[drawn.deck].toUpperCase()} · {drawn && difficultyLabel[drawn.difficulty].toUpperCase()}</span><span className="card-ornament">✦</span><h3>{drawn?.title}</h3><p>{drawn?.description}</p><span className="card-reward">✧ &nbsp; {drawn?.points} PUNTOS</span></div></div></div>
    </div>
    {drawn && flipped && <div className="card-actions"><div><strong>{deckLabel[drawn.deck]}</strong><span>{drawn.requiresConsent ? 'Interacción física opcional · requiere consentimiento mutuo' : 'Podéis hacerla a vuestra manera o pasar'}</span></div><div className="card-action-buttons"><button className={`icon-button ${game.favorites.includes(drawn.id) ? 'favorited' : ''}`} aria-label="Marcar carta como favorita" onClick={() => update(g => ({ ...g, favorites: g.favorites.includes(drawn.id) ? g.favorites.filter(id => id !== drawn.id) : [...g.favorites, drawn.id] }), 'Favoritos actualizados')}><Heart size={19} fill={game.favorites.includes(drawn.id) ? 'currentColor' : 'none'} /></button><button className="button button-outline" onClick={() => { update(g => ({ ...g, draws: g.draws.map(d => d.cardId === drawn.id && d.status === 'drawn' ? { ...d, status: 'skipped' } : d) }), 'Carta omitida sin penalización'); setDrawn(null); setFlipped(false); }}>Pasar</button><button className="button button-dark" disabled={completed} onClick={() => {
        if (drawn.requiresConsent && !consent) return notify('Confirmad primero el consentimiento mutuo.');
        update(g => ({ ...award(g, drawn, 'card', player), draws: g.draws.map(d => d.cardId === drawn.id && d.status === 'drawn' ? { ...d, status: 'completed' } : d) }), '¡Carta completada! Puntos añadidos a ambos jugadores.');
      }}>{completed ? 'Completada' : 'Completar'} <Check size={17} /></button></div></div>}
    {drawn && flipped && !completed && <div className="card-confirm"><span>¿Quién la registra?</span><div className="player-switch">{game.names.map((name, i) => <button key={i} className={player === i ? 'chosen' : ''} onClick={() => setPlayer(i as Player)}>{name}</button>)}</div>{drawn.requiresConsent && <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Ambos aceptáis libremente esta interacción opcional ahora mismo.</label>}</div>}
    <div className="history-section"><SectionTitle eyebrow="LAS CARTAS HAN HABLADO" title="Historial de cartas" aside={<span className="small-note">{game.favorites.length} FAVORITAS</span>} /><div className="activity-list">{game.draws.slice(0, 12).map((d, i) => { const c = cards.find(card => card.id === d.cardId); return <div className="activity-row" key={`${d.cardId}-${i}`}><span className="activity-symbol">◇</span><div><strong>{c?.description}</strong><small>{c && deckLabel[c.deck].toUpperCase()} · {new Date(d.date).toLocaleDateString('es-ES')}</small></div><b className="status-text">{drawStatusLabel[d.status].toUpperCase()}</b></div>; })}{!game.draws.length && <div className="empty-state">Vuestra primera carta os espera.</div>}</div></div>
  </div>;
}

function MapPage({ game, update }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void }) {
  const initialPlace = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('place');
  const [selected, setSelected] = useState<string>(locations.some(location => location.id === initialPlace) ? initialPlace! : 'colosseum');
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [visitFilter, setVisitFilter] = useState<'all' | 'visited' | 'pending'>('all');
  const [proximityActive, setProximityActive] = useState(false);
  const [nearbyPlace, setNearbyPlace] = useState<{ id: string; distance: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [notificationMessage, setNotificationMessage] = useState('');
  const locationWatch = useRef<number | null>(null);
  const lastArrival = useRef<string | null>(null);
  const route = game.route ?? [];
  const place = locations.find(l => l.id === selected) ?? locations[0]!;
  const placeMissions = missions.filter(m => m.location === place.id);
  const visiblePlaces = locations.filter(location => {
    const matchesSearch = `${location.name} ${location.area} ${location.description}`.toLowerCase().includes(search.trim().toLowerCase());
    const isVisited = game.visited.includes(location.id);
    return matchesSearch && (visitFilter === 'all' || (visitFilter === 'visited' ? isVisited : !isVisited));
  });
  useEffect(() => {
    if (visiblePlaces.length && !visiblePlaces.some(location => location.id === selected)) setSelected(visiblePlaces[0]!.id);
  }, [visiblePlaces, selected]);
  useEffect(() => () => {
    if (locationWatch.current !== null) navigator.geolocation?.clearWatch(locationWatch.current);
  }, []);
  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'visible' || locationWatch.current === null) return;
      navigator.geolocation?.clearWatch(locationWatch.current);
      locationWatch.current = null;
      setProximityActive(false);
      setLocationMessage('Detección pausada al dejar el mapa en segundo plano. Tócala para reanudar.');
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);
  const showArrivalNotification = (locationId: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
    const location = locations.find(item => item.id === locationId);
    if (!location) return;
    void navigator.serviceWorker.ready.then(registration => registration.showNotification(`Habéis llegado a ${location.name}`, {
      body: 'Toca para ver los retos disponibles en esta parada.',
      icon: '/favicon.svg',
      tag: `rome-arrival-${locationId}`,
      data: { url: `/map?place=${encodeURIComponent(locationId)}` },
    })).catch(() => setNotificationMessage('El navegador no pudo mostrar el aviso. El aviso dentro de la página seguirá disponible.'));
  };
  const toggleProximity = () => {
    if (locationWatch.current !== null) {
      navigator.geolocation.clearWatch(locationWatch.current);
      locationWatch.current = null;
      setProximityActive(false);
      setNearbyPlace(null);
      setLocationMessage('Detección detenida. No seguimos consultando tu ubicación.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage('Este navegador no ofrece acceso a la ubicación. Puedes seguir marcando las visitas manualmente.');
      return;
    }
    setLocationMessage('Esperando una señal GPS precisa…');
    locationWatch.current = navigator.geolocation.watchPosition(position => {
      if (document.visibilityState !== 'visible') return;
      const { latitude, longitude, accuracy } = position.coords;
      if (accuracy > 100) {
        setNearbyPlace(null);
        setLocationMessage('La señal tiene poca precisión. Espera al aire libre o marca la visita manualmente.');
        return;
      }
      const closest = closestPlaceWithin([latitude, longitude], locations, 120);
      if (!closest) {
        setNearbyPlace(null);
        setLocationMessage('');
        return;
      }
      setNearbyPlace({ id: closest.place.id, distance: Math.round(closest.distance) });
      setLocationMessage('');
      if (lastArrival.current !== closest.place.id) {
        lastArrival.current = closest.place.id;
        showArrivalNotification(closest.place.id);
      }
    }, error => {
      if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current);
      locationWatch.current = null;
      setProximityActive(false);
      setLocationMessage(error.code === error.PERMISSION_DENIED
        ? 'Ubicación denegada. Actívala en los ajustes del navegador o continúa marcando visitas manualmente.'
        : 'No se pudo obtener una posición precisa. Comprueba el GPS o marca la visita manualmente.');
    }, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 25_000 });
    setProximityActive(true);
  };
  const requestMobileNotifications = async () => {
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      setNotificationMessage(isIos
        ? 'En iPhone, añade la web a la pantalla de inicio y ábrela desde ese icono para activar avisos.'
        : 'Este navegador no admite avisos del sistema; verás los avisos dentro del mapa.');
      return;
    }
    if (isIos && !isInstalled) {
      setNotificationMessage('En iPhone, primero usa Compartir → Añadir a pantalla de inicio y abre ROMA desde el nuevo icono.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setNotificationMessage(permission === 'granted'
        ? 'Avisos activados en este móvil. La detección solo funciona mientras el mapa esté abierto.'
        : 'Avisos del sistema no activados. Los avisos dentro del mapa seguirán funcionando.');
      if (permission === 'granted' && nearbyPlace) showArrivalNotification(nearbyPlace.id);
    } catch {
      setNotificationMessage('No se pudieron activar los avisos. Puedes seguir usando los avisos dentro de la app.');
    }
  };
  const addToRoute = (id: string) => update(g => ({
    ...g,
    route: (g.route ?? []).includes(id) ? (g.route ?? []).filter(stop => stop !== id) : [...(g.route ?? []), id],
  }), route.includes(id) ? 'Destino eliminado de la ruta' : 'Destino añadido a la ruta');
  const mapsRoute = route.map(id => locations.find(location => location.id === id)).filter(Boolean);
  const mapDirections = mapsRoute.length > 1
    ? `https://www.google.com/maps/dir/?api=1&origin=${mapsRoute[0]!.coords.join(',')}&destination=${mapsRoute[mapsRoute.length - 1]!.coords.join(',')}&waypoints=${mapsRoute.slice(1, -1).map(stop => stop!.coords.join(',')).join('|')}`
    : '';
  return <div className="content-wrap"><div className="page-heading"><h1>Seguid el <br /><em>desvío bonito.</em></h1><p>Al llegar a una parada, desbloquead sus retos. La detección es opcional y se pausa al salir del mapa o bloquear la pantalla.</p></div>
    <section className="proximity-panel" aria-label="Detección de lugares cercanos">
      <div className="proximity-copy"><Pill>UBICACIÓN OPCIONAL · SOLO EN ESTE MÓVIL</Pill><h2>Jugar al llegar.</h2><p>Con permiso, buscamos destinos cercanos mientras el mapa está abierto. No guardamos ni compartimos tus coordenadas; solo se sincroniza la visita que confirmes.</p>
        {notificationPermission !== 'granted' && <p className="proximity-help">Para avisos en pantalla bloqueada, instala ROMA como app: “Añadir a pantalla de inicio” en iPhone o “Instalar app” en Android. Si no, el aviso aparecerá aquí.</p>}
      </div>
      <div className="proximity-actions">
        <button className="button button-dark" onClick={toggleProximity}><Crosshair size={17} />{proximityActive ? 'Detener detección' : 'Activar detección cerca'}</button>
        <button className="button button-outline" onClick={requestMobileNotifications} disabled={notificationPermission === 'granted'}><Bell size={16} />{notificationPermission === 'granted' ? 'Avisos activados' : 'Activar avisos del móvil'}</button>
      </div>
      {locationMessage && <p className="proximity-status" role="status">{locationMessage}</p>}
      {notificationMessage && <p className="proximity-status" role="status">{notificationMessage}</p>}
      {nearbyPlace && (() => {
        const nearby = locations.find(item => item.id === nearbyPlace.id)!;
        const visited = game.visited.includes(nearby.id);
        const distanceLabel = nearbyPlace.distance < 10 ? 'A MENOS DE 10 METROS' : `A UNOS ${Math.round(nearbyPlace.distance / 10) * 10} METROS`;
        return <div className="nearby-arrival" role="status"><div><span className="eyebrow">{distanceLabel}</span><h3>Habéis llegado a {nearby.name}.</h3><p>Confirmad la parada para desbloquear las misiones vinculadas.</p></div>
          {!visited ? <button className="button button-dark" onClick={() => update(g => ({ ...g, visited: [...new Set([...g.visited, nearby.id])] }), `Llegada a ${nearby.name} confirmada. Sus misiones están desbloqueadas.`)}>Confirmar llegada <MapPin size={16} /></button>
            : <a className="button button-dark" href={`/missions?location=${encodeURIComponent(nearby.id)}`}>Ver sus misiones <ArrowUpRight size={16} /></a>}
          <button className="quiet-button" onClick={() => setNearbyPlace(null)}>Ahora no</button>
        </div>;
      })()}
    </section>
    <div className="map-toolbar">
      <label className="map-search"><Search size={17} /><span className="sr-only">Buscar destino</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar lugar o barrio" /></label>
      <div className="filter-scroll" aria-label="Filtrar destinos">
        {(['all', 'pending', 'visited'] as const).map(filter => <button key={filter} className={visitFilter === filter ? 'selected' : ''} onClick={() => setVisitFilter(filter)}>{filter === 'all' ? 'Todos' : filter === 'pending' ? 'Pendientes' : 'Visitados'}</button>)}
      </div>
    </div>
    <div className="map-layout"><div className="map-holder"><RomeMap onSelect={setSelected} visited={game.visited} places={visiblePlaces} /></div><aside className="location-panel">{visiblePlaces.length ? <><div className="location-photo" style={{ backgroundImage: `url(${photo(place.image, 850)})` }}><span>{place.area.toUpperCase()} · ROMA</span></div><div className="location-info"><Pill>DESTINO {String(locations.indexOf(place) + 1).padStart(2, '0')} / {String(locations.length).padStart(2, '0')}</Pill><h2>{place.name}</h2><p>{place.description}</p><div className="location-meta"><span>DIFICULTAD {difficultyLabel[place.difficulty].toUpperCase()}</span><span>{placeMissions.length} MISIONES</span></div><button className={`button wide ${game.visited.includes(place.id) ? 'button-outline' : 'button-dark'}`} onClick={() => update(g => ({ ...g, visited: g.visited.includes(place.id) ? g.visited.filter(id => id !== place.id) : [...g.visited, place.id] }), game.visited.includes(place.id) ? 'Visita eliminada' : 'Destino desbloqueado')}>{game.visited.includes(place.id) ? 'Visitado ✓ · Deshacer' : 'Marcar como visitado'} <MapPin size={17} /></button><button className="button button-outline wide route-toggle" onClick={() => addToRoute(place.id)}>{route.includes(place.id) ? 'Quitar de mi ruta' : 'Añadir a mi ruta'} <Compass size={17} /></button><p className="map-footnote">GPS opcional. La ubicación no se guarda; solo el destino confirmado.</p></div></> : <div className="empty-state">No hay destinos con esos filtros. Cambia la búsqueda o muestra todos.</div>}</aside></div>
    <section className="route-planner"><div className="section-heading"><div><span className="eyebrow">VUESTRO PASEO, A VUESTRO RITMO</span><h2>Ruta para hoy</h2></div><span className="small-note">{route.length} PARADAS</span></div>
      {!mapsRoute.length ? <p className="muted-copy">Añadid destinos desde el mapa para preparar un recorrido.</p> : <ol className="route-stops">{mapsRoute.map((stop, index) => <li key={stop!.id}><span className="route-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{stop!.name}</strong><small>{missions.filter(mission => mission.location === stop!.id).length} misiones sugeridas</small><label className="route-moment"><span className="sr-only">Momento para {stop!.name}</span><select value={game.routeMoments?.[stop!.id] ?? (index < 2 ? 'morning' : index < 4 ? 'afternoon' : 'evening')} onChange={event => update(g => ({ ...g, routeMoments: { ...(g.routeMoments ?? {}), [stop!.id]: event.target.value as TripMoment } }))}>{Object.entries(momentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="route-actions">{index > 0 && <button aria-label={`Mover ${stop!.name} arriba`} onClick={() => update(g => { const next = [...(g.route ?? [])]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; return { ...g, route: next }; })}>↑</button>}{index < mapsRoute.length - 1 && <button aria-label={`Mover ${stop!.name} abajo`} onClick={() => update(g => { const next = [...(g.route ?? [])]; [next[index + 1], next[index]] = [next[index]!, next[index + 1]!]; return { ...g, route: next }; })}>↓</button>}<button aria-label={`Quitar ${stop!.name}`} onClick={() => addToRoute(stop!.id)}><X size={16} /></button></div><details className="route-missions"><summary>Ver misiones</summary>{missions.filter(mission => mission.location === stop!.id).map(mission => game.visited.includes(stop!.id) ? <a key={mission.id} href={`/missions?mission=${mission.id}`}>{mission.title} <ArrowUpRight size={13} /></a> : <span key={mission.id}>{mission.title} · visita la parada para desbloquearla</span>)}{!missions.some(mission => mission.location === stop!.id) && <small>Aún no hay misiones para esta parada.</small>}</details></li>)}</ol>}
      {mapsRoute.length > 1 && <div className="route-breaks"><span>PAUSAS SUGERIDAS</span><p><strong>Entre mañana y tarde:</strong> reservad un café o un almuerzo tranquilo cerca de la siguiente parada.</p><p><strong>Antes del paseo nocturno:</strong> dejad un rato libre para descansar y tomar agua.</p></div>}
      {mapDirections && <a className="button button-dark route-directions" href={mapDirections} target="_blank" rel="noreferrer">Abrir recorrido en Google Maps <ArrowUpRight size={16} /></a>}
    </section>
    <RainPlan game={game} update={update} />
    <BudgetPanel game={game} update={update} />
    <section className="places-section">
      <button className="destinations-toggle" aria-expanded={destinationsOpen} aria-controls="destinations-list" onClick={() => setDestinationsOpen(open => !open)}>
        <span><span className="eyebrow">ESCOGED LA PRÓXIMA PARADA</span><strong>Los destinos</strong></span>
        <span className="destinations-toggle-meta"><span className="small-note">{game.visited.length} / {locations.length} DESCUBIERTOS</span><ChevronRight size={20} /></span>
      </button>
      {destinationsOpen && <div className="places-grid" id="destinations-list">{visiblePlaces.map(loc => <button key={loc.id} className={selected === loc.id ? 'place-row active' : 'place-row'} onClick={() => { setSelected(loc.id); document.querySelector('.map-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span>{String(locations.indexOf(loc) + 1).padStart(2, '0')}</span><strong>{loc.name}</strong><small>{game.visited.includes(loc.id) ? '✓ VISITADO' : loc.area.toUpperCase()}</small><ChevronRight size={17} /></button>)}</div>}
    </section>
  </div>;
}

function RainPlan({ game, update }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void }) {
  const coveredStops = locations.filter(location => rainSafeIds.has(location.id));
  const indoorMissions = missions.filter(mission => mission.indoor && allowed(game, mission.intensity) && !game.entries.some(entry => entry.itemId === mission.id));
  return <details className="rain-plan"><summary><span><Pill>SI EL CIELO SE CIERRA</Pill><strong>Plan B por lluvia</strong></span><span className="small-note">PARADAS CUBIERTAS + RETOS DE INTERIOR</span></summary>
    <p className="muted-copy">Paradas con espacios interiores o cubiertos; comprobad horarios y acceso antes de salir.</p>
    <div className="rain-stop-list">{coveredStops.map(location => <div key={location.id}><strong>{location.name}</strong><span>{location.area}</span><button className="quiet-button" onClick={() => update(g => ({ ...g, route: (g.route ?? []).includes(location.id) ? g.route : [...(g.route ?? []), location.id] }), 'Parada cubierta añadida a la ruta')}>{(game.route ?? []).includes(location.id) ? 'En la ruta ✓' : 'Añadir a la ruta'}</button></div>)}</div>
    <div className="rain-missions"><span className="eyebrow">IDEAS PARA HACER A CUBIERTO</span>{indoorMissions.slice(0, 6).map(mission => <a key={mission.id} href={`/missions?mission=${mission.id}`}><span><strong>{mission.title}</strong><small>{mission.description}</small></span><ArrowUpRight size={16} /></a>)}</div>
  </details>;
}

function BudgetPanel({ game, update }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void }) {
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const day = today();
  const expenses = (game.expenses ?? []).filter(expense => expense.day === day);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const money = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const changeBudget = (value: string) => {
    if (!value) { update(g => ({ ...g, dailyBudget: undefined })); return; }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) update(g => ({ ...g, dailyBudget: parsed }));
  };
  const addExpense = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    const expense: TripExpense = { id: uniqueId(), day, category, note: note.trim() || expenseLabels[category], amount: parsedAmount };
    update(g => ({ ...g, expenses: [expense, ...(g.expenses ?? [])] }), 'Gasto aproximado guardado');
    setAmount('');
    setNote('');
  };
  return <section className="budget-panel">
    <div className="section-heading"><div><span className="eyebrow">SIN SORPRESAS AL FINAL DEL DÍA</span><h2>Presupuesto de hoy</h2></div><span className="budget-total">{money(total)}</span></div>
    <div className="budget-limit"><label>Tope orientativo diario (€)<input type="number" min="0" step="1" value={game.dailyBudget ?? ''} placeholder="Sin límite" onChange={event => changeBudget(event.target.value)} /></label>{game.dailyBudget !== undefined ? <span>{game.dailyBudget >= total ? `${money(game.dailyBudget - total)} disponibles` : `${money(total - game.dailyBudget)} por encima del tope`}</span> : <span>Estimación manual, no hace falta registrar cada compra.</span>}</div>
    <form className="expense-form" onSubmit={addExpense}>
      <label>Tipo<select value={category} onChange={event => setCategory(event.target.value as ExpenseCategory)}>{Object.entries(expenseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Importe (€)<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="12,00" /></label>
      <label>Nota<input maxLength={48} value={note} onChange={event => setNote(event.target.value)} placeholder="Museo, almuerzo…" /></label>
      <button className="button button-dark" type="submit">Añadir gasto <Check size={16} /></button>
    </form>
    <div className="expense-list">{expenses.map(expense => <div key={expense.id}><span>{expenseLabels[expense.category]} · {expense.note}</span><strong>{money(expense.amount)}</strong><button className="quiet-button" aria-label={`Eliminar gasto ${expense.note}`} onClick={() => update(g => ({ ...g, expenses: (g.expenses ?? []).filter(item => item.id !== expense.id) }))}><X size={15} /></button></div>)}{!expenses.length && <p className="muted-copy">Aún no habéis anotado gastos de hoy.</p>}</div>
  </section>;
}

function MysteryPage({ game, update }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void }) {
  const empty: MysteryState = { caseId: mysteryCase.id, cluesFound: [], turn: 0, attempts: 0 };
  const state: MysteryState = game.mystery?.caseId === mysteryCase.id ? game.mystery : empty;
  const [wrongGuess, setWrongGuess] = useState(false);
  const reveal = (id: string) => update(g => {
    const current = g.mystery?.caseId === mysteryCase.id ? g.mystery : empty;
    if (current.cluesFound.includes(id)) return g;
    return { ...g, mystery: { ...current, cluesFound: [...current.cluesFound, id], turn: current.turn === 0 ? 1 : 0 } };
  });
  const accuse = (verdict: string) => {
    const correct = verdict === mysteryCase.answer;
    setWrongGuess(!correct);
    update(g => {
      const current = g.mystery?.caseId === mysteryCase.id ? g.mystery : empty;
      return { ...g, mystery: { ...current, attempts: current.attempts + 1, verdict, solved: correct } };
    });
  };
  const reset = () => { setWrongGuess(false); update(g => ({ ...g, mystery: { ...empty } })); };
  return <div className="content-wrap mode-page mystery-page">
    <div className="page-heading"><Pill>CASO REAL · INVESTIGACIÓN HISTÓRICA</Pill><h1>Las hadas<br /><em>de Cottingley.</em></h1><p>{mysteryCase.intro}</p><span className="case-period">{mysteryCase.period} · ENGAÑO FOTOGRÁFICO, NO DELITO</span></div>
    <section className="case-brief"><Pill>EXPEDIENTE ABIERTO</Pill><p>Vuestra tarea: separar testimonios, prestigio y evidencia material. Revelad las pistas por turnos y elegid una explicación antes de abrir la resolución.</p></section>
    <section className="case-section"><SectionTitle title="Cronología" /><div className="case-timeline">{mysteryCase.timeline.map(item => <article key={item.year}><b>{item.year}</b><p>{item.text}</p></article>)}</div></section>
    <section className="case-section"><SectionTitle title="Personas del expediente" /><div className="case-cast">{mysteryCase.cast.map(person => <article key={person.name}><strong>{person.name}</strong><p>{person.role}</p></article>)}</div></section>
    {state.solved ? <section className="mode-panel case-resolution"><Pill>RESOLUCIÓN DOCUMENTADA · INTENTO {state.attempts}</Pill><h2>La explicación era una composición preparada.</h2><p>{mysteryCase.reveal}</p><button className="button button-dark" onClick={reset}>Reabrir el expediente <RotateCcw size={16} /></button></section> : <>
      <section className="case-section"><div className="section-heading"><div><span className="eyebrow">REVELADLAS ALTERNANDO</span><h2>Pistas del expediente</h2></div><span className="small-note">TURNO DE {game.names[state.turn].toUpperCase()} · {state.cluesFound.length}/{mysteryCase.leads.length}</span></div><div className="clue-list">{mysteryCase.leads.map((lead, index) => <article className={state.cluesFound.includes(lead.id) ? 'revealed' : ''} key={lead.id}><div className="clue-heading"><small>DOCUMENTO {String(index + 1).padStart(2, '0')} · {lead.year}</small><h3>{lead.title}</h3></div>{state.cluesFound.includes(lead.id) ? <><p>{lead.clue}</p><em>{lead.question}</em></> : <button className="button button-outline" onClick={() => reveal(lead.id)}>Abrir pista</button>}</article>)}</div></section>
      {state.cluesFound.length === mysteryCase.leads.length && <section className="mode-panel accusation"><Pill>DELIBERAD JUNTOS</Pill><h2>¿Qué explicación encaja con las pistas?</h2>{mysteryCase.verdicts.map(option => <button key={option.id} onClick={() => accuse(option.id)}>{option.title}</button>)}{wrongGuess && <p className="mode-feedback">Esa hipótesis no coincide con lo que se reveló después. Revisad vuestras conclusiones e intentad otra vez.</p>}</section>}
    </>}
    <section className="case-sources"><SectionTitle title="Fuentes del caso" /><p>La historia y la resolución se basan en colecciones y publicaciones de instituciones que conservan material del caso.</p>{mysteryCase.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={15} /></a>)}</section>
  </div>;
}

function Achievements({ game }: { game: Game }) {
  return <div className="content-wrap"><div className="page-heading"><h1>Coleccionad<br /><em>lo inolvidable.</em></h1><p>Los logros se desbloquean al explorar y completar retos.</p></div><div className="achievement-banner"><span className="banner-glyph">✺</span><div><h2>{game.unlocked.length} de {achievementList.length} desbloqueados</h2><p>Seguid explorando. El próximo logro está a la vuelta de la esquina.</p><Progress value={game.unlocked.length} max={achievementList.length} /></div></div><div className="achievement-grid">{achievementList.map(a => { const unlocked = game.unlocked.includes(a.id); return <div className={`achievement-card ${unlocked ? 'unlocked' : ''}`} key={a.id}><span className="achievement-glyph">{a.icon}</span><span className="achievement-state">{unlocked ? '✦ DESBLOQUEADO' : '◇ POR DESCUBRIR'}</span><h3>{a.title}</h3><p>{a.description}</p></div>; })}</div></div>;
}

function SettingsPage({ game, update, onImport, notify, onPhoto, photoFor, shareGame }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; onImport: (g: Game) => void; notify: (msg: string) => void; onPhoto: PhotoHandler; photoFor: PhotoResolver; shareGame: () => void }) {
  const [names, setNames] = useState(game.names);
  const [goal, setGoal] = useState(game.goal);
  const [intensity, setIntensity] = useState(game.intensity);
  const [start, setStart] = useState(game.start ?? '');
  const [end, setEnd] = useState(game.end ?? '');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  function exportProgress() {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `roma-progreso-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  async function importProgress(file?: File) {
    if (!file) return;
    try { const result = gameSchema.safeParse(JSON.parse(await file.text())); if (!result.success) throw new Error(); onImport(result.data); setNames(result.data.names); setGoal(result.data.goal); setIntensity(result.data.intensity); setStart(result.data.start ?? ''); setEnd(result.data.end ?? ''); }
    catch { notify('No se pudo importar: el archivo no contiene un progreso válido de ROMA.'); }
    if (fileRef.current) fileRef.current.value = '';
  }
  return <div className="content-wrap settings-wrap"><div className="page-heading"><h1>Vuestro juego.<br /><em>A vuestra manera.</em></h1><p>Ajustad la aventura siempre que queráis.</p></div><div className="settings-layout"><div className="settings-card"><SectionTitle eyebrow="LOS DOS JUGADORES" title="Datos de la partida" /><form onSubmit={e => { e.preventDefault(); if (start && end && end < start) return notify('La fecha de fin debe ser posterior a la de inicio.'); update(g => ({ ...g, names: [names[0].trim(), names[1].trim()], goal, intensity, ...(start ? { start } : { start: undefined }), ...(end ? { end } : { end: undefined }) }), 'Ajustes guardados'); }}><div className="form-grid"><label>JUGADOR 1<input required maxLength={24} value={names[0]} onChange={e => setNames([e.target.value, names[1]])} /></label><label>JUGADOR 2<input required maxLength={24} value={names[1]} onChange={e => setNames([names[0], e.target.value])} /></label><label>INICIO DEL VIAJE<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>FIN DEL VIAJE<input type="date" min={start || undefined} value={end} onChange={e => setEnd(e.target.value)} /></label></div><label className="full-label">OBJETIVO DE RETOS<input type="number" min={1} max={300} required value={goal} onChange={e => setGoal(Number(e.target.value))} /></label><div className="full-label">INTENSIDAD DEL JUEGO<div className="segmented">{(['playful', 'flirty', 'sensual', 'daring'] as Intensity[]).map(level => <button type="button" key={level} className={intensity === level ? 'chosen' : ''} onClick={() => setIntensity(level)}>{intensityLabel[level]}</button>)}</div></div><p className="consent-copy"><ShieldCheck size={16} /> Las actividades íntimas siempre son opcionales. Pasar nunca resta puntos.</p><button className="button button-dark" type="submit">Guardar cambios <Check size={17} /></button></form></div>
      <aside className="settings-aside"><div className="settings-card"><SectionTitle eyebrow="A BUEN RECAUDO" title="Vuestro progreso" /><p>La partida se guarda en este dispositivo y, al crear una sala privada, se sincroniza entre sus dos participantes.</p><button className="settings-action" onClick={shareGame}><Link2 size={19} /> Invitar al segundo jugador <ArrowUpRight size={17} /></button><button className="settings-action" onClick={exportProgress}><Download size={19} /> Exportar progreso <ArrowUpRight size={17} /></button><button className="settings-action" onClick={() => fileRef.current?.click()}><Upload size={19} /> Importar progreso <ArrowUpRight size={17} /></button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => importProgress(e.target.files?.[0])} /><p className="settings-note">Importar sustituye el progreso actual. En salas, el acceso y las fotos compartidas quedan limitados a sus dos participantes.</p></div>
      <div className="settings-card danger-card"><SectionTitle eyebrow="EMPEZAR DE CERO" title="Reiniciar partida" /><p>Esto eliminará permanentemente de este dispositivo las puntuaciones, misiones completadas y logros.</p>{confirmReset ? <div className="reset-confirm"><button className="button button-outline" onClick={() => setConfirmReset(false)}>Cancelar</button><button className="button button-danger" onClick={() => { localStorage.removeItem(KEY); window.location.href = '/'; }}>Sí, borrar partida</button></div> : <button className="settings-action" onClick={() => setConfirmReset(true)}><RotateCcw size={18} /> Reiniciar progreso <ArrowUpRight size={17} /></button>}</div></aside></div>
      <div className="history-section"><SectionTitle eyebrow="POR SI HAY DESPISTES" title="Corregir puntuación" /><p className="muted-copy">Eliminad una finalización accidental. Los puntos y logros se actualizarán automáticamente.</p><div className="activity-list">{game.entries.map(e => <div className="activity-row" key={e.id}><span className="activity-symbol">✦</span><div><strong>{entryTitle(e, game)}</strong><small>{game.names[e.player]} · {new Date(e.date).toLocaleString('es-ES')}</small></div><b>+{e.points}</b><PhotoButton entryId={e.id} photo={photoFor(e.id)} onPhoto={onPhoto} pending={game.photos?.[e.id]?.startsWith('offline:')} /><button className="remove-entry" aria-label={`Eliminar ${entryTitle(e, game)}`} onClick={() => update(g => ({ ...g, entries: g.entries.filter(item => item.id !== e.id), ...(e.kind === 'card' ? { draws: g.draws.map(d => d.cardId === e.itemId && d.status === 'completed' ? { ...d, status: 'skipped' } : d) } : {}), ...(e.kind === 'secret' ? { secrets: g.secrets.map(s => s.id === e.itemId ? { ...s, completed: false } : s) } : {}) }), 'Registro eliminado y puntuaciones corregidas')}><X size={17} /></button></div>)}{!game.entries.length && <div className="empty-state">El historial de puntuación aparecerá aquí.</div>}</div></div>
    </div>;
}
