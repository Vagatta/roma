import { useEffect, useRef } from 'react';
import { locations } from '../data/locations';

type Place = typeof locations[number];

export default function RomeMap({ onSelect, visited, places = locations }: { onSelect: (id: string) => void; visited: string[]; places?: readonly Place[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import('leaflet').Map | null>(null);
  const markerLayer = useRef<import('leaflet').LayerGroup | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const callback = useRef(onSelect);
  const currentPlaces = useRef(places);
  const currentVisited = useRef(visited);
  callback.current = onSelect;
  currentPlaces.current = places;
  currentVisited.current = visited;

  useEffect(() => {
    let disposed = false;
    import('leaflet').then(L => {
      if (disposed || !container.current) return;
      leaflet.current = L;
      map.current = L.map(container.current, { scrollWheelZoom: false }).setView([41.901, 12.480], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map.current);
      markerLayer.current = L.layerGroup().addTo(map.current);
      renderMarkers();
      setTimeout(() => map.current?.invalidateSize(), 150);
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      markerLayer.current = null;
      leaflet.current = null;
    };
  }, []);

  const renderMarkers = () => {
    const L = leaflet.current;
    const layer = markerLayer.current;
    if (!L || !layer) return;
    layer.clearLayers();
    currentPlaces.current.forEach(place => {
      const markerIcon = L.divIcon({ className: 'roma-pin', html: `<span class="${currentVisited.current.includes(place.id) ? 'visited' : ''}">✦</span>`, iconSize: [36, 36], iconAnchor: [18, 18] });
      L.marker(place.coords, { icon: markerIcon, title: place.name }).addTo(layer).on('click', () => callback.current(place.id));
    });
  };
  useEffect(() => { renderMarkers(); }, [places, visited]);

  return <div ref={container} className="map-canvas" aria-label="Mapa interactivo de destinos en Roma" />;
}
