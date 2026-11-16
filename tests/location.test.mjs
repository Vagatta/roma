import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closestPlaceWithin, distanceMeters } from '../src/lib/location.ts';

test('la distancia entre coordenadas es simétrica y razonable', () => {
  const colosseum = [41.8902, 12.4922];
  const trevi = [41.9009, 12.4833];
  const distance = distanceMeters(colosseum, trevi);

  assert.ok(distance > 1300 && distance < 1500);
  assert.equal(distanceMeters(trevi, colosseum), distance);
});

test('la detección elige el destino más cercano dentro del radio', () => {
  const places = [
    { id: 'far', coords: [41.891, 12.492] },
    { id: 'near', coords: [41.89021, 12.4922] },
  ];

  assert.equal(closestPlaceWithin([41.8902, 12.4922], places)?.place.id, 'near');
  assert.equal(closestPlaceWithin([41.8902, 12.4922], places, 5)?.place.id, 'near');
  assert.equal(closestPlaceWithin([41.91, 12.5], places), null);
});
