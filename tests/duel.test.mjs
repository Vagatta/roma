import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseDuelChallenge, closestEstimate, countRecalled, fastestReaction, gestureWinner, higherScore, validSpeedAnswers } from '../src/lib/duel.ts';
import { duelChallenges } from '../src/data/duels.ts';

test('un robo no puede repetir respuestas anteriores, incluso con otros acentos', () => {
  assert.equal(validSpeedAnswers(['café', 'taza', 'pan'], true, ['cafe']), false);
  assert.equal(validSpeedAnswers(['taza', 'taza', 'pan'], true), false);
  assert.equal(validSpeedAnswers(['taza', 'pan', 'leche'], false), false);
  assert.equal(validSpeedAnswers(['taza', 'pan', 'leche'], true, ['cafe']), true);
});

test('memoria cuenta palabras distintas sin penalizar tildes ni mayúsculas', () => {
  assert.equal(countRecalled('VIOLIN, limón, limon, inventada', ['violín', 'limón', 'taza']), 2);
  assert.equal(higherScore(6, 4), 0);
  assert.equal(higherScore(4, 6), 1);
  assert.equal(higherScore(5, 5), null);
});

test('estimación premia la distancia más corta y permite empates', () => {
  assert.equal(closestEstimate(10000, 12000, 10080), 0);
  assert.equal(closestEstimate(11000, 10079, 10080), 1);
  assert.equal(closestEstimate(90, 110, 100), null);
});

test('reflejos compara medias de varios intentos y detecta empate', () => {
  assert.equal(fastestReaction([200, 300, 400], [350, 350, 350]), 0);
  assert.equal(fastestReaction([250, 300, 350], [300, 300, 300]), null);
  assert.equal(fastestReaction([], [300, 300, 300]), null);
});

test('piedra, papel o tijera resuelve resultados sin juicio subjetivo', () => {
  assert.equal(gestureWinner('piedra', 'tijera'), 0);
  assert.equal(gestureWinner('papel', 'tijera'), 1);
  assert.equal(gestureWinner('papel', 'papel'), null);
});

test('el sorteo evita la categoría de las dos rondas previas y los retos recientes', () => {
  const challenges = [
    { id: 'speed-a', mechanic: 'timed' },
    { id: 'speed-b', mechanic: 'timed' },
    { id: 'memory-a', mechanic: 'memory' },
    { id: 'reflex-a', mechanic: 'reflex' },
  ];
  const rounds = [
    { id: 'speed-a:1' },
    { id: 'speed-b:2' },
  ];
  const selected = chooseDuelChallenge(challenges, rounds, () => 0);
  assert.equal(selected.id, 'memory-a');
});

test('el mazo del Duelo contiene variedad suficiente y no repite identificadores', () => {
  assert.equal(new Set(duelChallenges.map(challenge => challenge.id)).size, duelChallenges.length);
  assert.ok(duelChallenges.filter(challenge => challenge.mechanic === 'timed').length >= 15);
  assert.ok(duelChallenges.filter(challenge => challenge.mechanic === 'memory').length >= 8);
  assert.ok(duelChallenges.filter(challenge => challenge.mechanic === 'estimate').length >= 10);
  assert.ok(duelChallenges.some(challenge => challenge.mechanic === 'reflex'));
  assert.ok(duelChallenges.some(challenge => challenge.mechanic === 'gesture'));
});
