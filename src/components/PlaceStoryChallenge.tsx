import { useEffect, useState } from 'react';
import { storyForPlace } from '../data/place-stories';
import { choosePlaceStory, completePlaceStory } from '../lib/expedition';
import type { Game, Player } from '../lib/types';

export default function PlaceStoryChallenge({ game, place, update }: {
  game: Game;
  place: { id: string; name: string };
  update: (fn: (g: Game) => Game, message?: string) => void;
}) {
  const story = storyForPlace(place.id, place.name);
  const progress = game.placeStories?.[place.id];
  const [draft, setDraft] = useState(progress?.response ?? '');

  useEffect(() => {
    setDraft(progress?.response ?? '');
  }, [place.id, progress?.choice, progress?.response]);

  const finish = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    update(g => completePlaceStory(g, place.id, draft, new Date().toISOString()), 'Reto del lugar completado. Ya aparece en vuestro resumen.');
  };

  return <section className="place-story">
    <span className="eyebrow">DESBLOQUEADO CON LA FOTO · RETO DEL LUGAR</span>
    <h3>La otra historia del lugar</h3>
    <p>{story.prompt} Elegid un camino, hacedlo y guardad vuestra respuesta.</p>
    <div className="place-story-options">{story.choices.map((choice, index) =>
      <button key={index} type="button" className={progress?.choice === index ? 'chosen' : ''} aria-pressed={progress?.choice === index}
        onClick={() => update(g => choosePlaceStory(g, place.id, index as Player, new Date().toISOString()))}>
        <strong>{choice.title}</strong><span>{choice.action}</span>
      </button>)}</div>
    {progress && <form className="place-story-answer" onSubmit={finish}>
      <label htmlFor={`story-${place.id}`}>Vuestra respuesta · {story.choices[progress.choice].title}</label>
      <textarea id={`story-${place.id}`} minLength={3} maxLength={120} rows={3}
        value={draft} onChange={event => setDraft(event.target.value)} placeholder="Contad qué encontrasteis o inventasteis..." />
      <button className="button button-dark" type="submit" disabled={draft.trim().length < 3 || draft.trim() === progress.response}>
        {progress.completedAt ? 'Actualizar respuesta' : 'Completar reto'}
      </button>
      {progress.completedAt && <p className="place-story-selected"><strong>RETO COMPLETADO</strong> · {progress.response}</p>}
    </form>}
    <small>Este reto añade una historia al resumen; las misiones de abajo dan los puntos habituales.</small>
  </section>;
}
