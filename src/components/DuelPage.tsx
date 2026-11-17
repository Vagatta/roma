import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { duelChallenges } from '../data/duels';
import { uniqueId } from '../lib/game';
import { chooseDuelChallenge, closestEstimate, countRecalled, fastestReaction, gestureWinner, higherScore, validSpeedAnswers } from '../lib/duel';
import type { Gesture } from '../lib/duel';
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
  const [phase, setPhase] = useState<'ready' | 'study' | 'recall' | 'locked'>('ready');
  const [answer, setAnswer] = useState('');
  const [scores, setScores] = useState<[number | null, number | null]>([null, null]);
  const timer = useRoundTimer();
  const words = active === starter ? challenge.memoryWords ?? [] : challenge.alternateWords ?? [];
  const listSize = (player: Player) => (player === starter ? challenge.memoryWords : challenge.alternateWords)?.length ?? 0;

  const record = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    timer.stop();
    const next: [number | null, number | null] = [...scores];
    next[active] = countRecalled(answer, words);
    if (active === starter) {
      setScores(next);
      setActive(starter === 0 ? 1 : 0);
      setAnswer('');
      setPhase('ready');
    } else onFinish(higherScore(next[0] ?? 0, next[1] ?? 0),
      `${names[0]}: ${next[0]}/${listSize(0)} · ${names[1]}: ${next[1]}/${listSize(1)}`);
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
    {phase === 'ready' && <><p>Solo {names[active]} debe mirar las palabras. La lista desaparece sola a los 10 segundos.</p><button className="button button-dark" onClick={begin}>Mostrar palabras · 10 s <ArrowRight size={16} /></button></>}
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
    } else onFinish(closestEstimate(next[0] ?? 0, next[1] ?? 0, challenge.answer),
      `Solución: ${challenge.answer.toLocaleString('es-ES')} · ${names[0]}: ${next[0]} · ${names[1]}: ${next[1]}`);
  };

  return <div className="duel-input-flow">
    <p className="duel-prompt">{challenge.prompt}</p>
    <p>Cada jugador responde sin ver la cifra del otro. Gana el número más cercano; empate si quedan igual de lejos.</p>
    <form className="duel-answer-form" onSubmit={record}>
      <label>Estimación de {names[active]}<input autoFocus type="number" inputMode="numeric" min="0" step="1" value={value} onChange={event => setValue(event.target.value)} required /></label>
      <button className="button button-dark" type="submit">Guardar respuesta <Check size={16} /></button>
    </form>
  </div>;
}

function ReflexRound({ challenge, starter, names, onFinish }: { challenge: DuelChallenge; starter: Player; names: [string, string]; onFinish: FinishRound }) {
  const [active, setActive] = useState<Player>(starter);
  const [phase, setPhase] = useState<'ready' | 'waiting' | 'go' | 'feedback'>('ready');
  const [times, setTimes] = useState<[number[], number[]]>([[], []]);
  const [lastAttempt, setLastAttempt] = useState<{ ms: number; note: string } | null>(null);
  const timers = useRef<number[]>([]);
  const signalAt = useRef(0);
  const other = (player: Player): Player => player === 0 ? 1 : 0;

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const recordAttempt = (ms: number, note: string) => {
    clearTimers();
    const next: [number[], number[]] = [[...times[0]], [...times[1]]];
    next[active].push(ms);
    setTimes(next);
    setLastAttempt({ ms, note });
    if (next[active].length < 3) {
      setPhase('feedback');
      return;
    }
    if (active === starter) {
      setActive(other(active));
      setPhase('ready');
      return;
    }
    const average = (attempts: number[]) => Math.round(attempts.reduce((sum, value) => sum + value, 0) / attempts.length);
    onFinish(fastestReaction(next[0], next[1]),
      `${names[0]}: ${average(next[0])} ms (${next[0].join('/')}); ${names[1]}: ${average(next[1])} ms (${next[1].join('/')})`);
  };

  const startSignal = () => {
    setPhase('waiting');
    const delay = 1400 + Math.floor(Math.random() * 2200);
    timers.current.push(window.setTimeout(() => {
      signalAt.current = performance.now();
      setPhase('go');
      timers.current.push(window.setTimeout(() => recordAttempt(1500, 'sin respuesta'), 1500));
    }, delay));
  };

  const tapTarget = () => {
    if (phase === 'waiting') recordAttempt(1200, 'salida falsa');
    if (phase === 'go') recordAttempt(Math.round(performance.now() - signalAt.current), 'reacción');
  };

  return <div className="duel-input-flow">
    <p className="duel-prompt">{challenge.prompt}</p>
    <p>{names[active]} tiene tres intentos. No pulses antes de la señal: la salida falsa penaliza 1,2 s y no responder 1,5 s. Menor media gana.</p>
    {phase === 'ready' && <button className="button button-dark" onClick={startSignal}>Preparar intento 1 de 3 <ArrowRight size={16} /></button>}
    {phase === 'feedback' && <><p>Último intento: {lastAttempt?.note}, {lastAttempt?.ms} ms. {times[active].length} de 3.</p><button className="button button-dark" onClick={startSignal}>Intento {times[active].length + 1} de 3 <ArrowRight size={16} /></button></>}
    {(phase === 'waiting' || phase === 'go') && <button className={`reflex-target ${phase}`} onClick={tapTarget}>{phase === 'waiting' ? 'ESPERA…' : '¡AHORA!'}</button>}
    {phase === 'ready' && times[active].length > 0 && <p>Intentos: {times[active].join(' · ')} ms</p>}
  </div>;
}

const gestureLabels: Record<Gesture, string> = { piedra: '✊ Piedra', papel: '✋ Papel', tijera: '✌ Tijera' };
function GestureRound({ challenge, starter, names, onFinish }: { challenge: DuelChallenge; starter: Player; names: [string, string]; onFinish: FinishRound }) {
  const other = (player: Player): Player => player === 0 ? 1 : 0;
  const [firstPicker, setFirstPicker] = useState<Player>(starter);
  const [active, setActive] = useState<Player>(starter);
  const [phase, setPhase] = useState<'ready' | 'picking' | 'result'>('ready');
  const [choices, setChoices] = useState<[Gesture | null, Gesture | null]>([null, null]);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [history, setHistory] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState('');

  const choose = (choice: Gesture) => {
    const nextChoices: [Gesture | null, Gesture | null] = [...choices];
    nextChoices[active] = choice;
    if (active === firstPicker) {
      setChoices(nextChoices);
      setActive(other(active));
      return;
    }

    const winner = gestureWinner(nextChoices[0]!, nextChoices[1]!);
    const nextScores: [number, number] = [...scores];
    if (winner !== null) nextScores[winner] += 1;
    const resultText = winner === null
      ? `Empate: ${gestureLabels[nextChoices[0]!]}`
      : `${names[winner]} gana: ${gestureLabels[nextChoices[0]!]} contra ${gestureLabels[nextChoices[1]!]}`;
    const nextHistory = [...history, resultText];
    const nextFirstPicker = other(firstPicker);
    const matchOver = nextScores.some(score => score === 3) || nextHistory.length === 5;
    if (matchOver) {
      onFinish(higherScore(nextScores[0], nextScores[1]),
        `${names[0]} ${nextScores[0]} — ${nextScores[1]} ${names[1]}. ${nextHistory.join('; ')}`);
      return;
    }
    setScores(nextScores);
    setHistory(nextHistory);
    setLastResult(resultText);
    setFirstPicker(nextFirstPicker);
    setActive(nextFirstPicker);
    setChoices([null, null]);
    setPhase('result');
  };

  return <div className="duel-input-flow">
    <p className="duel-prompt">{challenge.prompt}</p>
    <p>Mejor de cinco asaltos; primero en ganar tres. Elegid en secreto por turnos. Quien empieza cambia en cada asalto.</p>
    {phase === 'ready' && <button className="button button-dark" onClick={() => setPhase('picking')}>Empezar asalto 1 <ArrowRight size={16} /></button>}
    {phase === 'picking' && <div className="gesture-picker"><p>Elige {names[active]}:</p><div>{(Object.keys(gestureLabels) as Gesture[]).map(gesture => <button key={gesture} onClick={() => choose(gesture)}>{gestureLabels[gesture]}</button>)}</div></div>}
    {phase === 'result' && <div className="gesture-result"><p>{lastResult}</p><p>Marcador de asaltos: {scores[0]} — {scores[1]}</p><button className="button button-dark" onClick={() => setPhase('picking')}>Siguiente asalto <ArrowRight size={16} /></button></div>}
  </div>;
}

export default function DuelPage({ game, update }: { game: Game; update: (fn: (g: Game) => Game, msg?: string) => void }) {
  const empty: DuelState = { target: 5, scores: [0, 0], rounds: [], turn: 0 };
  const duel = game.duel ?? empty;
  const current = duel.current && duelChallenges.find(challenge => challenge.id === duel.current?.id);
  const [confirmReset, setConfirmReset] = useState(false);
  const winner: Player | null = Math.max(...duel.scores) >= duel.target && duel.scores[0] !== duel.scores[1]
    ? duel.scores[0] > duel.scores[1] ? 0 : 1 : null;

  const startRound = () => {
    const selected = chooseDuelChallenge(duelChallenges, duel.rounds);
    if (!selected) return;
    update(g => {
      const state = g.duel ?? empty;
      return { ...g, duel: { ...state, current: selected, turn: (state.rounds.length % 2) as Player } };
    });
  };
  const finishRound: FinishRound = (roundWinner, detail) => {
    update(g => {
      const state = g.duel ?? empty;
      if (!state.current) return g;
      const challenge = duelChallenges.find(item => item.id === state.current?.id) ?? state.current;
      const scores: [number, number] = [...state.scores];
      if (roundWinner !== null) scores[roundWinner] += 1;
      return { ...g, duel: { ...state, scores, current: undefined,
        rounds: [{ id: `${challenge.id}:${uniqueId()}`, title: challenge.title, category: challenge.category, winner: roundWinner, detail, date: new Date().toISOString() }, ...state.rounds] } };
    });
  };
  const reset = () => {
    setConfirmReset(false);
    update(g => ({ ...g, duel: { ...empty, target: g.duel?.target ?? 5 } }));
  };
  const lastResult = duel.rounds[0] ?? null;

  return <div className="content-wrap duel-page">
    <div className="page-heading"><span className="eyebrow">PARA DOS · UN SOLO DISPOSITIVO</span><h1>Duelo<br /><em>cara a cara.</em></h1><p>Retos sorpresa de rapidez, memoria, estimación, reflejos y estrategia. No repetís un reto durante la partida ni el tipo de prueba de las dos rondas anteriores. Un punto por victoria; alternáis quién empieza.</p></div>
    <div className="duel-scoreboard">{game.names.map((name, player) => <div className={winner === player ? 'duel-score winner' : 'duel-score'} key={player}><span>{player === 0 ? 'JUGADOR 1' : 'JUGADOR 2'}</span><strong>{duel.scores[player]}</strong><b>{name}</b></div>)}</div>
    <div className="duel-controls"><label>Primero en llegar a <select value={duel.target} disabled={duel.rounds.length > 0 || Boolean(duel.current)} title="Reinicia el duelo para cambiar la meta" onChange={event => update(g => ({ ...g, duel: { ...(g.duel ?? empty), target: Number(event.target.value) } }))}><option value="3">3 puntos</option><option value="5">5 puntos</option><option value="7">7 puntos</option></select></label><button className="quiet-button" onClick={() => setConfirmReset(true)}>Reiniciar duelo</button></div>
    {(duel.rounds.length > 0 || duel.current) && <p className="duel-target-note">Para cambiar la meta, reiniciad el duelo.</p>}
    {confirmReset && <div className="duel-reset-confirm"><span>Esto borrará el marcador y las rondas del duelo.</span><button className="quiet-button" onClick={() => setConfirmReset(false)}>Cancelar</button><button className="button button-dark" onClick={reset}>Sí, reiniciar</button></div>}
    {winner !== null ? <section className="duel-card duel-won"><span className="eyebrow">PARTIDA TERMINADA</span><h2>¡Gana {game.names[winner]}!</h2><p>El marcador queda guardado hasta que empecéis una revancha.</p><button className="button button-dark" onClick={() => setConfirmReset(true)}>Jugar revancha <RotateCcw size={16} /></button></section>
      : current ? <section className="duel-card"><div className="duel-round-meta"><span className="eyebrow">{current.category.toUpperCase()}</span><span>RONDA {duel.rounds.length + 1} · EMPIEZA {game.names[duel.turn].toUpperCase()}</span></div><h2>{current.title}</h2>
        {current.mechanic === 'timed' && <SpeedRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
        {current.mechanic === 'memory' && <MemoryRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
        {current.mechanic === 'estimate' && <EstimateRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
        {current.mechanic === 'reflex' && <ReflexRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
        {current.mechanic === 'gesture' && <GestureRound key={`${duel.rounds.length}-${current.id}`} challenge={current} starter={duel.turn} names={game.names} onFinish={finishRound} />}
      </section>
      : duel.current ? <section className="duel-card"><h2>Esta ronda era de la versión anterior</h2><p>Ya no se puede puntuar con esas reglas. Empezad una ronda nueva sin perder el marcador ni el historial.</p><button className="button button-dark" onClick={startRound}>Nueva ronda <ArrowRight size={16} /></button></section>
      : lastResult ? <section className="duel-card duel-result" aria-live="polite"><span className="eyebrow">RONDA TERMINADA</span><h2>{lastResult.winner === null ? 'Empate: nadie suma.' : `Punto para ${game.names[lastResult.winner]}.`}</h2><p>{lastResult.detail}</p><p>El siguiente reto se sortea. Empieza {game.names[duel.rounds.length % 2]}.</p><div className="duel-result-actions"><button className="button button-dark" onClick={startRound}>Sacar reto sorpresa <ArrowRight size={16} /></button></div></section>
      : <section className="duel-card"><span className="eyebrow">RONDA {duel.rounds.length + 1} · SORPRESA</span><h2>¿Quién se lleva el punto?</h2><p>Empieza {game.names[duel.rounds.length % 2]}. Sacad una prueba aleatoria: no se repiten retos ya jugados ni la mecánica de las dos rondas anteriores.</p>
        <button className="button button-dark" onClick={startRound}>Sacar reto <Sparkles size={16} /></button></section>}
    <section className="duel-history"><div className="section-heading"><h2>Rondas jugadas</h2></div>{duel.rounds.slice(0, 6).map(round => <div key={round.id}><span>{round.category} · {round.title}{round.detail && <small>{round.detail}</small>}</span><b>{round.winner === null ? 'Empate' : game.names[round.winner]}</b></div>)}{duel.rounds.length === 0 && <p className="muted-copy">Aquí aparecerán los resultados de las rondas.</p>}</section>
  </div>;
}
