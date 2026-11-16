import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { duelChallenges } from '../data/duels';
import { uniqueId } from '../lib/game';
import { closestEstimate, countRecalled, higherScore, validSpeedAnswers } from '../lib/duel';
import type { DuelChallenge, DuelState, Game, Player } from '../lib/types';

type FinishRound = (winner: Player | null, detail: string) => void;

function useRoundTimer() {
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef<number | null>(null);
  const onExpire = useRef<() => void>(() => {});

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (deadline.current === null) return;
      const timeLeft = deadline.current - Date.now();
      setRemaining(Math.max(0, Math.ceil(timeLeft / 1000)));
      if (timeLeft <= 0) {
        deadline.current = null;
        onExpire.current();
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  const start = (seconds: number, callback: () => void) => {
    deadline.current = Date.now() + seconds * 1000;
    onExpire.current = callback;
    setRemaining(seconds);
  };
  const stop = () => { deadline.current = null; };
  return { remaining, start, stop };
}

function SpeedRound({ challenge, starter, names, onFinish }: { challenge: DuelChallenge; starter: Player; names: [string, string]; onFinish: FinishRound }) {
  const [active, setActive] = useState<Player>(starter);
  const [phase, setPhase] = useState<'ready' | 'running' | 'review'>('ready');
  const [answers, setAnswers] = useState(['', '', '']);
  const [confirmed, setConfirmed] = useState(false);
  const [used, setUsed] = useState<string[]>([]);
  const timer = useRoundTimer();
  const stealing = active !== starter;

  const record = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const words = answers.map(word => word.trim()).filter(Boolean);
    const valid = validSpeedAnswers(answers, confirmed, used);
    if (valid) {
      onFinish(active, stealing
        ? `${names[starter]} falló; ${names[active]} robó con: ${words.join(', ')}`
        : `${names[active]} acertó: ${words.join(', ')}`);
    } else if (!stealing) {
      setUsed(words);
      setActive(active === 0 ? 1 : 0);
      setAnswers(['', '', '']);
      setConfirmed(false);
      setPhase('ready');
    } else onFinish(null, `Nadie acertó. Se dijeron: ${[...used, ...words].join(', ') || 'ninguna respuesta'}`);
  };

  return <div className="duel-input-flow">
    <p className="duel-prompt">{challenge.prompt}</p>
    <p>{stealing ? `${names[active]} puede robar el punto, pero no repetir las palabras anteriores.` : `${names[active]} empieza. ${names[active === 0 ? 1 : 0]} lee la pregunta y comprueba las respuestas.`}</p>
    {stealing && <p className="duel-used">Ya utilizadas: {used.join(', ') || 'ninguna'}</p>}
    {phase === 'ready' && <button className="button button-dark" onClick={() => { setPhase('running'); timer.start(5, () => setPhase('review')); }}>Empezar los 5 segundos <ArrowRight size={16} /></button>}
    {phase === 'running' && <div className="duel-clock" role="timer" aria-label={`${timer.remaining} segundos restantes`}><strong>{timer.remaining}</strong><span>DI TRES RESPUESTAS</span></div>}
    {phase === 'review' && <form className="duel-answer-form" onSubmit={record}>
      <p>Tiempo. Anotad lo que dijo {names[active]}; dejad en blanco lo que no alcanzó a decir.</p>
      {answers.map((answer, index) => <label key={index}>Respuesta {index + 1}<input value={answer} onChange={event => setAnswers(current => current.map((word, i) => i === index ? event.target.value : word))} maxLength={40} /></label>)}
      <label className="duel-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Las tres eran válidas y se dijeron antes de la señal</label>
      <button className="button button-dark" type="submit">{stealing ? 'Resolver ronda' : 'Registrar y continuar'} <Check size={16} /></button>
    </form>}
  </div>;
}

function MemoryRound({ challenge, starter, names, onFinish }: { challenge: DuelChallenge; starter: Player; names: [string, string]; onFinish: FinishRound }) {
  const [active, setActive] = useState<Player>(starter);
  const [phase, setPhase] = useState<'ready' | 'study' | 'recall' | 'locked' | 'handoff'>('ready');
  const [answer, setAnswer] = useState('');
  const [scores, setScores] = useState<[number | null, number | null]>([null, null]);
  const timer = useRoundTimer();
  const words = active === starter ? challenge.memoryWords ?? [] : challenge.alternateWords ?? [];

  const record = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    timer.stop();
    const next: [number | null, number | null] = [...scores];
    next[active] = countRecalled(answer, words);
    if (active === starter) {
      setScores(next);
      setActive(starter === 0 ? 1 : 0);
      setAnswer('');
      setPhase('handoff');
    } else onFinish(higherScore(next[0] ?? 0, next[1] ?? 0),
      `${names[0]}: ${next[0]}/8 · ${names[1]}: ${next[1]}/8`);
  };
  const begin = () => {
    setPhase('study');
    timer.start(10, () => {
      setPhase('recall');
      timer.start(challenge.duration ?? 30, () => setPhase('locked'));
    });
  };

  return <div className="duel-input-flow">
    <p className="duel-prompt">{challenge.prompt}</p>
    <p>Turno de {names[active]}. Cada persona recibe una lista diferente; gana quien recuerde más. En empate, nadie suma.</p>
    {phase === 'handoff' && <button className="button button-dark" onClick={() => setPhase('ready')}>Pasar a {names[active]} <ArrowRight size={16} /></button>}
    {phase === 'ready' && <><p>Solo {names[active]} debe mirar la pantalla. La lista desaparece sola a los 10 segundos.</p><button className="button button-dark" onClick={begin}>Mostrar palabras · 10 s <ArrowRight size={16} /></button></>}
    {phase === 'study' && <><div className="duel-clock" role="timer" aria-label={`${timer.remaining} segundos restantes`}><strong>{timer.remaining}</strong><span>MEMORIZA</span></div><div className="memory-word-list">{words.map(word => <span key={word}>{word}</span>)}</div></>}
    {(phase === 'recall' || phase === 'locked') && <form className="duel-answer-form" onSubmit={record}>
      <p>{phase === 'locked' ? 'Tiempo agotado. Registrad lo que ya estaba escrito.' : `Escribe lo que recuerdes. Quedan ${timer.remaining} segundos.`}</p>
      <label>Palabras recordadas por {names[active]}<textarea rows={3} value={answer} disabled={phase === 'locked'} onChange={event => setAnswer(event.target.value)} placeholder="Separa las palabras con comas" /></label>
      <button className="button button-dark" type="submit">Registrar recuerdo <Check size={16} /></button>
    </form>}
  </div>;
}

function EstimateRound({ challenge, starter, names, onFinish }: { challenge: DuelChallenge; starter: Player; names: [string, string]; onFinish: FinishRound }) {
  const [active, setActive] = useState<Player>(starter);
  const [phase, setPhase] = useState<'entry' | 'handoff'>('entry');
  const [value, setValue] = useState('');
  const [answers, setAnswers] = useState<[number | null, number | null]>([null, null]);

  const record = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const estimate = Number(value);
    if (!Number.isFinite(estimate) || estimate < 0 || challenge.answer === undefined) return;
    const next: [number | null, number | null] = [...answers];
    next[active] = estimate;
    if (active === starter) {
      setAnswers(next);
      setValue('');
      setActive(starter === 0 ? 1 : 0);
      setPhase('handoff');
    } else onFinish(closestEstimate(next[0] ?? 0, next[1] ?? 0, challenge.answer),
      `Solución: ${challenge.answer.toLocaleString('es-ES')} · ${names[0]}: ${next[0]} · ${names[1]}: ${next[1]}`);
  };

  return <div className="duel-input-flow">
    <p className="duel-prompt">{challenge.prompt}</p>
    <p>Cada jugador responde sin ver la cifra del otro. Gana el número más cercano; empate si quedan igual de lejos.</p>
    {phase === 'handoff' ? <button className="button button-dark" onClick={() => setPhase('entry')}>Pasar a {names[active]} <ArrowRight size={16} /></button>
      : <form className="duel-answer-form" onSubmit={record}>
        <label>Estimación de {names[active]}<input autoFocus type="number" inputMode="numeric" min="0" step="1" value={value} onChange={event => setValue(event.target.value)} required /></label>
        <button className="button button-dark" type="submit">Guardar respuesta <Check size={16} /></button>
      </form>}
  </div>;
}

export default function DuelPage({ game, update }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void }) {
  const empty: DuelState = { target: 5, scores: [0, 0], rounds: [], turn: 0, completedTurns: [] };
  const duel = game.duel ?? empty;
  const current = duel.current && duelChallenges.find(challenge => challenge.id === duel.current?.id);
  const [showResult, setShowResult] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const nextMechanic = (['timed', 'memory', 'estimate'] as const)[duel.rounds.length % 3] ?? 'timed';
  const nextLabel = { timed: '5 segundos', memory: 'Memoria', estimate: 'Estimación' }[nextMechanic];
  const winner: Player | null = Math.max(...duel.scores) >= duel.target && duel.scores[0] !== duel.scores[1]
    ? duel.scores[0] > duel.scores[1] ? 0 : 1 : null;

  const startRound = () => {
    const pool = duelChallenges.filter(challenge => challenge.mechanic === nextMechanic);
    const recentIds = new Set(duel.rounds.slice(0, 5).map(round => round.id.split(':')[0]));
    const fresh = pool.filter(challenge => !recentIds.has(challenge.id));
    const candidates = fresh.length ? fresh : pool;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selected) return;
    setShowResult(false);
    update(g => {
      const state = g.duel ?? empty;
      return { ...g, duel: { ...state, current: selected, turn: (state.rounds.length % 2) as Player, completedTurns: [] } };
    });
  };
  const finishRound: FinishRound = (roundWinner, detail) => {
    setShowResult(true);
    update(g => {
      const state = g.duel ?? empty;
      if (!state.current) return g;
      const challenge = duelChallenges.find(item => item.id === state.current?.id) ?? state.current;
      const scores: [number, number] = [...state.scores];
      if (roundWinner !== null) scores[roundWinner] += 1;
      return { ...g, duel: { ...state, scores, current: undefined, completedTurns: [],
        rounds: [{ id: `${challenge.id}:${uniqueId()}`, title: challenge.title, category: challenge.category, winner: roundWinner, detail, date: new Date().toISOString() }, ...state.rounds] } };
    });
  };
  const reset = () => {
    setShowResult(false);
    setConfirmReset(false);
    update(g => ({ ...g, duel: { ...empty, target: g.duel?.target ?? 5 } }));
  };
  const lastResult = showResult ? duel.rounds[0] : null;

  return <div className="content-wrap duel-page">
    <div className="page-heading"><span className="eyebrow">PARA DOS · UN SOLO DISPOSITIVO</span><h1>Duelo<br /><em>cara a cara.</em></h1><p>Las rondas siguen siempre el mismo orden: 5 segundos, memoria y estimación. Un punto por victoria; los empates no suman. Alternáis quién empieza.</p></div>
    <div className="duel-scoreboard">{game.names.map((name, player) => <div className={winner === player ? 'duel-score winner' : 'duel-score'} key={player}><span>{player === 0 ? 'JUGADOR 1' : 'JUGADOR 2'}</span><strong>{duel.scores[player]}</strong><b>{name}</b></div>)}</div>
    <div className="duel-controls"><label>Primero en llegar a <select value={duel.target} disabled={duel.rounds.length > 0 || Boolean(duel.current)} title="Reinicia el duelo para cambiar la meta" onChange={event => update(g => ({ ...g, duel: { ...(g.duel ?? empty), target: Number(event.target.value) } }))}><option value="3">3 puntos</option><option value="5">5 puntos</option><option value="7">7 puntos</option></select></label><button className="quiet-button" onClick={() => setConfirmReset(true)}>Reiniciar duelo</button></div>
    {(duel.rounds.length > 0 || duel.current) && <p className="duel-target-note">Para cambiar la meta, reiniciad el duelo.</p>}
    {confirmReset && <div className="duel-reset-confirm"><span>Esto borrará el marcador y las rondas del duelo.</span><button className="quiet-button" onClick={() => setConfirmReset(false)}>Cancelar</button><button className="button button-dark" onClick={reset}>Sí, reiniciar</button></div>}
    {winner !== null ? <section className="duel-card duel-won"><span className="eyebrow">PARTIDA TERMINADA</span><h2>¡Gana {game.names[winner]}!</h2><p>El marcador queda guardado hasta que empecéis una revancha.</p><button className="button button-dark" onClick={() => setConfirmReset(true)}>Jugar revancha <RotateCcw size={16} /></button></section>
      : current ? <section className="duel-card"><div className="duel-round-meta"><span className="eyebrow">{current.category.toUpperCase()}</span><span>RONDA {duel.rounds.length + 1} · EMPIEZA {game.names[duel.turn].toUpperCase()}</span></div><h2>{current.title}</h2>
        {current.mechanic === 'timed' && <SpeedRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
        {current.mechanic === 'memory' && <MemoryRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
        {current.mechanic === 'estimate' && <EstimateRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
      </section>
      : duel.current ? <section className="duel-card"><h2>Esta ronda era de la versión anterior</h2><p>Ya no se puede puntuar con esas reglas. Empezad una ronda nueva sin perder el marcador ni el historial.</p><button className="button button-dark" onClick={startRound}>Nueva ronda <ArrowRight size={16} /></button></section>
      : lastResult ? <section className="duel-card duel-result" aria-live="polite"><span className="eyebrow">RONDA TERMINADA</span><h2>{lastResult.winner === null ? 'Empate: nadie suma.' : `Punto para ${game.names[lastResult.winner]}.`}</h2><p>{lastResult.detail}</p><p>La siguiente prueba es {nextLabel.toLowerCase()}. Empieza {game.names[duel.rounds.length % 2]}.</p><div className="duel-result-actions"><button className="button button-dark" onClick={startRound}>Siguiente ronda <ArrowRight size={16} /></button></div></section>
      : <section className="duel-card"><span className="eyebrow">RONDA {duel.rounds.length + 1} · {nextLabel.toUpperCase()}</span><h2>Una ronda. Un punto.</h2><p>Empieza {game.names[duel.rounds.length % 2]}. 5 segundos: tres respuestas o robo. Memoria: dos listas distintas. Estimación: gana quien más se acerque. Después se repite el ciclo.</p>
        <button className="button button-dark" onClick={startRound}>Empezar {nextLabel.toLowerCase()} <Sparkles size={16} /></button></section>}
    <section className="duel-history"><div className="section-heading"><h2>Rondas jugadas</h2></div>{duel.rounds.slice(0, 6).map(round => <div key={round.id}><span>{round.category} · {round.title}{round.detail && <small>{round.detail}</small>}</span><b>{round.winner === null ? 'Empate' : game.names[round.winner]}</b></div>)}{duel.rounds.length === 0 && <p className="muted-copy">Aquí aparecerán los resultados de las rondas.</p>}</section>
  </div>;
}
