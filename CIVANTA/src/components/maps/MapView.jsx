import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { MapPin, Filter, Layers, Navigation, AlertTriangle } from "lucide-react";
import { useRoadNetwork } from "../../context/RoadNetworkContext";

const statusColors = {
  Submitted: "#f59e0b",
  Verified: "#8b5cf6",
  Assigned: "#6366f1",
  "In Progress": "#3b82f6",
  Resolved: "#10b981",
};

const getRiskColor = (score) => {
  if (score > 70) return "#ef4444"; // high risk - red
  if (score > 40) return "#f59e0b"; // medium risk - amber
  if (score > 20) return "#0ea5e9"; // low-medium - sky
  return "#10b981"; // low risk - emerald
};

export default function MapView({
  submissions = [],
  height = "600px",
  interactive = true,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const roadLinesRef = useRef([]);
  const routeLineRef = useRef(null);

  const { roads, calculateRoute, activeRoute } = useRoadNetwork();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [routingMode, setRoutingMode] = useState(false);
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);

  const filtered = submissions.filter((s) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "high-priority") {
      return s.priority === "High";
    }
    return s.status === activeFilter;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [26.18, 91.75], // Centered around North East corridor (Guwahati - Itanagar)
      zoom: 9,
      zoomControl: true,
      scrollWheelZoom: interactive,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [interactive]);

  // Click handler for routing selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const onMapClick = (e) => {
      const { lat, lng } = e.latlng;
      if (!routeStart) {
        setRouteStart([lat, lng]);
      } else if (!routeEnd) {
        setRouteEnd([lat, lng]);
        calculateRoute(routeStart, [lat, lng]);
      }
    };

    if (routingMode) {
      map.on("click", onMapClick);
    } else {
      map.off("click", onMapClick);
    }

    return () => {
      map.off("click", onMapClick);
    };
  }, [routingMode, routeStart, routeEnd, calculateRoute]);

  // Draw Roads Layer from PostGIS / ML model data
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !roads.length) return;

    roadLinesRef.current.forEach((line) => line.remove());
    roadLinesRef.current = [];

    roads.forEach((road) => {
      if (!road.geometry || !road.geometry.coordinates) return;

      // GeoJSON coordinates are [lng, lat], Leaflet polyline expects [lat, lng]
      const latLngs = road.geometry.coordinates.map((pt) => [pt[1], pt[0]]);
      const isBlocked = road.status === "blocked";
      const color = isBlocked ? "#ef4444" : getRiskColor(road.risk_score);

      const polyline = L.polyline(latLngs, {
        color: color,
        weight: isBlocked ? 5 : 3.5,
        opacity: isBlocked ? 0.95 : 0.75,
        dashArray: isBlocked ? "8, 8" : null,
      }).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: system-ui; min-width: 220px; font-size: 12px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${road.road_name || road.road_id}
          </div>
          <div style="margin-bottom: 4px;">
            Status: <b style="color: ${isBlocked ? "#ef4444" : "#10b981"};">${isBlocked ? "BLOCKED 🚫" : "OPEN ✅"}</b>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; margin-top: 4px;">
            <div><b>Risk Score:</b> ${road.risk_score} / 100</div>
            <div><b>Rain (7d):</b> ${road.rainfall_7d_mm ?? "—"} mm</div>
            <div><b>Landslides Nearby:</b> ${road.historical_landslide_count ?? 0}</div>
            <div><b>Elevation:</b> ${road.elevation_m ? Math.round(road.elevation_m) + "m" : "—"}</div>
          </div>
        </div>
      `);

      roadLinesRef.current.push(polyline);
    });
  }, [roads]);

  // Draw Active Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (activeRoute && activeRoute.path && activeRoute.path.length > 0) {
      routeLineRef.current = L.polyline(activeRoute.path, {
        color: "#2563eb",
        weight: 6,
        opacity: 0.9,
      }).addTo(map);

      map.fitBounds(routeLineRef.current.getBounds().pad(0.15));
    }
  }, [activeRoute]);

  // Draw Submissions Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filtered.forEach((sub) => {
      const lat = sub.lat || (sub.location && sub.location.coordinates ? sub.location.coordinates[1] : 26.18);
      const lng = sub.lng || (sub.location && sub.location.coordinates ? sub.location.coordinates[0] : 91.75);

      const color = statusColors[sub.status] || "#6366f1";

      const marker = L.circleMarker([lat, lng], {
        radius: sub.priority === "High" ? 9 : 7,
        fillColor: color,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 200px;">
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">${sub.id}</div>
          <div style="font-weight: 700; margin: 4px 0;">${sub.title}</div>
          <div style="font-size: 12px; color: #475569;">📍 ${typeof sub.location === "string" ? sub.location : `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</div>
          <div style="margin-top: 6px;">Status: <b>${sub.status}</b></div>
        </div>
      `);

      marker.on("click", () => setSelected(sub));
      markersRef.current.push(marker);
    });
  }, [filtered]);

  const handleResetRoute = () => {
    setRoutingMode(false);
    setRouteStart(null);
    setRouteEnd(null);
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 px-2">
          <Filter className="h-4 w-4" />
          Filter:
        </div>

        {["all", "Submitted", "In Progress", "Resolved", "high-priority"].map((fKey) => (
          <button
            key={fKey}
            onClick={() => setActiveFilter(fKey)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              activeFilter === fKey
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {fKey === "all" ? "All" : fKey === "high-priority" ? "High Priority" : fKey}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {!routingMode ? (
            <Button
              variant="secondary"
              onClick={() => {
                setRoutingMode(true);
                setRouteStart(null);
                setRouteEnd(null);
              }}
              className="text-xs py-1.5"
            >
              <Navigation className="h-3.5 w-3.5 mr-1" />
              Route Test
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleResetRoute} className="text-xs py-1.5 text-rose-600">
              Clear Route
            </Button>
          )}

          <div className="text-xs text-slate-500 border-l border-slate-200 pl-3">
            <span className="font-semibold text-slate-900">{filtered.length}</span> reports
          </div>
        </div>
      </Card>

      {/* Rerouted Warning Banner if active route was rerouted around blocked road */}
      {activeRoute && activeRoute.reroutedAround && activeRoute.reroutedAround.length > 0 && (
        <Card className="p-3 bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-xs font-medium">
            <span className="font-bold">Automatic Reroute Triggered!</span> Route bypasses closed road segment(s):{" "}
            <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{activeRoute.reroutedAround.join(", ")}</span>
          </div>
        </Card>
      )}

      {/* MAP */}
      <div
        className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-soft"
        style={{ height }}
      >
        <div
          ref={mapRef}
          style={{
            height: "100%",
            width: "100%",
            minHeight: "500px",
          }}
        />

        {/* Routing Helper Floating Overlay */}
        {routingMode && (
          <div className="absolute top-4 left-4 bg-slate-900/90 text-white backdrop-blur rounded-xl p-3 z-[400] text-xs shadow-lg max-w-xs">
            <div className="font-bold text-amber-400 mb-1 flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" /> Dijkstra Server-Side Router
            </div>
            <div>
              {!routeStart
                ? "Click start point on map..."
                : !routeEnd
                ? "Click destination point on map..."
                : "Route calculated! Excludes all blocked roads."}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-card p-3 z-[400]">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            Road Risk & Status Legend
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-1 w-5 bg-emerald-500 rounded" /> Low Risk (&lt;20)
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-5 bg-sky-500 rounded" /> Medium Risk
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-5 bg-amber-500 rounded" /> High Risk (&gt;40)
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-5 bg-rose-500 rounded border border-rose-700" style={{ borderStyle: "dashed" }} /> Blocked Road 🚫
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}