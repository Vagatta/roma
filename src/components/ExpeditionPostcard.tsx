import { expeditionThemes } from '../data/expeditions';
import { locations } from '../data/locations';
import { missions } from '../data/missions';
import { storyForPlace } from '../data/place-stories';
import { expeditionEntries, expeditionScores } from '../lib/expedition';
import { placeProofPhotoId } from '../lib/visit-proof';
import type { Expedition, Game } from '../lib/types';

export default function ExpeditionPostcard({ game, expedition, photoFor }: {
  game: Game; expedition: Expedition; photoFor: (id: string) => string | undefined;
}) {
  const entries = expeditionEntries(game, expedition);
  const scores = expeditionScores(game, expedition);
  const finaleId = expedition.branch === undefined ? null : expedition.finaleOptions[expedition.branch];
  const finale = missions.find(mission => mission.id === finaleId);
  const place = locations.find(location => location.id === finale?.location);
  const photoIds = [
    ...entries.filter(entry => game.photos?.[entry.id]).map(entry => entry.id),
    ...(place && game.photos?.[placeProofPhotoId(place.id)] ? [placeProofPhotoId(place.id)] : []),
  ].slice(0, 3);

  return <article className="expedition-postcard">
    <div className="expedition-postcard-art">{photoIds.length ? photoIds.map(id => <figure key={id}>
      {photoFor(id) ? <img src={photoFor(id)} alt={game.photoCaptions?.[id] || 'Foto de la expedición'} loading="lazy" /> : <div className="expedition-photo-loading">Foto pendiente de sincronizar</div>}
      {game.photoCaptions?.[id] && <figcaption>{game.photoCaptions[id]}</figcaption>}
    </figure>) : <span>✳</span>}</div>
    <div className="expedition-postcard-copy"><span className="eyebrow">POSTAL · {expeditionThemes[expedition.theme].name.toUpperCase()}</span>
      <h3>{expeditionThemes[expedition.theme].postcard}</h3>
      <p>{entries.map(entry => entry.title).join(' · ')}</p>
      {place && <p className="expedition-postcard-place">Una parada en {place.name}{game.placeStories?.[place.id]?.completedAt ? ` · ${storyForPlace(place.id, place.name).choices[game.placeStories[place.id]!.choice].title}: ${game.placeStories[place.id]!.response}` : ''}.</p>}
      <div className="expedition-postcard-score"><span>{game.names[0]} <b>{scores[0]} pts</b></span><span>{game.names[1]} <b>{scores[1]} pts</b></span></div>
      <small>{new Date(entries.at(-1)?.date ?? expedition.startedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · {entries.reduce((sum, entry) => sum + entry.points, 0)} puntos conseguidos</small>
    </div>
  </article>;
}
