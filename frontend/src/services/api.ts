import api from "./http";

export const ComponenteAPI = {
  list: () => api.get("/componentes/"),
  create: (data) => api.post("/componentes/", { ...data, tipo: "componente" }),
};

export const ListaTecnicaAPI = {
  list: () => api.get("/listas-tecnicas/"),
  create: (data) => api.post("/listas-tecnicas/", { ...data, tipo: "lista" }),
};