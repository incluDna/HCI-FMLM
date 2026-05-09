export function parseGpxPoints(gpxText) {
  if (!gpxText || typeof window === "undefined") return [];

  try {
    const doc = new DOMParser().parseFromString(gpxText, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) return [];

    const nodes = [
      ...Array.from(doc.querySelectorAll("trkpt")),
      ...Array.from(doc.querySelectorAll("rtept")),
      ...Array.from(doc.querySelectorAll("wpt"))
    ];

    return nodes
      .map((node) => ({
        lat: Number(node.getAttribute("lat")),
        lng: Number(node.getAttribute("lon"))
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  } catch {
    return [];
  }
}

export function routePoints(route) {
  return route?.gpx_text ? parseGpxPoints(route.gpx_text) : [];
}

export function fallbackLine(origin, destination, index = 0, section = "main") {
  if (!origin || !destination) return [];

  const curve = (index - 1) * 0.012;
  const thirdLat = origin.lat + (destination.lat - origin.lat) * 0.33;
  const thirdLng = origin.lng + (destination.lng - origin.lng) * 0.33 + curve;
  const twoThirdLat = origin.lat + (destination.lat - origin.lat) * 0.66;
  const twoThirdLng = origin.lng + (destination.lng - origin.lng) * 0.66 - curve;

  if (section === "fm") {
    return [origin, { lat: thirdLat, lng: thirdLng }];
  }
  if (section === "lm") {
    return [{ lat: twoThirdLat, lng: twoThirdLng }, destination];
  }
  return [origin, { lat: thirdLat, lng: thirdLng }, { lat: twoThirdLat, lng: twoThirdLng }, destination];
}

export function pointsForRoute(route, origin, destination, index, section = "main") {
  const parsed = routePoints(route);
  return parsed.length >= 2 ? parsed : fallbackLine(origin, destination, index, section);
}

export function boundsForPointSets(pointSets, origin, destination) {
  const all = [
    origin,
    destination,
    ...pointSets.flat()
  ].filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (!all.length) return null;

  return all.reduce(
    (bounds, point) => [
      [Math.min(bounds[0][0], point.lat), Math.min(bounds[0][1], point.lng)],
      [Math.max(bounds[1][0], point.lat), Math.max(bounds[1][1], point.lng)]
    ],
    [
      [all[0].lat, all[0].lng],
      [all[0].lat, all[0].lng]
    ]
  );
}
