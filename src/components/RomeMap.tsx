import { useEffect, useRef } from 'react';
import { locations } from '../data/locations';

export default function RomeMap({ onSelect, visited }: { onSelect: (id: string) => void; visited: string[] }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onSelect);
  callback.current = onSelect;
  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | undefined;
    import('leaflet').then(L => {
      if (disposed || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false }).setView([41.901, 12.480], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      locations.forEach(place => {
        const marker = L.divIcon({ className: 'roma-pin', html: `<span class="${visited.includes(place.id) ? 'visited' : ''}">✦</span>`, iconSize: [36, 36], iconAnchor: [18, 18] });
        L.marker(place.coords, { icon: marker, title: place.name }).addTo(map!).on('click', () => callback.current(place.id));
      });
      setTimeout(() => map?.invalidateSize(), 150);
    });
    return () => { disposed = true; map?.remove(); };
  }, [visited.join('|')]);
  return <div ref={container} className="map-canvas" aria-label="Mapa interactivo de destinos en Roma" />;
}
