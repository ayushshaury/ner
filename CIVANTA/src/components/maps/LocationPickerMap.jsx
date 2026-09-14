import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LocationPickerMap({ lat, lng, onChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

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

    const icon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker([initialLat, initialLng], { icon, draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      onChange({ lat: pos.lat, lng: pos.lng });
    });

    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      onChange({ lat: clickLat, lng: clickLng });
    });

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: "320px" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      <div className="absolute bottom-2 left-2 z-[400] bg-white/95 backdrop-blur px-3 py-1 rounded-md text-xs font-semibold text-slate-700 shadow-sm border border-slate-200">
        📍 Pinned: {lat ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Click on map to select location"}
      </div>
    </div>
  );
}
