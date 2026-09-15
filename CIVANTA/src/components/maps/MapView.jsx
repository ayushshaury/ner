import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { MapPin, Filter, Layers, Navigation, AlertTriangle, ArrowUpDown, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";
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

const landmarkLocations = [
  { label: "Paltan Bazar", coords: [26.1804, 91.7535] },
  { label: "Pan Bazar", coords: [26.1852, 91.7470] },
  { label: "Fancy Bazaar", coords: [26.1830, 91.7375] },
  { label: "Guwahati Club", coords: [26.1870, 91.7610] },
  { label: "Ulubari", coords: [26.1670, 91.7620] },
  { label: "Machkhowa", coords: [26.1770, 91.7320] },
  { label: "Ganeshguri", coords: [26.1500, 91.7800] },
  { label: "Dispur", coords: [26.1400, 91.7900] },
  { label: "Khanapara", coords: [26.1150, 91.8150] },
  { label: "Jalukbari", coords: [26.1550, 91.6850] },
];

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
  const routeStartMarkerRef = useRef(null);
  const routeEndMarkerRef = useRef(null);

  const { roads, calculateRoute, activeRoute, setActiveRoute } = useRoadNetwork();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [routingMode, setRoutingMode] = useState(false);
  const [pickTarget, setPickTarget] = useState("none"); // "none" | "origin" | "destination"
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);

  const [fromLocation, setFromLocation] = useState("Paltan Bazar");
  const [toLocation, setToLocation] = useState("Ulubari");
  const [isCalculating, setIsCalculating] = useState(false);

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
      center: [26.18, 91.75],
      zoom: 11,
      zoomControl: false,
      scrollWheelZoom: true,
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

  // Click handler for manual map location picking & auto AI route computation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const onMapClick = async (e) => {
      const { lat, lng } = e.latlng;
      const coords = [lat, lng];
      const coordStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      if (pickTarget === "origin" || (!routeStart && pickTarget !== "destination")) {
        setRouteStart(coords);
        const label = `📍 Pinned: ${coordStr}`;
        setFromLocation(label);

        if (routeEnd) {
          setIsCalculating(true);
          try {
            await calculateRoute(coords, routeEnd);
          } catch (err) {
            console.error(err);
          } finally {
            setIsCalculating(false);
          }
          setPickTarget("none");
        } else {
          setPickTarget("destination");
        }
      } else {
        setRouteEnd(coords);
        const label = `🎯 Pinned: ${coordStr}`;
        setToLocation(label);

        const activeStart = routeStart || [26.1804, 91.7535];
        setIsCalculating(true);
        try {
          await calculateRoute(activeStart, coords);
        } catch (err) {
          console.error(err);
        } finally {
          setIsCalculating(false);
        }
        setPickTarget("none");
      }
    };

    map.on("click", onMapClick);

    return () => {
      map.off("click", onMapClick);
    };
  }, [pickTarget, routeStart, routeEnd, calculateRoute]);

  // Draw Roads Layer from PostGIS / ML model data
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !roads.length) return;

    roadLinesRef.current.forEach((line) => line.remove());
    roadLinesRef.current = [];

    roads.forEach((road) => {
      if (!road.geometry || !road.geometry.coordinates) return;

      const latLngs = road.geometry.coordinates.map((pt) => [pt[1], pt[0]]);
      const isBlocked = road.status === "blocked";
      const color = isBlocked ? "#ef4444" : getRiskColor(road.risk_score);

      const polyline = L.polyline(latLngs, {
        color: color,
        weight: isBlocked ? 6 : 3.5,
        opacity: isBlocked ? 0.95 : 0.75,
        dashArray: isBlocked ? "8, 8" : null,
      }).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: system-ui; min-width: 220px; font-size: 12px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${road.road_name || road.road_id}
          </div>
          <div style="margin-bottom: 4px;">
            Status: <b style="color: ${isBlocked ? "#ef4444" : "#10b981"};">${isBlocked ? "BLOCKED 🚫 (Excluded from Navigation)" : "OPEN ✅"}</b>
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

  // Draw Active Route (Includes Alternate Route Bypassing Blocked Roads)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    if (routeStartMarkerRef.current) {
      routeStartMarkerRef.current.remove();
      routeStartMarkerRef.current = null;
    }
    if (routeEndMarkerRef.current) {
      routeEndMarkerRef.current.remove();
      routeEndMarkerRef.current = null;
    }

    if (activeRoute && activeRoute.path && activeRoute.path.length > 0) {
      const isDetour = activeRoute.reroutedAround && activeRoute.reroutedAround.length > 0;

      // Draw Main Route Line (Bright Blue for standard, Emerald/Blue gradient style for safe detour)
      routeLineRef.current = L.polyline(activeRoute.path, {
        color: isDetour ? "#2563eb" : "#0284c7",
        weight: 7,
        opacity: 0.9,
      }).addTo(map);

      // Add Start (Origin) & End (Destination) Markers
      const startPt = activeRoute.path[0];
      const endPt = activeRoute.path[activeRoute.path.length - 1];

      const startIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="background-color: #10b981; color: white; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.4);">A</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const endIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="background-color: #ef4444; color: white; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.4);">B</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      routeStartMarkerRef.current = L.marker(startPt, { icon: startIcon }).addTo(map);
      routeEndMarkerRef.current = L.marker(endPt, { icon: endIcon }).addTo(map);
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

  const handleCalculateNavigation = async (overrideFrom, overrideTo) => {
    const fName = overrideFrom || fromLocation;
    const tName = overrideTo || toLocation;

    const fItem = landmarkLocations.find((l) => l.label === fName);
    const tItem = landmarkLocations.find((l) => l.label === tName);

    const startCoords = fItem ? fItem.coords : routeStart || [26.1804, 91.7535];
    const endCoords = tItem ? tItem.coords : routeEnd || [26.1670, 91.7620];

    setRouteStart(startCoords);
    setRouteEnd(endCoords);
    setRoutingMode(true);
    setIsCalculating(true);

    try {
      await calculateRoute(startCoords, endCoords);
    } catch (err) {
      console.error("Navigation route error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSwapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
    handleCalculateNavigation(toLocation, temp);
  };

  const handleResetRoute = () => {
    setRoutingMode(false);
    setRouteStart(null);
    setRouteEnd(null);
    setActiveRoute(null);
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Navigation Search Panel: Where From -> Where To */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
              <Navigation className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-1.5">
                AI Safe Navigation & Route Finder
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" /> Excludes Blocked Roads
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Select your origin and destination. AI automatically computes the safest route avoiding all active landslide road blocks.
              </p>
            </div>
          </div>
        </div>

        {/* Location Selectors */}
        <div className="grid md:grid-cols-12 gap-3 items-center">
          {/* FROM */}
          <div className="md:col-span-5 relative space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> From (Origin)
              </label>
              <button
                type="button"
                onClick={() => setPickTarget("origin")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition border ${
                  pickTarget === "origin"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                📍 Pick on Map
              </button>
            </div>
            <select
              value={fromLocation}
              onChange={(e) => {
                setFromLocation(e.target.value);
                const item = landmarkLocations.find((l) => l.label === e.target.value);
                if (item) setRouteStart(item.coords);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
            >
              {fromLocation.startsWith("📍 Pinned:") && (
                <option value={fromLocation}>{fromLocation}</option>
              )}
              {landmarkLocations.map((l) => (
                <option key={l.label} value={l.label}>
                  📍 {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* SWAP BUTTON */}
          <div className="md:col-span-1 flex justify-center pt-3 md:pt-4">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition shadow-xs"
              title="Swap From & To"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* TO */}
          <div className="md:col-span-4 relative space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> To (Destination)
              </label>
              <button
                type="button"
                onClick={() => setPickTarget("destination")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition border ${
                  pickTarget === "destination"
                    ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                }`}
              >
                🎯 Pick on Map
              </button>
            </div>
            <select
              value={toLocation}
              onChange={(e) => {
                setToLocation(e.target.value);
                const item = landmarkLocations.find((l) => l.label === e.target.value);
                if (item) setRouteEnd(item.coords);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
            >
              {toLocation.startsWith("🎯 Pinned:") && (
                <option value={toLocation}>{toLocation}</option>
              )}
              {landmarkLocations.map((l) => (
                <option key={l.label} value={l.label}>
                  🎯 {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* ACTION BUTTON */}
          <div className="md:col-span-2 pt-3 md:pt-4">
            <Button
              onClick={() => handleCalculateNavigation()}
              loading={isCalculating}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md"
            >
              Find Safe Route
            </Button>
          </div>
        </div>

        {/* Quick Shortcut Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Popular Routes:</span>
          {[
            { from: "Paltan Bazar", to: "Ulubari" },
            { from: "Pan Bazar", to: "Dispur" },
            { from: "Fancy Bazaar", to: "Guwahati Club" },
            { from: "Guwahati Club", to: "Ganeshguri" },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setFromLocation(item.from);
                setToLocation(item.to);
                handleCalculateNavigation(item.from, item.to);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 transition border border-slate-200"
            >
              {item.from} ➔ {item.to}
            </button>
          ))}
        </div>
      </Card>

      {/* Driver Active Route & Detour Summary Card */}
      {activeRoute && (
        <Card className={`p-4 border-l-4 ${activeRoute.reroutedAround && activeRoute.reroutedAround.length > 0 ? "border-l-emerald-500 bg-emerald-50/30" : "border-l-brand-600 bg-brand-50/20"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${activeRoute.reroutedAround && activeRoute.reroutedAround.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700"}`}>
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  {activeRoute.reroutedAround && activeRoute.reroutedAround.length > 0 ? (
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      🛡️ Safe Alternate Detour Route Active ({fromLocation} ➔ {toLocation})
                    </span>
                  ) : (
                    <span>Optimal Path ({fromLocation} ➔ {toLocation})</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeRoute.reroutedAround && activeRoute.reroutedAround.length > 0
                    ? `Admin blocked road segment(s) [${activeRoute.reroutedAround.join(", ")}]. Dijkstra router automatically generated this safe alternate path.`
                    : "Optimal path over open road network."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-slate-500 block text-[10px] uppercase">Distance</span>
                <span className="text-slate-900 text-sm font-bold">{activeRoute.totalDistanceKm} km</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-slate-500 block text-[10px] uppercase">Risk Score</span>
                <span className={`text-sm font-bold ${activeRoute.riskScore > 50 ? "text-amber-600" : "text-emerald-600"}`}>
                  {activeRoute.riskScore} / 100
                </span>
              </div>
              <Button variant="ghost" onClick={handleResetRoute} className="text-xs py-1 text-rose-600">
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Submissions Filter Bar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 px-2">
          <Filter className="h-4 w-4" />
          Submissions Filter:
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

        <div className="ml-auto text-xs text-slate-500 border-l border-slate-200 pl-3">
          <span className="font-semibold text-slate-900">{filtered.length}</span> citizen reports
        </div>
      </Card>

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

        {/* Floating Map Pick Banner Overlay */}
        {pickTarget !== "none" && (
          <div className="absolute top-4 left-4 right-4 bg-slate-900/90 text-white backdrop-blur rounded-xl p-3 z-[400] text-xs shadow-xl flex items-center justify-between border border-amber-500/40">
            <div className="flex items-center gap-2 font-semibold">
              <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
              <span>
                {pickTarget === "origin"
                  ? "📍 Map Pick Active: Click anywhere on map to set Origin (Point A)"
                  : "🎯 Map Pick Active: Click anywhere on map to set Destination (Point B)"}
              </span>
            </div>
            <button
              onClick={() => setPickTarget("none")}
              className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded text-slate-300 font-bold"
            >
              Cancel
            </button>
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