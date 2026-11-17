import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.ts';

const temptation = cards.filter(card => card.deck === 'Temptation');

test('Tentación amplía el mazo con cartas adultas únicas y consentimiento por carta', () => {
  assert.equal(temptation.length, 40);
  assert.equal(new Set(temptation.map(card => card.id)).size, temptation.length);
  assert.equal(new Set(temptation.map(card => card.title)).size, temptation.length);
  assert.ok(temptation.filter(card => card.intensity === 'daring').length >= 25);
  assert.ok(temptation.filter(card => card.intensity === 'daring').every(card => card.requiresConsent));
  assert.ok(cards.every(card => !/\bpareja\b/i.test(card.description)));
  assert.ok(cards.every(card => !card.description.includes('La respuesta puede ser breve, cambiar de tema o pasar.')));
  assert.ok(cards.every(card => !card.description.includes('Se puede responder, cambiar la pregunta o pasar.')));
  assert.ok(cards.every(card => !card.description.includes('Comparte solo hasta donde te resulte cómodo; la otra persona también puede pasar.')));
});
