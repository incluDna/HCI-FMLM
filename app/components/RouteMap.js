"use client";

import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import { boundsForPointSets, pointsForRoute } from "@/lib/gpx";

function FitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    }
  }, [bounds, map]);

  return null;
}

function CtrlWheelZoom() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let lastZoomAt = 0;

    function handleWheel(event) {
      if (!event.ctrlKey) return;

      event.preventDefault();
      event.stopPropagation();

      const now = Date.now();
      if (now - lastZoomAt < 80) return;
      lastZoomAt = now;

      const direction = event.deltaY < 0 ? 1 : -1;
      const nextZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + direction));
      map.setZoomAround(map.mouseEventToContainerPoint(event), nextZoom);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [map]);

  return null;
}

export default function RouteMap({
  scenario,
  mode = "baseline",
  selection,
  onSelectMain,
  onSelectFirstMile,
  onSelectLastMile,
  height = 420
}) {
  const origin = normalizePoint(scenario.origin_coords);
  const destination = normalizePoint(scenario.destination_coords);

  const selectedMain =
    scenario.main_routes.find((route) => route.id === selection?.selected_main) ||
    scenario.main_routes[0];

  const layers = useMemo(() => {
    const mainRoutes = scenario.main_routes;
    const output = [];

    mainRoutes.forEach((route, index) => {
      output.push({
        id: route.id,
        type: mode === "baseline" ? "simple" : "main",
        label: mode === "baseline" ? `Route ${String.fromCharCode(65 + index)}` : route.mode,
        active: route.id === selection?.selected_main,
        points: pointsForRoute(route, origin, destination, index, "main"),
        onClick: () => onSelectMain?.(route.id)
      });
    });

    if (mode === "prototype" && selectedMain) {
      scenario.first_mile
        .filter((item) => selectedMain.first_miles?.includes(item.id))
        .forEach((route, index) => {
          output.push({
            id: route.id,
            type: "fm",
            label: route.mode,
            active: route.id === selection?.selected_fm,
            points: pointsForRoute(route, origin, destination, index, "fm"),
            onClick: () => onSelectFirstMile?.(route.id)
          });
        });

      scenario.last_mile
        .filter((item) => selectedMain.last_miles?.includes(item.id))
        .forEach((route, index) => {
          output.push({
            id: route.id,
            type: "lm",
            label: route.mode,
            active: route.id === selection?.selected_lm,
            points: pointsForRoute(route, origin, destination, index, "lm"),
            onClick: () => onSelectLastMile?.(route.id)
          });
        });
    }

    if (mode === "admin") {
      scenario.first_mile.forEach((route, index) => {
        output.push({
          id: route.id,
          type: "fm",
          label: route.mode,
          active: true,
          points: pointsForRoute(route, origin, destination, index, "fm")
        });
      });
      scenario.last_mile.forEach((route, index) => {
        output.push({
          id: route.id,
          type: "lm",
          label: route.mode,
          active: true,
          points: pointsForRoute(route, origin, destination, index, "lm")
        });
      });
    }

    return output.filter((layer) => layer.points.length >= 2);
  }, [destination, mode, onSelectFirstMile, onSelectLastMile, onSelectMain, origin, scenario, selectedMain, selection]);

  const bounds = boundsForPointSets(layers.map((layer) => layer.points), origin, destination);
  const center = origin || destination || { lat: 13.7563, lng: 100.5018 };

  return (
    <div className="osm-map" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={12} scrollWheelZoom={false} className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        <CtrlWheelZoom />
        {layers.map((layer) => (
          <Polyline
            key={`${layer.type}-${layer.id}`}
            positions={layer.points.map((point) => [point.lat, point.lng])}
            pathOptions={{
              color: colorForLayer(layer.type, layer.active),
              weight: layer.active ? 7 : 4,
              opacity: layer.active ? 0.92 : 0.36,
              dashArray: layer.type === "fm" || layer.type === "lm" ? "6 8" : undefined
            }}
            eventHandlers={{ click: layer.onClick }}
          >
            <Popup>{layer.label}</Popup>
          </Polyline>
        ))}
        {origin && (
          <CircleMarker
            center={[origin.lat, origin.lng]}
            radius={10}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#16a34a", fillOpacity: 1 }}
          >
            <Popup>Origin: {scenario.origin}</Popup>
          </CircleMarker>
        )}
        {destination && (
          <CircleMarker
            center={[destination.lat, destination.lng]}
            radius={10}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
          >
            <Popup>Destination: {scenario.destination}</Popup>
          </CircleMarker>
        )}
      </MapContainer>
      <div className="map-zoom-hint">Ctrl + scroll เพื่อซูมแผนที่</div>
      <div className="map-legend osm-legend">
        {mode === "baseline" ? (
          <>
            <span><i className="simple" />Routes</span>
            <span><i className="selected" />Selected</span>
          </>
        ) : (
          <>
            <span><i className="fm" />First mile</span>
            <span><i className="main" />Main</span>
            <span><i className="lm" />Last mile</span>
          </>
        )}
      </div>
    </div>
  );
}

function normalizePoint(point) {
  if (!point) return null;
  if (Array.isArray(point) && point.length >= 2) {
    const lat = Number(point[0]);
    const lng = Number(point[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  if (typeof point === "string") {
    const [lat, lng] = point.split(",").map((part) => Number(part.trim()));
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function colorForLayer(type, active) {
  if (!active && type === "simple") return "#7b8794";
  if (type === "fm") return "#7c3aed";
  if (type === "lm") return "#15916c";
  return "#1d75bd";
}
