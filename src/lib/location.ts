export type Coordinates = readonly [latitude: number, longitude: number];

export type NearbyPlace = {
  id: string;
  coords: Coordinates;
};

export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = radians(from[0]);
  const lon1 = radians(from[1]);
  const lat2 = radians(to[0]);
  const lon2 = radians(to[1]);
  const latitudeDelta = lat2 - lat1;
  const longitudeDelta = lon2 - lon1;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(longitudeDelta / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function closestPlaceWithin(
  position: Coordinates,
  places: readonly NearbyPlace[],
  radiusMeters = 120,
): { place: NearbyPlace; distance: number } | null {
  let closest: { place: NearbyPlace; distance: number } | null = null;

  for (const place of places) {
    const distance = distanceMeters(position, place.coords);
    if (distance <= radiusMeters && (!closest || distance < closest.distance)) {
      closest = { place, distance };
    }
  }

  return closest;
}
