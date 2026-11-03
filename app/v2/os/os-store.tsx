"use client";

/* Session store for the Avans OS demo.
 * There is no backend yet (no Supabase client, no API routes), so every change
 * here lives only in this browser tab and is lost on reload. The UI says so
 * explicitly: toasts are suffixed «(simulado)» and the header shows
 * «Datos de demostración». Replace the reducer actions with server actions or
 * API calls once persistence and permissions exist. */
import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { CURRENT_USER, ideas as seedIdeas, osClients, osTasks, serviceLabel, type DueKind, type Idea, type IdeaState, type OsTask, type Priority, type ServiceId, type TaskStatus } from "./os-data";

export type PreviewRole = "admin" | "operativo";
export type Toast = { id: number; message: string; tone: "default" | "success" | "error"; undo?: OsTask[] };

type State = { tasks: OsTask[]; seq: number; role: PreviewRole; toast: Toast | null; toastSeq: number; services: Record<string, ServiceId[]>; ideas: Idea[]; ideaSeq: number; discovery: Record<string, Record<string,string>> };
type Action =
  | { type: "replace"; tasks: OsTask[]; toast?: Omit<Toast, "id"> | null; seq?: number }
  | { type: "toast"; toast: Omit<Toast, "id"> | null }
  | { type: "role"; role: PreviewRole }
  | { type: "services"; clientSlug: string; services: ServiceId[]; message: string }
  | { type: "ideas"; ideas: Idea[]; ideaSeq?: number; message: string }
  | { type: "discovery"; clientSlug: string; fields: Record<string,string> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "replace": {
      const toastSeq = action.toast ? state.toastSeq + 1 : state.toastSeq;
      return { ...state, tasks: action.tasks, seq: action.seq ?? state.seq, toastSeq, toast: action.toast ? { ...action.toast, id: toastSeq } : action.toast === null ? null : state.toast };
    }
    case "toast": {
      const toastSeq = state.toastSeq + 1;
      return { ...state, toastSeq, toast: action.toast ? { ...action.toast, id: toastSeq } : null };
    }
    case "role":
      return { ...state, role: action.role };
    case "services": {
      const toastSeq = state.toastSeq + 1;
      return { ...state, services: { ...state.services, [action.clientSlug]: action.services }, toastSeq, toast: { id: toastSeq, message: action.message, tone: "success" } };
    }
    case "discovery": {
      const toastSeq = state.toastSeq + 1;
      return { ...state, discovery: { ...state.discovery, [action.clientSlug]: action.fields }, toastSeq,
        toast: { id: toastSeq, tone: "success", message: "Marketing Discovery: borrador actualizado en esta sesión (simulado)" } };
    }
    case "ideas": {
      const toastSeq = state.toastSeq + 1;
      return { ...state, ideas: action.ideas, ideaSeq: action.ideaSeq ?? state.ideaSeq, toastSeq, toast: { id: toastSeq, message: action.message, tone: "default" } };
    }
  }
}

const now = (text: string) => ({ text: `${CURRENT_USER.name} ${text}`, when: "Ahora" });

export type NewTaskInput = { projectSlug: string; title: string; owner: string; prio: Priority; due: string; dueKind: DueKind };

type Store = {
  tasks: OsTask[];
  role: PreviewRole;
  toast: Toast | null;
  ideas: Idea[];
  discoveryOf: (clientSlug: string) => Record<string,string>;
  saveDiscovery: (clientSlug: string, fields: Record<string,string>) => void;
  servicesOf: (clientSlug: string) => ServiceId[];
  setServices: (clientSlug: string, services: ServiceId[]) => void;
  addIdea: (clientSlug: string, title: string, detail: string) => void;
  setIdeaState: (id: string, state: IdeaState) => void;
  setRole: (role: PreviewRole) => void;
  setStatus: (id: string, status: TaskStatus) => void;
  setPriority: (id: string, prio: Priority) => void;
  addComment: (id: string, text: string) => void;
  unblock: (id: string) => void;
  toggleDone: (id: string) => void;
  approve: (id: string) => void;
  requestChanges: (id: string, note?: string) => void;
  createTask: (input: NewTaskInput) => string;
  notify: (message: string, tone?: Toast["tone"]) => void;
  undo: () => void;
  dismissToast: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function OsStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    tasks: osTasks, seq: 150, role: "admin", toast: null, toastSeq: 0,
    services: Object.fromEntries(osClients.map(client => [client.slug, client.services])), ideas: seedIdeas, ideaSeq: 40, discovery: {},
  });

  const update = useCallback((id: string, change: (task: OsTask) => OsTask, message: string, tone: Toast["tone"] = "default", undoable = false) => {
    const next = state.tasks.map(item => (item.id === id ? change({ ...item }) : item));
    dispatch({ type: "replace", tasks: next, toast: { message, tone, undo: undoable ? state.tasks : undefined } });
  }, [state.tasks]);

  const store = useMemo<Store>(() => ({
    tasks: state.tasks,
    role: state.role,
    toast: state.toast,
    ideas: state.ideas,
    discoveryOf: clientSlug => state.discovery[clientSlug] ?? {},
    saveDiscovery: (clientSlug, fields) => dispatch({ type: "discovery", clientSlug, fields }),
    servicesOf: clientSlug => state.services[clientSlug] ?? [],
    setServices: (clientSlug, services) => {
      const before = state.services[clientSlug] ?? [];
      const added = services.filter(id => !before.includes(id)).map(serviceLabel);
      const removed = before.filter(id => !services.includes(id)).map(serviceLabel);
      const parts = [added.length ? `Activado: ${added.join(", ")}` : "", removed.length ? `Desactivado: ${removed.join(", ")}` : ""].filter(Boolean);
      dispatch({ type: "services", clientSlug, services, message: `${parts.join(" · ") || "Sin cambios en los servicios"} (simulado)` });
    },
    addIdea: (clientSlug, title, detail) => {
      const id = `I-${state.ideaSeq}`;
      const idea: Idea = { id, clientSlug, title, detail, source: "Carga manual", author: CURRENT_USER.name, when: "Ahora", state: "Nueva" };
      dispatch({ type: "ideas", ideas: [idea, ...state.ideas], ideaSeq: state.ideaSeq + 1, message: `${id} agregada al centro de ideas (simulado)` });
    },
    setIdeaState: (id, ideaState) => dispatch({ type: "ideas", ideas: state.ideas.map(idea => (idea.id === id ? { ...idea, state: ideaState } : idea)), message: `${id}: ${ideaState} (simulado)` }),
    setRole: role => dispatch({ type: "role", role }),
    setStatus: (id, status) => update(id, item => ({ ...item, status, activity: [now(`cambió el estado de ${item.status} a ${status}`), ...item.activity] }), `Estado actualizado: ${status} (simulado)`, "default", true),
    setPriority: (id, prio) => update(id, item => ({ ...item, prio, activity: [now(`cambió la prioridad a ${prio}`), ...item.activity] }), "Prioridad actualizada (simulado)"),
    addComment: (id, text) => update(id, item => ({ ...item, comments: [...item.comments, { who: CURRENT_USER.name, when: "Ahora", text }], activity: [now("comentó"), ...item.activity] }), "Comentario publicado (simulado)"),
    unblock: id => update(id, item => ({ ...item, blocked: undefined, activity: [now("quitó el bloqueo"), ...item.activity] }), "Tarea desbloqueada (simulado)", "success", true),
    toggleDone: id => {
      const target = state.tasks.find(item => item.id === id);
      if (!target) return;
      const done = target.status !== "Hecho";
      update(id, item => ({ ...item, status: done ? "Hecho" : "Por hacer", activity: [now(done ? "marcó la tarea como Hecho" : "reabrió la tarea"), ...item.activity] }), done ? `${target.id} marcada como hecha (simulado)` : `${target.id} reabierta (simulado)`, "default", true);
    },
    approve: id => {
      const unblocked = state.tasks.filter(item => item.blocked?.includes(`(${id})`)).map(item => item.id);
      const next = state.tasks.map(item => {
        if (item.id === id) return { ...item, status: "Hecho" as const, activity: [now("aprobó la entrega"), ...item.activity] };
        if (unblocked.includes(item.id)) return { ...item, blocked: undefined, activity: [{ text: `Se desbloqueó al aprobarse ${id}`, when: "Ahora" }, ...item.activity] };
        return item;
      });
      const extra = unblocked.length ? ` ${unblocked.join(", ")} queda desbloqueada.` : "";
      dispatch({ type: "replace", tasks: next, toast: { message: `Aprobado.${extra} (simulado)`, tone: "success", undo: state.tasks } });
    },
    requestChanges: (id, note) => update(id, item => ({
      ...item,
      status: "En curso",
      comments: note ? [...item.comments, { who: CURRENT_USER.name, when: "Ahora", text: note }] : item.comments,
      activity: [now("pidió cambios"), ...item.activity],
    }), "Cambios pedidos: la tarea vuelve a En curso (simulado)", "default", true),
    createTask: input => {
      const id = `T-${state.seq}`;
      const created: OsTask = {
        id, projectSlug: input.projectSlug, title: input.title, owner: input.owner, prio: input.prio, due: input.due, dueKind: input.dueKind,
        status: "Por hacer", desc: "Sin descripción todavía.", files: [], comments: [], activity: [now("creó la tarea")],
      };
      dispatch({ type: "replace", tasks: [...state.tasks, created], seq: state.seq + 1, toast: { message: `${id} creada en Por hacer (simulado)`, tone: "default", undo: state.tasks } });
      return id;
    },
    notify: (message, tone = "default") => dispatch({ type: "toast", toast: { message, tone } }),
    undo: () => {
      if (state.toast?.undo) dispatch({ type: "replace", tasks: state.toast.undo, toast: { message: "Cambio deshecho", tone: "default" } });
    },
    dismissToast: () => dispatch({ type: "toast", toast: null }),
  }), [state, update]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useOsStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useOsStore must be used inside OsStoreProvider");
  return store;
}
