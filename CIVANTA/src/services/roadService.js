import api from "./api";

export const roadService = {
  getRoads: async () => {
    const res = await api.get("/roads");
    return res.data;
  },
  getRoute: async (origin, destination) => {
    const res = await api.post("/routes", {
      from: origin,
      to: destination
    });
    return res.data;
  }
};
