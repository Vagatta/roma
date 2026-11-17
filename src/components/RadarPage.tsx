import { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { radarQuestions } from '../data/radar';
import { advanceRadar, RADAR_ROUNDS, radarQuestionIndex, radarRoundPicks, radarRoundPoints, radarScores, startRadar, submitRadarPick } from '../lib/radar';
import type { Game, Player } from '../lib/types';
import ModeRules from './ModeRules';

export default function RadarPage({ game, update, shared }: {
  game: Game;
  update: (fn: (g: Game) => Game, message?: string) => void;
  shared: boolean;
}) {
  const roleKey = `roma-secret-game:radar-player:${game.names.join('|')}`;
  const [player, setPlayer] = useState<Player | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [bet, setBet] = useState(false);
  const session = game.radar;
  const round = session?.round ?? 0;
  const [first, second] = radarRoundPicks(game, round);
  const picks = [first, second] as const;
  const ready = Boolean(first && second);
  const finalRound = round === RADAR_ROUNDS - 1;
  const finished = Boolean(session && finalRound && ready);
  const scores = radarScores(game);
  const question = session ? radarQuestions[radarQuestionIndex(session.seed, round, radarQuestions.length)] : null;
  const mine = player === null ? null : picks[player];
  const otherName = player === 0 ? game.names[1] : game.names[0];

  useEffect(() => {
    const saved = localStorage.getItem(roleKey);
    setPlayer(saved === '0' ? 0 : saved === '1' ? 1 : null);
  }, [roleKey]);
  useEffect(() => {
    setAnswer(null);
    setPrediction(null);
    setBet(false);
  }, [session?.id, round]);

  const choosePlayer = (next: Player) => {
    localStorage.setItem(roleKey, String(next));
    setPlayer(next);
  };
  const begin = () => {
    if (session && !finished && !window.confirm('¿Reiniciar Radar? La partida actual quedará atrás.')) return;
    const id = crypto.randomUUID();
    const seed = Math.floor(Math.random() * radarQuestions.length);
    update(g => startRadar(g, id, seed), 'Radar listo. Elegid y predecid en vuestro móvil.');
  };
  const submit = () => {
    if (!session || player === null || answer === null || prediction === null || mine) return;
    const date = new Date().toISOString();
    update(g => submitRadarPick(g, session.id, session.round, player, answer, prediction, bet, date), 'Elecciones selladas. Esperando a la otra persona.');
  };
  const next = () => {
    if (!session) return;
    update(g => advanceRadar(g, session.id, session.round), 'Siguiente dilema.');
  };

  return <div className="radar-page">
    <section className="radar-intro">
      <div className="radar-intro-copy"><span className="eyebrow">MODO 04 · PARA DOS · EN CUALQUIER SITIO</span><h1>¿Sabes lo que<br /><em>va a elegir?</em></h1><p>Elegid vuestra respuesta y apostad por la del otro. Nada se revela hasta que ambos hayáis decidido. Siete dilemas, cero excusas.</p></div>
      <div className="radar-dial" aria-hidden="true"><div className="radar-dial-inner"><span>R</span><small>ADAR</small></div></div>
    </section>

    <div className="radar-body">
      <ModeRules mode="radar" initiallyOpen={!session} />
      {!shared && <p className="radar-room-note">Para jugar cada uno desde su móvil, unid ambos dispositivos a la misma sala desde Ajustes. Sin sala, la partida solo se guarda aquí.</p>}

      {player === null ? <section className="radar-identity"><span className="eyebrow">ANTES DE EMPEZAR</span><h2>¿Quién juega desde este móvil?</h2><p>Cada persona elige su propio nombre. Las elecciones permanecerán ocultas hasta que ambos respondáis.</p><div className="radar-identity-options">{game.names.map((name, index) => <button key={index} onClick={() => choosePlayer(index as Player)}>{name}<ArrowRight size={18} strokeWidth={1.5} /></button>)}</div></section>
        : <div className="radar-player-label"><span>JUEGAS COMO <strong>{game.names[player]}</strong></span><button onClick={() => setPlayer(null)}>Cambiar jugador</button></div>}

      {!session ? <section className="radar-start"><span className="eyebrow">PARTIDA NUEVA</span><h2>Siete decisiones.<br /><em>Dos formas de equivocarse.</em></h2><p>Cada predicción correcta vale 2 puntos. En la última ronda podéis apostar: +4 si acertáis, -2 si falláis. Sin fotos, jueces ni cronómetro.</p><button className="button button-dark" onClick={begin} disabled={player === null}>Empezar Radar <ArrowRight size={17} /></button></section> : <>
        <div className="radar-scoreboard" aria-label="Marcador Radar">
          <div><small>JUGADOR 01</small><strong>{game.names[0]}</strong><b>{scores[0]}</b></div>
          <div className="radar-scoreboard-center"><span>RONDA {round + 1} / {RADAR_ROUNDS}</span><div className="radar-progress">{Array.from({ length: RADAR_ROUNDS }, (_, index) => <i key={index} className={index <= round ? 'active' : ''} />)}</div></div>
          <div><small>JUGADOR 02</small><strong>{game.names[1]}</strong><b>{scores[1]}</b></div>
        </div>

        {question && <section className="radar-question" key={`${session.id}-${round}`}><div className="radar-question-meta"><span>{question.theme}</span><span>{finalRound ? 'ÚLTIMA RONDA · APUESTA OPCIONAL' : `DILEMA ${String(round + 1).padStart(2, '0')}`}</span></div><h2>{question.prompt}</h2></section>}

        {player !== null && question && !ready && !mine && <section className="radar-decision">
          <div className="radar-choice-block"><div><span className="radar-step">01 / TU RESPUESTA</span><h3>¿Qué harías tú?</h3></div><div className="radar-options">{question.choices.map((choice, index) => <button key={index} aria-pressed={answer === index} className={answer === index ? 'selected' : ''} onClick={() => setAnswer(index)}><span>{String.fromCharCode(65 + index)}</span>{choice}</button>)}</div></div>
          <div className="radar-choice-block"><div><span className="radar-step">02 / TU PREDICCIÓN</span><h3>¿Qué elegirá {otherName}?</h3></div><div className="radar-options">{question.choices.map((choice, index) => <button key={index} aria-pressed={prediction === index} className={prediction === index ? 'selected' : ''} onClick={() => setPrediction(index)}><span>{String.fromCharCode(65 + index)}</span>{choice}</button>)}</div></div>
          {finalRound && <label className={`radar-bet ${bet ? 'active' : ''}`}><input type="checkbox" checked={bet} onChange={event => setBet(event.target.checked)} /><span><strong>Me la juego: doble o nada.</strong> +4 si aciertas la predicción; -2 si fallas. Sin apuesta: +2 o 0.</span></label>}
          <button className="button button-dark radar-submit" disabled={answer === null || prediction === null} onClick={submit}>Sellar mis elecciones <ArrowRight size={17} /></button><p className="radar-footnote">Una vez enviadas no se pueden cambiar. La otra persona no verá tus elecciones hasta responder.</p>
        </section>}

        {player !== null && !ready && mine && <section className="radar-waiting" role="status"><span className="radar-seal" aria-hidden="true">✳</span><span className="eyebrow">RESPUESTA SELLADA</span><h2>Le toca a {otherName}.</h2><p>Tu respuesta y tu predicción siguen ocultas. Cuando la otra persona confirme, veréis el resultado a la vez.</p><div className="radar-ready-list">{game.names.map((name, index) => <span key={index}>{name} <strong>{picks[index] ? 'LISTO' : 'PENDIENTE'}</strong></span>)}</div></section>}

        {player !== null && ready && question && <section className="radar-reveal" aria-live="polite"><span className="eyebrow">LAS CARTAS SOBRE LA MESA</span><h2>¿Quién leyó mejor al otro?</h2><div className="radar-reveal-grid">{picks.map((pick, index) => {
          const opponent = picks[index === 0 ? 1 : 0];
          if (!pick || !opponent) return null;
          const earned = radarRoundPoints(pick, opponent);
          return <article key={index} className={earned > 0 ? 'correct' : 'missed'}><div className="radar-reveal-top"><span>{game.names[index]}</span><strong>{earned > 0 ? `+${earned}` : earned} PTS</strong></div><p>Eligió <b>{question.choices[pick.answer]}</b></p><p>Predijo <b>{question.choices[pick.prediction]}</b></p><small>{earned > 0 ? 'ACERTÓ' : pick.bet ? 'APOSTÓ Y FALLÓ' : 'NO ACERTÓ'}{pick.bet ? ' · APOSTÓ' : ''}</small></article>;
        })}</div>{finished ? <div className="radar-finish"><span className="eyebrow">FIN DE LA PARTIDA</span><h3>{scores[0] === scores[1] ? 'Empate. Os conocéis igual de mal.' : `${game.names[scores[0] > scores[1] ? 0 : 1]} gana Radar.`}</h3><p>{game.names[0]} {scores[0]} — {scores[1]} {game.names[1]}. ¿Revancha con otros dilemas?</p><button className="button button-dark" onClick={begin}>Nueva partida <RotateCcw size={16} /></button></div> : <button className="button button-dark radar-next" onClick={next}>Siguiente dilema <ArrowRight size={17} /></button>}</section>}
        {player === null && <p className="radar-room-note">Elige tu nombre en este dispositivo para responder o ver el resultado de la ronda.</p>}
        {!finished && player !== null && <button className="radar-reset" onClick={begin}>Reiniciar partida <RotateCcw size={13} /></button>}
      </>}
    </div>
  </div>;
}
