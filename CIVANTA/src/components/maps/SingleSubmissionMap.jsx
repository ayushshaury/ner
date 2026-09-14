import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const getRiskColor = (score) => {
  if (score > 70) return "#ef4444";
  if (score > 40) return "#f59e0b";
  if (score > 20) return "#0ea5e9";
  return "#10b981";
};

export default function SingleSubmissionMap({ lat, lng, road }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialLat = lat || 26.18;
    const initialLng = lng || 91.75;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const reportIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `<div style="background-color: #ef4444; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(239,68,68,0.8); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">📍</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const marker = L.marker([initialLat, initialLng], { icon: reportIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui; min-width: 180px;">
        <div style="font-weight: 700; color: #ef4444;">📍 Citizen Reported Location</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Coordinates: ${initialLat.toFixed(4)}, ${initialLng.toFixed(4)}
        </div>
      </div>
    `).openPopup();

    if (road && road.geometry && road.geometry.coordinates) {
      const latLngs = road.geometry.coordinates.map((pt) => [pt[1], pt[0]]);
      const isBlocked = road.status === "blocked";
      const color = isBlocked ? "#ef4444" : getRiskColor(road.risk_score);

      const polyline = L.polyline(latLngs, {
        color: color,
        weight: 6,
        opacity: 0.9,
        dashArray: isBlocked ? "8, 8" : null,
      }).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: system-ui; min-width: 200px;">
          <div style="font-weight: 700; color: #0f172a;">🛣️ Auto-Linked Road: ${road.road_id}</div>
          <div style="font-size: 11px; margin-top: 4px;">
            Status: <b style="color: ${isBlocked ? "#ef4444" : "#10b981"};">${isBlocked ? "BLOCKED 🚫" : "OPEN ✅"}</b>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Risk Score: <b>${road.risk_score} / 100</b>
          </div>
        </div>
      `);

    }

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, road]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: "350px" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-2 border border-slate-200">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
        Report Location vs Monitored Road Segment
      </div>
    </div>
  );
}
