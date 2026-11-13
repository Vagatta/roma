import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Camera, Check, ChevronRight, Compass, Download, Heart, Link2, MapPin, Menu, RotateCcw, Settings, ShieldCheck, Shuffle, Sparkles, Star, Upload, X } from 'lucide-react';
import { compressImage, createRoom, fetchRoom, newRoomCode, pushRoom, roomLink, subscribeRoom, supabase, uploadPhoto } from '../lib/supabase';
import { missions } from '../data/missions';
import { cards } from '../data/cards';
import { locations, photo } from '../data/locations';
import { achievementList, allowed, award, completedCount, createGame, decodeShareLink, eligibleCards, eligibleMissions, gameSchema, KEY, playerScore, randomOne, readGame, saveGame, shareLink, sharedScore, today, todayCount, uniqueId, withAchievements } from '../lib/game';
import type { Card, Category, Deck, Game, Intensity, Mission, Player } from '../lib/types';
import { categoryLabel, deckLabel, difficultyLabel, drawStatusLabel, entryTitle, intensityLabel, scoreLabel } from '../lib/labels';
import RomeMap from './RomeMap';

const nav = [
  { href: '/game', label: 'Inicio', icon: Compass },
  { href: '/missions', label: 'Misiones', icon: BookOpen },
  { href: '/cards', label: 'Cartas', icon: Shuffle },
  { href: '/map', label: 'Mapa', icon: MapPin },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];
const categories: Category[] = ['Tourist Challenge', 'Italian Chaos', 'Flirt Mode', 'Temptation Mode', 'Night Mode'];
const decks: Deck[] = ['Roman Chaos', 'Flirt Mode', 'Temptation'];
const deckImages = ['photo-1685562249871-8948aeda70a9', 'photo-1753086419993-af3c41c8f29b', 'photo-1554200856-55c05c342b96'];
const heroImage = 'photo-1552832230-c0197dd311b5';

function Pill({ children }: { children: React.ReactNode }) { return <span className="eyebrow">{children}</span>; }
function Progress({ value, max }: { value: number; max: number }) { return <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><span style={{ transform: `scaleX(${Math.min(1, value / Math.max(1, max))})` }} /></div>; }
function SectionTitle({ title, aside }: { eyebrow?: string; title: string; aside?: React.ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2></div>{aside}</div>;
}

export default function App({ page }: { page: string }) {
  const [game, setGame] = useState<Game | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pendingJoin, setPendingJoin] = useState<Game | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const remoteSync = useRef(false);
  const ROOM_KEY = 'roma-secret-game:room';
  useEffect(() => {
    const roomMatch = window.location.hash.match(/^#room=([A-Z0-9]{6})/i);
    if (roomMatch && supabase) {
      const code = roomMatch[1]!.toUpperCase();
      window.history.replaceState(null, '', window.location.pathname);
      fetchRoom(code).then(invited => {
        const local = readGame();
        if (invited) {
          localStorage.setItem(ROOM_KEY, code); setRoomCode(code);
          if (local && JSON.stringify(local) !== JSON.stringify(invited)) setPendingJoin(invited);
          else setGame(invited);
        } else { setGame(local); notify('Sala no encontrada; sigues en tu partida local.'); }
        setReady(true);
      });
      return;
    }
    const invited = decodeShareLink(window.location.hash);
    const local = readGame();
    if (invited) {
      window.history.replaceState(null, '', window.location.pathname);
      if (local && JSON.stringify(local) !== JSON.stringify(invited)) setPendingJoin(invited);
      else setGame(invited);
    } else {
      setGame(local);
      const savedRoom = localStorage.getItem(ROOM_KEY);
      if (savedRoom && supabase) setRoomCode(savedRoom);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!roomCode || !supabase) return;
    const channel = subscribeRoom(roomCode, remote => { remoteSync.current = true; setGame(remote); });
    return () => { supabase!.removeChannel(channel); };
  }, [roomCode]);
  useEffect(() => {
    if (!ready || !game || !roomCode || !supabase) return;
    if (remoteSync.current) { remoteSync.current = false; return; }
    pushRoom(roomCode, game);
  }, [game, ready, roomCode]);
  const attachPhoto = async (entryId: string, file: File) => {
    const blob = await compressImage(file);
    const url = roomCode && supabase
      ? await uploadPhoto(roomCode, entryId, blob)
      : await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
    if (!url) return notify('No se pudo subir la foto');
    update(g => ({ ...g, photos: { ...(g.photos ?? {}), [entryId]: url } }), 'Foto guardada en el recuerdo');
  };
  const shareGame = async () => {
    if (!game) return;
    if (supabase) {
      const code = roomCode ?? newRoomCode();
      if (await createRoom(code, game)) {
        localStorage.setItem(ROOM_KEY, code); setRoomCode(code);
        const link = roomLink(code);
        try { if (navigator.share) { await navigator.share({ title: 'ROMA · El juego secreto', url: link }); return; } await navigator.clipboard.writeText(link); notify('Enlace de sala copiado: sincronización en directo'); }
        catch { try { await navigator.clipboard.writeText(link); notify('Enlace de sala copiado'); } catch { notify(`Código de sala: ${code}`); } }
        return;
      }
    }
    const link = shareLink(game);
    try { await navigator.clipboard.writeText(link); notify('Enlace de invitación copiado'); } catch { notify('No se pudo copiar el enlace'); }
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
    window.location.assign(page === 'home' ? '/game' : `/${page}`);
  };
  if (!ready) return <div className="loading-shell"><span className="loading-mark">R</span><div className="skeleton" /></div>;

  const header = <header className="site-header">
    <a className="wordmark" href="/" aria-label="ROMA, inicio">ROMA <small>EL JUEGO SECRETO</small></a>
    <nav className="desktop-nav" aria-label="Navegación principal">{nav.map(item => <a key={item.href} href={item.href} className={page === item.href.slice(1) ? 'active' : ''}>{item.label}</a>)}<a className={page === 'achievements' ? 'active' : ''} href="/achievements">Logros</a></nav>
    <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir menú">{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
  </header>;
  const bottom = <nav className="bottom-nav" aria-label="Navegación móvil">{nav.map(item => <a key={item.href} href={item.href} className={page === item.href.slice(1) ? 'active' : ''}><item.icon size={20} strokeWidth={1.6} /><span>{item.label}</span></a>)}</nav>;
  const menu = mobileMenu && <div className="mobile-overlay"><button aria-label="Cerrar menú" onClick={() => setMobileMenu(false)}><X size={24} /></button>{[...nav, { href: '/achievements', label: 'Logros', icon: Star }].map(item => <a href={item.href} key={item.href}>{item.label}<ArrowUpRight size={20} /></a>)}</div>;
  return <div className="app-shell">{header}{menu}{page === 'home' ?
    <Landing game={game} showStart={showStart} setShowStart={setShowStart} onStart={startGame} /> :
    game ? <main className="page-main">
      {page === 'game' && <Dashboard game={game} update={update} notify={notify} onPhoto={attachPhoto} />}
      {page === 'missions' && <Missions game={game} update={update} notify={notify} />}
      {page === 'cards' && <Cards game={game} update={update} notify={notify} />}
      {page === 'map' && <MapPage game={game} update={update} />}
      {page === 'achievements' && <Achievements game={game} />}
      {page === 'settings' && <SettingsPage game={game} update={update} onImport={next => { setGame(withAchievements(next)); notify('Progreso importado correctamente'); }} notify={notify} onPhoto={attachPhoto} shareGame={shareGame} />}
    </main> : <StartGate page={page} onStart={startGame} />}
    {game && page !== 'home' && bottom}<footer className="footer"><span>ROMA · EL JUEGO SECRETO</span><span>Partida privada en este dispositivo.</span></footer>
    {pendingJoin && <div className="modal-backdrop"><div className="detail-modal"><button className="modal-close" aria-label="Cerrar" onClick={() => setPendingJoin(null)}><X size={22} /></button><Pill>INVITACIÓN RECIBIDA</Pill><h2>Unirse a la partida</h2><p className="detail-description"><strong>{pendingJoin.names[0]}</strong> os ha invitado a jugar con <strong>{pendingJoin.names[1]}</strong>. Unirte sustituye la partida guardada en este dispositivo por una copia de la suya.</p><div className="complete-actions"><button className="button button-dark wide" onClick={() => { setGame(withAchievements(pendingJoin)); setPendingJoin(null); notify('¡Te has unido a la partida!'); }}>Unirme a la partida <Check size={17} /></button><button className="quiet-button" onClick={() => setPendingJoin(null)}>Seguir con mi partida actual</button></div></div></div>}
    {toast && <div className={`toast ${toast.includes('Logro desbloqueado') ? 'celebration' : ''}`} role="status"><Sparkles size={18} />{toast}<button aria-label="Cerrar aviso" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}

type StartGame = (names: [string, string], goal: number, intensity: Intensity, start?: string, end?: string) => void;
type PhotoHandler = (entryId: string, file: File) => void;

function PhotoButton({ entryId, photo, onPhoto }: { entryId: string; photo?: string; onPhoto: PhotoHandler }) {
  const ref = useRef<HTMLInputElement>(null);
  return <>
    {photo ? <img className="entry-photo" src={photo} alt="Foto del recuerdo" onClick={() => ref.current?.click()} /> :
      <button className="icon-button photo-attach" aria-label="Añadir foto del recuerdo" onClick={() => ref.current?.click()}><Camera size={16} /></button>}
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
    achievements: { title: 'Cada logro tiene su historia.', description: 'Cread vuestra partida para ir descubriendo vuestros logros.' },
    settings: { title: 'Vuestra partida, a vuestra manera.', description: 'Poned vuestros apodos para configurar el juego y guardar el progreso.' },
  };
  const chapter = chapters[page] ?? chapters.game!;
  return <main className="start-gate"><div className="start-gate-image" style={{ backgroundImage: `url(${photo(heroImage, 1200)})` }} /><div className="start-gate-content"><h1>{chapter.title}</h1><p>{chapter.description}</p><button className="button button-dark" onClick={() => setShowStart(true)}>Crear partida <ArrowUpRight size={18} /></button><a className="under-link" href="/">Volver a la portada <ArrowRight size={16} /></a></div>{showStart && <StartModal onClose={() => setShowStart(false)} onStart={onStart} />}</main>;
}

function StartModal({ onClose, onStart }: { onClose: () => void; onStart: StartGame }) {
  const [names, setNames] = useState<[string, string]>(['', '']);
  const [goal, setGoal] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>('flirty');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><form className="onboarding-modal" onSubmit={e => { e.preventDefault(); if (start && end && end < start) return; onStart([names[0].trim(), names[1].trim()], goal, intensity, start || undefined, end || undefined); }}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button><h2>Preparad la partida.</h2><p>Solo dos apodos. Sin cuentas ni preguntas personales.</p>
    <div className="form-grid"><label>JUGADOR 1<input required maxLength={24} placeholder="Tu apodo" value={names[0]} onChange={e => setNames([e.target.value, names[1]])} /></label><label>JUGADOR 2<input required maxLength={24} placeholder="Su apodo" value={names[1]} onChange={e => setNames([names[0], e.target.value])} /></label><label>INICIO DEL VIAJE <span>OPCIONAL</span><input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>FIN DEL VIAJE <span>OPCIONAL</span><input type="date" min={start || undefined} value={end} onChange={e => setEnd(e.target.value)} /></label></div>
    {start && end && end < start && <p className="error">La fecha de fin debe ser posterior a la de inicio.</p>}
    <label className="full-label">OBJETIVO DE RETOS <input type="number" min="1" max="300" value={goal} onChange={e => setGoal(Number(e.target.value))} required /></label>
    <div className="full-label">ELEGID LA INTENSIDAD<div className="segmented">{(['playful', 'flirty', 'sensual', 'daring'] as Intensity[]).map(level => <button type="button" key={level} className={intensity === level ? 'chosen' : ''} onClick={() => setIntensity(level)}>{intensityLabel[level]}</button>)}</div></div>
    <p className="consent-copy"><ShieldCheck size={16} /> Los retos íntimos son solo para adultos y siempre opcionales. Cualquiera puede omitir un reto sin penalización.</p><button type="submit" className="button button-dark wide">Crear partida <ArrowUpRight size={18} /></button>
  </form></div>;
}

function Landing({ game, showStart, setShowStart, onStart }: { game: Game | null; showStart: boolean; setShowStart: (value: boolean) => void; onStart: StartGame }) {
  return <main>
    <section className="landing-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(28,18,21,.82),rgba(28,18,21,.2)),url(${photo(heroImage, 1800)})` }}>
      <div className="hero-inner"><h1>Roma os espera.</h1><p>Un juego privado para dos: misiones por la ciudad, cartas sorpresa y desvíos que no salen en las guías.</p>
        <div className="hero-actions">{game ? <a href="/game" className="button button-gold">Continuar partida <span className="button-icon"><ArrowUpRight size={18} /></span></a> : <button className="button button-gold" onClick={() => setShowStart(true)}>Empezar la aventura <span className="button-icon"><ArrowUpRight size={18} /></span></button>}<a className="text-link" href="#how-it-works">Descubrir el juego <ArrowRight size={16} /></a></div>
      </div>
    </section>
    <section className="intro-section" id="how-it-works"><div className="intro-left"><h2>Sin itinerario.</h2></div><div className="intro-right"><p>Elegid misiones por las calles de Roma, sacad una carta cuando os apetezca o seguid el mapa hasta la próxima parada. Jugad juntos o por separado, siempre a vuestro ritmo.</p></div></section>
    <section className="feature-strip"><div className="feature-photo" style={{ backgroundImage: `url(${photo('photo-1685562249871-8948aeda70a9', 1100)})` }} /><div className="feature-text"><h2>A vuestro ritmo.</h2><p>Elegid la intensidad que os apetezca. Todos los retos se pueden omitir y cualquier contacto requiere consentimiento claro y mutuo.</p>{game ? <a href="/game" className="button button-light">Continuar partida <span className="button-icon"><ArrowUpRight size={18} /></span></a> : <button onClick={() => setShowStart(true)} className="button button-light">Preparar la partida <span className="button-icon"><ArrowUpRight size={18} /></span></button>}</div></section>
    {showStart && <StartModal onClose={() => setShowStart(false)} onStart={onStart} />}
  </main>;
}

function Dashboard({ game, update, notify, onPhoto }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; notify: (msg: string) => void; onPhoto: PhotoHandler }) {
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
    <section className="dashboard-hero"><div className="dashboard-hero-content"><h1>Cada día,<br /><em>una aventura.</em></h1><p>Elegid una misión, sacad una carta o descubrid otro rincón de Roma.</p><div className="hero-actions"><a className="button button-gold" href="/missions">Buscar misión <span className="button-icon"><ArrowUpRight size={18} /></span></a><a href="/cards" className="text-link">Sacar una carta <ArrowRight size={16} /></a></div></div><div className="dashboard-hero-image" style={{ backgroundImage: `url(${photo('photo-1525874684015-58379d421a52', 1100)})` }} /></section>
    <section className="dashboard-content"><div className="dash-overview"><div className="progress-panel"><Pill>LA GRAN AVENTURA</Pill><div className="progress-main"><strong>{completed}<span>/{game.goal}</span></strong><div><h2>Historias por escribir.</h2><p>Faltan {Math.max(0, game.goal - completed)} retos para vuestro objetivo</p></div></div><Progress value={completed} max={game.goal} /><div className="progress-meta"><span>NIVEL {Math.floor(completed / 5) + 1} · {completed < 5 ? 'LA LLEGADA' : completed < 15 ? 'EXPLORADORES' : 'LEYENDAS'}</span><span>{Math.round(Math.min(100, completed / game.goal * 100))}% COMPLETADO</span></div></div>
      <div className="score-panel"><Pill>MARCADOR</Pill><div className="score-row"><span className="avatar">01</span><div><strong>{game.names[0]}</strong><small>JUGADOR 1</small></div><b>{playerScore(game, 0)}</b></div><div className="score-row"><span className="avatar second">02</span><div><strong>{game.names[1]}</strong><small>JUGADOR 2</small></div><b>{playerScore(game, 1)}</b></div><div className="shared-score"><span>✦ &nbsp; PUNTOS COMPARTIDOS</span><strong>{sharedScore(game)} PTS</strong></div><div className="score-categories">{(['Adventure', 'Creativity', 'Chemistry', 'Daring', 'Cooperation'] as const).map(category => <span key={category}>{scoreLabel[category]} <b>{game.entries.filter(e => e.scoreCategory === category).reduce((sum, e) => sum + e.points, 0)}</b></span>)}</div></div></div>
      <div className="dashboard-grid"><div className="dashboard-primary"><SectionTitle eyebrow="UNA PEQUEÑA IDEA" title="La invitación de hoy" aside={<span className="small-note">{todayCount(game)} COMPLETADAS HOY</span>} />
        {daily ? <div className="daily-card"><div className="daily-card-art" style={{ backgroundImage: `url(${photo('photo-1552832230-c0197dd311b5', 850)})` }} /><div className="daily-card-body"><Pill>RETO DEL DÍA · {categoryLabel[daily.category].toUpperCase()}</Pill><h3>{daily.title}</h3><p>{daily.description}</p><div className="card-bottom"><span>+{daily.points} PUNTOS · {daily.duration} MIN</span><a href={`/missions?mission=${daily.id}`} className="round-link" aria-label={`Abrir ${daily.title}`}><ArrowUpRight size={20} /></a></div></div></div> : <div className="empty-state">Habéis completado todas las misiones disponibles. Visitad nuevos lugares para encontrar más.</div>}
        <SectionTitle eyebrow="LA HISTORIA HASTA AHORA" title="Momentos recientes" aside={<a href="/achievements" className="under-link">Ver logros <ArrowUpRight size={15} /></a>} />
        <div className="activity-list">{game.entries.slice(0, 4).length ? game.entries.slice(0, 4).map(e => <div className="activity-row" key={e.id}><span className="activity-symbol">✦</span><div><strong>{entryTitle(e, game)}</strong><small>{{ mission: 'MISIÓN', card: 'CARTA', secret: 'SECRETA', bonus: 'BONUS' }[e.kind]} · {new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</small></div><b>+{e.points}</b><PhotoButton entryId={e.id} photo={game.photos?.[e.id]} onPhoto={onPhoto} /></div>) : <div className="empty-state">Las mejores historias empiezan con un primer paso. Os toca.</div>}</div>
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

function Missions({ game, update, notify }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; notify: (msg: string) => void }) {
  const initial = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('mission');
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [selected, setSelected] = useState<Mission | null>(missions.find(m => m.id === initial) ?? null);
  const [player, setPlayer] = useState<Player>(0);
  const [consent, setConsent] = useState(false);
  const [sort, setSort] = useState('all');
  const visible = missions.filter(m => (filter === 'All' || m.category === filter) && allowed(game, m.intensity) && (sort !== 'available' || !game.entries.some(e => e.kind === 'mission' && e.itemId === m.id)) && (sort !== 'completed' || game.entries.some(e => e.kind === 'mission' && e.itemId === m.id)));
  const completed = game.entries.some(e => e.kind === 'mission' && e.itemId === selected?.id);
  const locked = !!selected?.location && !game.visited.includes(selected.location);
  return <div className="content-wrap"><div className="page-heading"><h1>Elegid vuestra<br /><em>próxima historia.</em></h1><p>Algunas planeadas, otras inesperadas. Todas a vuestra manera.</p></div>
    <div className="list-toolbar"><div className="filter-scroll">{(['All', ...categories] as const).map(c => <button key={c} className={filter === c ? 'selected' : ''} onClick={() => setFilter(c)}>{c === 'All' ? 'Todas' : categoryLabel[c]}</button>)}</div><select aria-label="Filtrar por estado" value={sort} onChange={e => setSort(e.target.value)}><option value="all">Todas las misiones</option><option value="available">Sin completar</option><option value="completed">Completadas</option></select></div>
    <div className="mission-grid">{visible.map((m, i) => { const done = game.entries.some(e => e.kind === 'mission' && e.itemId === m.id); const unavailable = m.location && !game.visited.includes(m.location); return <button className={`mission-card ${done ? 'done' : ''}`} key={m.id} onClick={() => { setSelected(m); setConsent(false); }}><div className="mission-top"><span>{String(i + 1).padStart(2, '0')} / {categoryLabel[m.category].toUpperCase()}</span><span>{done ? '✓ HECHA' : unavailable ? '⌖ BLOQUEADA' : `${m.points} PTS`}</span></div><div className="mission-card-content"><span className="mission-glyph">{['✦', '✳', '♡', '◇', '☾'][categories.indexOf(m.category)]}</span><h3>{m.title}</h3><p>{m.description}</p></div><div className="mission-bottom"><span>{difficultyLabel[m.difficulty]} · {m.duration} MIN {m.mode === 'solo' ? '· INDIVIDUAL' : '· JUNTOS'}</span><ArrowUpRight size={19} /></div></button>; })}</div>
    {visible.length === 0 && <div className="empty-state">Por aquí no hay nada todavía. Prueba otro filtro o visita un lugar nuevo en el mapa.</div>}
    {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><div className="detail-modal"><button className="modal-close" onClick={() => setSelected(null)} aria-label="Cerrar"><X size={20} /></button><Pill>{categoryLabel[selected.category].toUpperCase()} · {difficultyLabel[selected.difficulty].toUpperCase()}</Pill><span className="detail-glyph">✦</span><h2>{selected.title}</h2><p className="detail-description">{selected.description}</p><div className="detail-facts"><span>◷ &nbsp; {selected.duration} MINUTOS</span><span>✦ &nbsp; +{selected.points} PUNTOS</span><span>{selected.mode === 'solo' ? 'UN JUGADOR' : 'JUGAD JUNTOS'}</span></div>
      {selected.location && <p className="location-hint"><MapPin size={16} /> {locations.find(l => l.id === selected.location)?.name} {locked && '· Visita este lugar o márcalo en el mapa para desbloquearlo.'}</p>}
      {selected.requiresConsent && <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Ambos estáis de acuerdo con esta interacción opcional ahora mismo. Podéis retirar vuestro consentimiento en cualquier momento.</label>}
      {!completed && !locked && <div className="complete-actions"><span>¿QUIÉN REGISTRA EL RETO?</span><div className="player-switch">{game.names.map((n, i) => <button key={i} className={player === i ? 'chosen' : ''} onClick={() => setPlayer(i as Player)}>{n}</button>)}</div><button className="button button-dark wide" disabled={selected.requiresConsent && !consent} onClick={() => { update(g => award(g, selected, 'mission', player), `¡Misión completada! +${selected.points}${game.doubleNext ? ' × 2' : ''} puntos`); setSelected(null); }}>Marcar como completada <Check size={18} /></button></div>}
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
    <div className="deck-selector">{decks.map((name, i) => <button key={name} className={`deck-option ${deck === name ? 'active' : ''}`} onClick={() => { if (drawn && !completed) update(g => ({ ...g, draws: g.draws.map(d => d.cardId === drawn.id && d.status === 'drawn' ? { ...d, status: 'skipped' } : d) })); setDeck(name); setDrawn(null); setFlipped(false); }} style={{ backgroundImage: `linear-gradient(0deg,rgba(30,17,20,.88),rgba(30,17,20,.08)),url(${photo(deckImages[i]!, 600)})` }}><strong>{deckLabel[name]}</strong><small>{name === 'Roman Chaos' ? 'UN POCO DE LOCURA' : name === 'Flirt Mode' ? 'SALTA LA CHISPA' : 'AL ANOCHECER'}</small></button>)}</div>
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
  const [selected, setSelected] = useState<string>('colosseum');
  const place = locations.find(l => l.id === selected) ?? locations[0]!;
  const placeMissions = missions.filter(m => m.location === place.id);
  return <div className="content-wrap"><div className="page-heading"><h1>Seguid el<br /><em>desvío bonito.</em></h1><p>Elegid un lugar, marcad vuestra visita y descubrid qué hacer allí. Sin GPS.</p></div>
    <div className="map-layout"><div className="map-holder"><RomeMap onSelect={setSelected} visited={game.visited} /></div><aside className="location-panel"><div className="location-photo" style={{ backgroundImage: `url(${photo(place.image, 850)})` }}><span>{place.area.toUpperCase()} · ROMA</span></div><div className="location-info"><Pill>DESTINO {String(locations.indexOf(place) + 1).padStart(2, '0')} / {String(locations.length).padStart(2, '0')}</Pill><h2>{place.name}</h2><p>{place.description}</p><div className="location-meta"><span>DIFICULTAD {difficultyLabel[place.difficulty].toUpperCase()}</span><span>{placeMissions.length} MISIONES</span></div><button className={`button wide ${game.visited.includes(place.id) ? 'button-outline' : 'button-dark'}`} onClick={() => update(g => ({ ...g, visited: g.visited.includes(place.id) ? g.visited.filter(id => id !== place.id) : [...g.visited, place.id] }), game.visited.includes(place.id) ? 'Visita eliminada' : 'Destino desbloqueado')}>{game.visited.includes(place.id) ? 'Visitado ✓ · Deshacer' : 'Marcar como visitado'} <MapPin size={17} /></button><p className="map-footnote">Marca el lugar cuando lo visites. No necesitamos tu ubicación.</p></div></aside></div>
    <div className="places-section"><SectionTitle eyebrow="ESCOGED LA PRÓXIMA PARADA" title="Los nueve destinos" aside={<span className="small-note">{game.visited.length} / 9 DESCUBIERTOS</span>} /><div className="places-grid">{locations.map((loc, i) => <button key={loc.id} className={selected === loc.id ? 'place-row active' : 'place-row'} onClick={() => { setSelected(loc.id); document.querySelector('.map-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span>{String(i + 1).padStart(2, '0')}</span><strong>{loc.name}</strong><small>{game.visited.includes(loc.id) ? '✓ VISITADO' : loc.area.toUpperCase()}</small><ChevronRight size={17} /></button>)}</div></div>
  </div>;
}

function Achievements({ game }: { game: Game }) {
  return <div className="content-wrap"><div className="page-heading"><h1>Coleccionad<br /><em>lo inolvidable.</em></h1><p>Los logros se desbloquean al explorar y completar retos.</p></div><div className="achievement-banner"><span className="banner-glyph">✺</span><div><h2>{game.unlocked.length} de {achievementList.length} desbloqueados</h2><p>Seguid explorando. El próximo logro está a la vuelta de la esquina.</p><Progress value={game.unlocked.length} max={achievementList.length} /></div></div><div className="achievement-grid">{achievementList.map(a => { const unlocked = game.unlocked.includes(a.id); return <div className={`achievement-card ${unlocked ? 'unlocked' : ''}`} key={a.id}><span className="achievement-glyph">{a.icon}</span><span className="achievement-state">{unlocked ? '✦ DESBLOQUEADO' : '◇ POR DESCUBRIR'}</span><h3>{a.title}</h3><p>{a.description}</p></div>; })}</div></div>;
}

function SettingsPage({ game, update, onImport, notify, onPhoto, shareGame }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void; onImport: (g: Game) => void; notify: (msg: string) => void; onPhoto: PhotoHandler; shareGame: () => void }) {
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
      <aside className="settings-aside"><div className="settings-card"><SectionTitle eyebrow="A BUEN RECAUDO" title="Vuestro progreso" /><p>Todo se guarda en este dispositivo. Exportad una copia para conservar vuestra historia o llevarla a otro móvil.</p><button className="settings-action" onClick={shareGame}><Link2 size={19} /> Invitar al segundo jugador <ArrowUpRight size={17} /></button><button className="settings-action" onClick={exportProgress}><Download size={19} /> Exportar progreso <ArrowUpRight size={17} /></button><button className="settings-action" onClick={() => fileRef.current?.click()}><Upload size={19} /> Importar progreso <ArrowUpRight size={17} /></button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => importProgress(e.target.files?.[0])} /><p className="settings-note">Importar sustituye la partida actual. Exportad primero una copia si queréis conservarla. Los datos no se sincronizan entre dispositivos; el enlace de invitación lleva una copia de la partida y la partida es siempre de dos jugadores.</p></div>
      <div className="settings-card danger-card"><SectionTitle eyebrow="EMPEZAR DE CERO" title="Reiniciar partida" /><p>Esto eliminará permanentemente de este dispositivo las puntuaciones, misiones completadas y logros.</p>{confirmReset ? <div className="reset-confirm"><button className="button button-outline" onClick={() => setConfirmReset(false)}>Cancelar</button><button className="button button-danger" onClick={() => { localStorage.removeItem(KEY); window.location.href = '/'; }}>Sí, borrar partida</button></div> : <button className="settings-action" onClick={() => setConfirmReset(true)}><RotateCcw size={18} /> Reiniciar progreso <ArrowUpRight size={17} /></button>}</div></aside></div>
      <div className="history-section"><SectionTitle eyebrow="POR SI HAY DESPISTES" title="Corregir puntuación" /><p className="muted-copy">Eliminad una finalización accidental. Los puntos y logros se actualizarán automáticamente.</p><div className="activity-list">{game.entries.map(e => <div className="activity-row" key={e.id}><span className="activity-symbol">✦</span><div><strong>{entryTitle(e, game)}</strong><small>{game.names[e.player]} · {new Date(e.date).toLocaleString('es-ES')}</small></div><b>+{e.points}</b><PhotoButton entryId={e.id} photo={game.photos?.[e.id]} onPhoto={onPhoto} /><button className="remove-entry" aria-label={`Eliminar ${entryTitle(e, game)}`} onClick={() => update(g => ({ ...g, entries: g.entries.filter(item => item.id !== e.id), ...(e.kind === 'card' ? { draws: g.draws.map(d => d.cardId === e.itemId && d.status === 'completed' ? { ...d, status: 'skipped' } : d) } : {}), ...(e.kind === 'secret' ? { secrets: g.secrets.map(s => s.id === e.itemId ? { ...s, completed: false } : s) } : {}) }), 'Registro eliminado y puntuaciones corregidas')}><X size={17} /></button></div>)}{!game.entries.length && <div className="empty-state">El historial de puntuación aparecerá aquí.</div>}</div></div>
    </div>;
}
