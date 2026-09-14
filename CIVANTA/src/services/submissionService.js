import api from "./api";

export const submissionService = {
  list: async () => {
    const res = await api.get("/submissions");
    return res.data;
  },
  get: async (id) => {
    const res = await api.get("/submissions");
    const item = res.data.find((s) => s.id === id);
    if (!item) throw new Error("Submission not found");
    return item;
  },
  create: async (data) => {
    const res = await api.post("/submissions", data);
    return res.data;
  },
  update: async (id, changes) => {
    const res = await api.patch(`/submissions/${id}`, changes);
    return res.data;
  }
};
