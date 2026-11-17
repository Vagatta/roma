import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmPlaceVisit, placeProofPhotoId } from '../src/lib/visit-proof.ts';

const emptyGame = () => ({ visited: [], photos: {} });

test('un destino no se marca como visitado sin una foto asociada', () => {
  const game = emptyGame();
  assert.equal(confirmPlaceVisit(game, 'colosseum'), game);
});

test('la foto del destino permite confirmar la visita sin duplicarla', () => {
  const game = emptyGame();
  const withPhoto = { ...game, photos: { [placeProofPhotoId('colosseum')]: 'data:image/jpeg;base64,test' } };
  const visited = confirmPlaceVisit(withPhoto, 'colosseum');

  assert.deepEqual(visited.visited, ['colosseum']);
  assert.ok(visited.visitDates.colosseum);
  assert.equal(confirmPlaceVisit(visited, 'colosseum'), visited);
});
