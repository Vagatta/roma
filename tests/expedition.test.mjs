import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.ts';
import { locations } from '../src/data/locations.ts';
import { missions } from '../src/data/missions.ts';
import { chooseExpeditionBranch, choosePlaceStory, completePlaceStory, createExpedition, drawExpeditionCard, expeditionScores, expeditionStage } from '../src/lib/expedition.ts';
import { storyForPlace } from '../src/data/place-stories.ts';

const base = () => ({ entries: [], draws: [], visited: [], photoSubmissions: [], expeditions: [] });
const candidates = {
  photos: missions.filter(mission => mission.anywhere && mission.requiresPeerValidation),
  cards: cards.filter(card => card.deck === 'Roman Chaos' && !card.requiresConsent),
  finales: missions.filter(mission => mission.anywhere && !mission.requiresPhoto && !mission.requiresConsent),
  placeFinales: [],
};
const entry = (kind, itemId, points, shared = points, player = 0) => ({
  id: `${kind}-${itemId}`, kind, itemId, points, shared, player, title: itemId,
  date: '2026-07-01T10:00:00Z', scoreCategory: 'Adventure',
});

test('un plan desde cualquier sitio propone foto validable, carta y dos finales sin ubicación', () => {
  const game = createExpedition(base(), 'chaos', 'anywhere', candidates, 'exp-1', '2026-07-01T09:00:00Z', 3);
  assert.ok(game);
  const expedition = game.expeditions[0];
  assert.ok(missions.find(mission => mission.id === expedition.photoMissionId).requiresPeerValidation);
  assert.equal(new Set(expedition.finaleOptions).size, 2);
  for (const id of expedition.finaleOptions) assert.equal(missions.find(mission => mission.id === id).location, undefined);
  assert.equal(expeditionStage(game, expedition), 'photo');
  assert.equal(createExpedition(game, 'night', 'anywhere', candidates, 'exp-2', '2026-07-01', 4), null);
});

test('una visita ofrece un final ligado al lugar sin obligar a elegirlo; las fotos pendientes no se reutilizan', () => {
  const placeMission = missions.find(mission => mission.location === 'trevi' && !mission.requiresPhoto && !mission.requiresConsent);
  assert.ok(placeMission);
  const visited = { ...base(), visited: ['trevi'] };
  const planned = createExpedition(visited, 'chaos', 'rome', { ...candidates, placeFinales: [placeMission] }, 'exp-rome', '2026-07-01', 0);
  assert.equal(planned.expeditions[0].finaleOptions[0], placeMission.id);
  assert.equal(missions.find(mission => mission.id === planned.expeditions[0].finaleOptions[1]).location, undefined);

  const waiting = { ...visited, photoSubmissions: candidates.photos.map(mission => ({ missionId: mission.id, status: 'pending' })) };
  assert.equal(createExpedition(waiting, 'chaos', 'anywhere', candidates, 'blocked', '2026-07-01', 0), null);
});

test('la foto pendiente no avanza; la aprobación, la carta y la elección desbloquean el final sin puntos duplicados', () => {
  let game = createExpedition(base(), 'exploration', 'anywhere', candidates, 'exp-1', '2026-07-01', 0);
  const expedition = game.expeditions[0];
  assert.equal(drawExpeditionCard(game, expedition.id, '2026-07-01'), game);
  game = { ...game, photoSubmissions: [{ missionId: expedition.photoMissionId, status: 'pending' }] };
  assert.equal(expeditionStage(game, expedition), 'photo');
  assert.equal(chooseExpeditionBranch(game, expedition.id, 0), game);

  game = { ...game, entries: [entry('mission', expedition.photoMissionId, 10)] };
  assert.equal(expeditionStage(game, expedition), 'card');
  game = drawExpeditionCard(game, expedition.id, '2026-07-01T10:30:00Z');
  assert.equal(game.draws[0].cardId, expedition.cardId);
  assert.equal(drawExpeditionCard(game, expedition.id, '2026-07-01T10:31:00Z'), game);

  game = { ...game, entries: [entry('card', expedition.cardId, 5), ...game.entries] };
  assert.equal(expeditionStage(game, expedition), 'branch');
  game = chooseExpeditionBranch(game, expedition.id, 1);
  assert.equal(game.expeditions[0].branch, 1);
  assert.equal(chooseExpeditionBranch(game, expedition.id, 0), game);
  assert.equal(expeditionStage(game, game.expeditions[0]), 'finale');
  game = { ...game, entries: [entry('mission', expedition.finaleOptions[1], 15, 0, 0), ...game.entries] };
  assert.equal(expeditionStage(game, game.expeditions[0]), 'done');
  assert.deepEqual(expeditionScores(game, game.expeditions[0]), [30, 15]);
  assert.equal(game.entries.length, 3);
});

test('solo una visita confirmada permite completar el reto; cambiar de camino borra la respuesta anterior', () => {
  const game = base();
  assert.equal(choosePlaceStory(game, 'trevi', 0, '2026-07-01'), game);
  assert.equal(completePlaceStory(game, 'trevi', 'Un rumor nuevo', '2026-07-01'), game);
  const visited = { ...game, visited: ['trevi'] };
  const chosen = choosePlaceStory(visited, 'trevi', 1, '2026-07-01');
  assert.deepEqual(chosen.placeStories.trevi, { choice: 1, date: '2026-07-01' });
  assert.equal(completePlaceStory(visited, 'trevi', 'Un rumor nuevo', '2026-07-01'), visited);
  assert.equal(completePlaceStory(chosen, 'trevi', '  ', '2026-07-01'), chosen);
  const finished = completePlaceStory(chosen, 'trevi', '  La fuente cuenta otra historia  ', '2026-07-02');
  assert.equal(finished.placeStories.trevi.response, 'La fuente cuenta otra historia');
  assert.equal(finished.placeStories.trevi.completedAt, '2026-07-02');
  assert.equal(completePlaceStory(finished, 'trevi', 'La fuente cuenta otra historia', '2026-07-03'), finished);
  const switched = choosePlaceStory(finished, 'trevi', 0, '2026-07-03');
  assert.deepEqual(switched.placeStories.trevi, { choice: 0, date: '2026-07-03' });
  assert.equal(completePlaceStory({ ...finished, visited: [] }, 'trevi', 'Otra historia', '2026-07-03').placeStories.trevi.response, finished.placeStories.trevi.response);
  assert.ok(storyForPlace('trevi', 'Fontana di Trevi').choices[1].action);
  assert.ok(storyForPlace('other-place', 'Otro lugar').choices[0].action);
});

test('cada destino romano tiene dos retos propios desbloqueables con su visita', () => {
  for (const place of locations) {
    const story = storyForPlace(place.id, place.name);
    assert.equal(story.choices.length, 2);
    assert.notEqual(story.prompt, `Habéis llegado a ${place.name}. ¿Qué os lleváis de esta parada?`, place.id);
  }
});
