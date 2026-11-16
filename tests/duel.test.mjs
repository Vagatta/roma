import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closestEstimate, countRecalled, higherScore, validSpeedAnswers } from '../src/lib/duel.ts';

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
