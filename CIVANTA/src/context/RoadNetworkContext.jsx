import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { roadService } from "../services/roadService";

const RoadNetworkContext = createContext(null);

export function RoadNetworkProvider({ children }) {
  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState(null);
  const [lastRouteRequest, setLastRouteRequest] = useState(null);
  const lastRouteRequestRef = useRef(null);

  const fetchRoads = useCallback(async () => {
    try {
      const data = await roadService.getRoads();
      setRoads(data);
    } catch (err) {
      console.error("Failed to fetch roads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoads();
  }, [fetchRoads]);

  const calculateRoute = useCallback(async (origin, destination) => {
    try {
      const req = { origin, destination };
      setLastRouteRequest(req);
      lastRouteRequestRef.current = req;
      const routeData = await roadService.getRoute(origin, destination);
      setActiveRoute(routeData);
      return routeData;
    } catch (err) {
      console.error("Route calculation error:", err);
      throw err;
    }
  }, []);

  // Real-time WebSocket synchronization for road status flips & automatic alternate route recalculation
  useEffect(() => {
    let wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl && apiUrl.startsWith("http")) {
        wsUrl = apiUrl.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "/ws");
      } else {
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.port === "5173" ? "localhost:8000" : window.location.host;
        wsUrl = `${wsProtocol}//${wsHost}/ws`;
      }
    }

    let ws;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const type = message.type;
          const payload = message.payload;

          if (type === "road:blocked" || type === "road:unblocked") {
            const targetRoadId = payload.road_id;
            const newStatus = type === "road:blocked" ? "blocked" : "open";

            setRoads((prevRoads) =>
              prevRoads.map((r) =>
                r.road_id === targetRoadId ? { ...r, status: newStatus } : r
              )
            );

            // Automatically recalculate driver route live to show alternate path
            if (lastRouteRequestRef.current) {
              const { origin, destination } = lastRouteRequestRef.current;
              roadService.getRoute(origin, destination)
                .then((newRoute) => setActiveRoute(newRoute))
                .catch((e) => console.error("Error auto recalculating alternate route:", e));
            }
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };
    } catch (e) {
      console.error("WebSocket setup error:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <RoadNetworkContext.Provider
      value={{
        roads,
        loading,
        activeRoute,
        fetchRoads,
        calculateRoute,
        setActiveRoute
      }}
    >
      {children}
    </RoadNetworkContext.Provider>
  );
}

export const useRoadNetwork = () => useContext(RoadNetworkContext);
