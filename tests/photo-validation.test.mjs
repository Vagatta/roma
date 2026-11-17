import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missions } from '../src/data/missions.ts';
import { decidePhotoSubmission, queuePhotoSubmission } from '../src/lib/photo-validation.ts';

const photoMission = missions.find(mission => mission.requiresPeerValidation);
const emptyGame = () => ({ entries: [], photoSubmissions: [] });

test('solo el otro jugador puede validar una prueba fotográfica pendiente', () => {
  assert.ok(photoMission, 'debe existir al menos un reto fotográfico validado');
  const game = emptyGame();
  const submitted = queuePhotoSubmission(game, photoMission, 0, 'photo-1', '2026-01-01T10:00:00.000Z');

  assert.equal(submitted.entries.length, 0);
  assert.equal(submitted.photoSubmissions?.[0]?.status, 'pending');
  assert.equal(queuePhotoSubmission(submitted, photoMission, 1, 'photo-2', '2026-01-01T10:01:00.000Z'), submitted);
  assert.equal(decidePhotoSubmission(submitted, 'photo-1', 0, true, '2026-01-01T10:02:00.000Z'), submitted);

  const approved = decidePhotoSubmission(submitted, 'photo-1', 1, true, '2026-01-01T10:05:00.000Z');
  assert.equal(approved.photoSubmissions?.[0]?.status, 'approved');
  assert.equal(approved.photoSubmissions?.[0]?.decidedBy, 1);
});

test('una foto rechazada no puntúa y permite volver a presentar el reto', () => {
  assert.ok(photoMission);
  const submitted = queuePhotoSubmission(emptyGame(), photoMission, 0, 'photo-1', '2026-01-01T10:00:00.000Z');
  const rejected = decidePhotoSubmission(submitted, 'photo-1', 1, false, '2026-01-01T10:05:00.000Z');

  assert.equal(rejected.photoSubmissions?.[0]?.status, 'rejected');
  const retry = queuePhotoSubmission(rejected, photoMission, 0, 'photo-2', '2026-01-01T10:06:00.000Z');
  assert.equal(retry.photoSubmissions?.[0]?.id, 'photo-2');
  assert.equal(retry.photoSubmissions?.[0]?.status, 'pending');
});
