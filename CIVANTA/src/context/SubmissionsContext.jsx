import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { submissionService } from "../services/submissionService";

const SubmissionsContext = createContext(null);

export function SubmissionsProvider({ children }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      const data = await submissionService.list();
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Real-time WebSocket sync across all browser sessions/tabs
  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.port === "5173" ? "localhost:8000" : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;

    let ws;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const type = message.type;
          const payload = message.payload;

          if (type === "submission:created") {
            setSubmissions((prev) => {
              if (prev.some((s) => s.id === payload.id)) return prev;
              return [payload, ...prev];
            });
          } else if (type === "submission:updated") {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === payload.id ? payload : s))
            );
          }
        } catch (e) {
          console.error("Submissions WebSocket parse error:", e);
        }
      };
    } catch (e) {
      console.error("Submissions WebSocket connection error:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const addSubmission = useCallback(async (data) => {
    try {
      const created = await submissionService.create({
        title: data.title,
        category: data.category,
        description: data.description,
        lat: data.lat || 26.18,
        lng: data.lng || 91.75,
        priority: data.priority || "Medium",
        department: data.department || "—"
      });
      setSubmissions((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      return created;
    } catch (err) {
      console.error("Error creating submission:", err);
      throw err;
    }
  }, []);

  const updateSubmission = useCallback(async (id, changes) => {
    try {
      const updated = await submissionService.update(id, changes);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? updated : s))
      );
      return updated;
    } catch (err) {
      console.error("Error updating submission:", err);
      throw err;
    }
  }, []);

  return (
    <SubmissionsContext.Provider
      value={{ submissions, loading, addSubmission, updateSubmission, refresh: fetchSubmissions }}
    >
      {children}
    </SubmissionsContext.Provider>
  );
}

export const useSubmissions = () => useContext(SubmissionsContext);
