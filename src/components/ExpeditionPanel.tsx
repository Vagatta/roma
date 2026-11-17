import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Camera, Shuffle } from 'lucide-react';
import { cards } from '../data/cards';
import { expeditionThemes } from '../data/expeditions';
import { locations } from '../data/locations';
import { missions } from '../data/missions';
import { createExpedition, chooseExpeditionBranch, drawExpeditionCard, expeditionStage } from '../lib/expedition';
import type { ExpeditionCandidates } from '../lib/expedition';
import { eligibleCards, eligibleMissions } from '../lib/game';
import type { ExpeditionTheme, Game, Player } from '../lib/types';
import ExpeditionPostcard from './ExpeditionPostcard';

const themeOrder: ExpeditionTheme[] = ['chaos', 'exploration', 'night'];

function candidatesFor(game: Game, theme: ExpeditionTheme, setting: 'anywhere' | 'rome'): ExpeditionCandidates {
  const available = eligibleMissions(game);
  const observations = available.filter(mission => mission.requiresPeerValidation && mission.requiresPhoto && !mission.location);
  const photos = setting === 'anywhere' ? observations.filter(mission => mission.anywhere)
    : [...observations.filter(mission => !mission.anywhere), ...observations.filter(mission => mission.anywhere)];
  const safeFinales = available.filter(mission => mission.anywhere && !mission.requiresPhoto && !mission.requiresConsent);
  const category = expeditionThemes[theme].finaleCategory;
  const preferredFinales = safeFinales.filter(mission => mission.category === category);
  const finales = preferredFinales.length >= 2 ? preferredFinales : safeFinales;
  const placeFinales = setting === 'rome'
    ? available.filter(mission => mission.location && !mission.requiresPhoto && !mission.requiresConsent)
    : [];
  const deck = expeditionThemes[theme].cardDeck;
  const eligible = eligibleCards(game, deck).filter(card => !card.requiresConsent);
  const fallback = eligibleCards(game, 'Roman Chaos').filter(card => !card.requiresConsent);
  return { photos, cards: eligible.some(card => !game.entries.some(entry => entry.kind === 'card' && entry.itemId === card.id)) ? eligible : fallback, finales, placeFinales };
}

export default function ExpeditionPanel({ game, update, notify, photoFor }: {
  game: Game;
  update: (fn: (g: Game) => Game, message?: string) => void;
  notify: (message: string) => void;
  photoFor: (id: string) => string | undefined;
}) {
  const [setting, setSetting] = useState<'anywhere' | 'rome'>('anywhere');
  const expedition = game.expeditions?.[0];
  const stage = expedition ? expeditionStage(game, expedition) : null;
  const photo = missions.find(mission => mission.id === expedition?.photoMissionId);
  const card = cards.find(item => item.id === expedition?.cardId);
  const pending = game.draws.find(draw => draw.status === 'drawn');
  const cardRevealed = game.draws.some(draw => draw.cardId === card?.id);
  const photoPending = game.photoSubmissions?.some(submission => submission.missionId === photo?.id && submission.status === 'pending');
  const finished = stage === 'done';

  const begin = (theme: ExpeditionTheme) => {
    const id = crypto.randomUUID();
    const date = new Date().toISOString();
    const seed = Math.floor(Math.random() * 100_000);
    if (!createExpedition(game, theme, setting, candidatesFor(game, theme, setting), id, date, seed)) {
      notify('No quedan fotos, cartas o misiones nuevas para esta expedición. Probad otro plan o completad los retos pendientes.');
      return;
    }
    update(current => createExpedition(current, theme, setting, candidatesFor(current, theme, setting), id, date, seed) ?? current,
      'Expedición preparada. La primera prueba es una foto por validar.');
  };

  return <section className="expeditions" aria-label="Expediciones de Roma">
    <div className="expeditions-heading"><div><span className="eyebrow">ROMA · PLANES CON PRINCIPIO Y FINAL</span><h2>Salid del <em>listado.</em></h2><p>Tres pruebas encadenadas, una decisión a mitad del camino y una postal al terminar. Los retos ya existentes suman sus puntos habituales; aquí no hay un marcador extra.</p></div><span className="expeditions-mark" aria-hidden="true">✳</span></div>

    {expedition && !finished && <div className="expedition-active">
      <div className="expedition-active-head"><span>EXPEDICIÓN EN CURSO · {expeditionThemes[expedition.theme].name.toUpperCase()}</span><strong>{expedition.setting === 'anywhere' ? 'DESDE CUALQUIER SITIO' : 'PLAN EN ROMA'}</strong></div>
      <div className="expedition-steps">
        <article className={stage === 'photo' ? 'current' : 'complete'}><span>01 / OBSERVAR <Camera size={17} /></span><h3>{photo?.title}</h3><p>{photo?.description}</p>{stage === 'photo' && <>{photoPending && <small>Prueba enviada: la otra persona debe aprobarla antes de avanzar.</small>}<a className="button button-outline" href={`/missions?mission=${photo?.id}`}>{photoPending ? 'Ver validación' : 'Hacer la foto'} <ArrowUpRight size={16} /></a></>}{stage !== 'photo' && <small>Foto aprobada · misión puntuada</small>}</article>
        <article className={stage === 'card' ? 'current' : stage === 'photo' ? 'locked' : 'complete'}><span>02 / SORPRESA <Shuffle size={17} /></span><h3>{stage === 'photo' || !cardRevealed ? 'Una carta por descubrir' : card?.title}</h3><p>{stage === 'photo' || !cardRevealed ? 'Se revela al sacar la carta después de aprobar la foto.' : card?.description}</p>{stage === 'card' && (pending?.cardId === card?.id
          ? <a className="button button-outline" href="/cards">Abrir carta compartida <ArrowUpRight size={16} /></a>
          : pending
            ? <p className="expedition-warning">Hay otra carta pendiente. Completadla o pasad desde Cartas para sacar la de esta expedición. <a href="/cards">Ir a Cartas →</a></p>
            : <button className="button button-outline" onClick={() => update(g => drawExpeditionCard(g, expedition.id, new Date().toISOString()), 'Carta sorpresa compartida. Abrid Cartas para jugarla.')}>Sacar carta sorpresa <Shuffle size={16} /></button>)}
          {(stage === 'branch' || stage === 'finale') && <small>Carta completada · puntos concedidos</small>}</article>
        <article className={stage === 'branch' || stage === 'finale' ? 'current' : 'locked'}><span>03 / DECIDIR <ArrowRight size={17} /></span><h3>{stage === 'photo' || stage === 'card' ? 'El final lo elegís vosotros' : stage === 'branch' ? 'Dos caminos, un final' : missions.find(mission => mission.id === expedition.finaleOptions[expedition.branch!])?.title}</h3>
          {(stage === 'photo' || stage === 'card') && <p>Tras la carta, elegid juntos una de las dos misiones finales.</p>}
          {stage === 'branch' && <div className="expedition-branches">{expedition.finaleOptions.map((id, index) => {
            const mission = missions.find(item => item.id === id);
            const place = locations.find(location => location.id === mission?.location);
            return <button key={id} onClick={() => update(g => chooseExpeditionBranch(g, expedition.id, index as Player), 'Camino elegido. La misión final ya está disponible para ambos.')}><span>{place ? `SEGUIR EL LUGAR · ${place.name}` : index === 0 ? 'SEGUIR EL RASTRO' : 'CAMBIAR DE RUMBO'}</span><strong>{mission?.title}</strong><small>{mission?.description}</small></button>;
          })}</div>}
          {stage === 'finale' && <><p>{missions.find(mission => mission.id === expedition.finaleOptions[expedition.branch!])?.description}</p><a className="button button-outline" href={`/missions?mission=${expedition.finaleOptions[expedition.branch!]}`}>Completar el final <ArrowUpRight size={16} /></a></>}
        </article>
      </div>
      <p className="expedition-anywhere">No hace falta GPS ni estar en Roma: las misiones de «cualquier sitio» funcionan en casa o fuera. Si habéis visitado un destino, el plan en Roma puede ofreceros una misión de ese lugar como final alternativo.</p>
    </div>}

    {finished && expedition && <div className="expedition-finished"><span className="eyebrow">EXPEDICIÓN COMPLETADA · LA POSTAL YA ESTÁ EN VUESTRO RESUMEN</span><ExpeditionPostcard game={game} expedition={expedition} photoFor={photoFor} /></div>}
    {(!expedition || finished) && <div className="expedition-picker"><div className="expedition-setting"><span>¿DÓNDE JUGÁIS?</span><div className="segmented"><button className={setting === 'anywhere' ? 'chosen' : ''} onClick={() => setSetting('anywhere')}>En cualquier sitio</button><button className={setting === 'rome' ? 'chosen' : ''} onClick={() => setSetting('rome')}>En Roma</button></div></div><div className="expedition-theme-grid">{themeOrder.map((theme, index) => <article key={theme}><span>0{index + 1} / {setting === 'anywhere' ? 'SIN GPS' : 'ROMA OPCIONAL'}</span><h3>{expeditionThemes[theme].name}</h3><p>{expeditionThemes[theme].intro}</p><button className="button button-dark" onClick={() => begin(theme)}>Empezar plan <ArrowUpRight size={16} /></button></article>)}</div><p className="expedition-picker-note">La foto de observación requiere validación del otro jugador. Podéis deteneros y continuar más tarde desde la misma partida.</p></div>}
  </section>;
}
