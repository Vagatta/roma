import { test } from 'node:test';
import assert from 'node:assert/strict';
import { radarQuestions } from '../src/data/radar.ts';
import { advanceRadar, RADAR_ROUNDS, radarQuestionIndex, radarRoundPicks, radarScores, startRadar, submitRadarPick } from '../src/lib/radar.ts';

const base = () => ({ radarPicks: [] });
const choose = (game, player, answer, prediction, bet = false) =>
  submitRadarPick(game, game.radar.id, game.radar.round, player, answer, prediction, bet, '2026-01-01T12:00:00Z');

test('Radar tiene siete dilemas distintos y tres opciones por dilema', () => {
  assert.ok(radarQuestions.length >= RADAR_ROUNDS);
  assert.equal(new Set(radarQuestions.map(question => question.id)).size, radarQuestions.length);
  assert.ok(radarQuestions.every(question => question.choices.length === 3));
  const indexes = Array.from({ length: RADAR_ROUNDS }, (_, round) => radarQuestionIndex(12, round, radarQuestions.length));
  assert.equal(new Set(indexes).size, RADAR_ROUNDS);
});

test('cada persona sella una respuesta y una predicción; nadie puede responder dos veces ni avanzar solo', () => {
  const session = startRadar(base(), 'run-1', 2);
  assert.equal(advanceRadar(session, 'run-1', 0), session);
  const first = choose(session, 0, 0, 1);
  assert.equal(radarRoundPicks(first, 0)[1], null);
  assert.equal(choose(first, 0, 2, 2), first);
  assert.equal(advanceRadar(first, 'run-1', 0), first);

  const second = choose(first, 1, 1, 0);
  assert.deepEqual(radarScores(second), [2, 2]);
  const advanced = advanceRadar(second, 'run-1', 0);
  assert.equal(advanced.radar.round, 1);
  assert.equal(advanceRadar(advanced, 'run-1', 0), advanced);
  assert.equal(submitRadarPick(advanced, 'run-1', 0, 0, 0, 0, false, '2026-01-01'), advanced);
});

test('la apuesta final suma cuatro o resta dos; una nueva partida no hereda puntos', () => {
  let game = startRadar(base(), 'run-1', 0);
  for (let round = 0; round < RADAR_ROUNDS; round += 1) {
    game = choose(game, 0, 0, round === RADAR_ROUNDS - 1 ? 1 : 2, round === RADAR_ROUNDS - 1);
    game = choose(game, 1, 1, 2, round === RADAR_ROUNDS - 1);
    if (round < RADAR_ROUNDS - 1) game = advanceRadar(game, 'run-1', round);
  }
  assert.deepEqual(radarScores(game), [4, -2]);
  assert.equal(advanceRadar(game, 'run-1', RADAR_ROUNDS - 1), game);
  assert.deepEqual(radarScores(startRadar(game, 'run-2', 5)), [0, 0]);
});
