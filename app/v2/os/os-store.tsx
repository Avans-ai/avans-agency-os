"use client";

/* Preview store for Avans OS.
 * Changes persist in localStorage so the review flow survives reloads on the
 * same browser. This is intentionally not presented as Supabase or as
 * multi-user persistence. Replace these actions with authenticated server
 * mutations once the Avans Supabase project is active and its RLS policies
 * have been applied and tested. */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { CURRENT_USER, ideas as seedIdeas, osClients, osTasks, serviceLabel, type DueKind, type Idea, type IdeaState, type OsTask, type Priority, type ServiceId, type TaskStatus } from "./os-data";
import { readLocalJson, writeLocalJson } from "./local-persistence";

export type PreviewRole = "admin" | "operativo";
export type Toast = { id: number; message: string; tone: "default" | "success" | "error"; undo?: OsTask[] };

type State = {
  tasks: OsTask[];
  seq: number;
  role: PreviewRole;
  toast: Toast | null;
  toastSeq: number;
  services: Record<string, ServiceId[]>;
  ideas: Idea[];
  ideaSeq: number;
};
type PersistedState = Pick<State, "tasks" | "seq" | "role" | "services" | "ideas" | "ideaSeq">;
type Action =
  | { type: "hydrate"; state: PersistedState }
  | { type: "replace"; tasks: OsTask[]; toast?: Omit<Toast, "id"> | null; seq?: number }
  | { type: "toast"; toast: Omit<Toast, "id"> | null }
  | { type: "role"; role: PreviewRole }
  | { type: "services"; clientSlug: string; services: ServiceId[]; message: string }
  | { type: "ideas"; ideas: Idea[]; ideaSeq?: number; message: string };

const STORE_KEY = "workspace";
const localMessage = (message: string) => `${message} · guardado en este navegador`;

function seedState(): State {
  return {
    tasks: osTasks,
    seq: 150,
    role: "admin",
    toast: null,
    toastSeq: 0,
    services: Object.fromEntries(osClients.map((client) => [client.slug, client.services])),
    ideas: seedIdeas,
    ideaSeq: 40,
  };
}

function validPersistedState(value: PersistedState | null, fallback: State): PersistedState {
  if (!value || !Array.isArray(value.tasks) || !Array.isArray(value.ideas) || typeof value.services !== "object") {
    return fallback;
  }
  return {
    tasks: value.tasks,
    seq: Number.isFinite(value.seq) ? value.seq : fallback.seq,
    role: value.role === "operativo" ? "operativo" : "admin",
    services: { ...fallback.services, ...value.services },
    ideas: value.ideas,
    ideaSeq: Number.isFinite(value.ideaSeq) ? value.ideaSeq : fallback.ideaSeq,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state };
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
    case "ideas": {
      const toastSeq = state.toastSeq + 1;
      return { ...state, ideas: action.ideas, ideaSeq: action.ideaSeq ?? state.ideaSeq, toastSeq, toast: { id: toastSeq, message: action.message, tone: "default" } };
    }
  }
}

const now = (text: string) => ({ text: `${CURRENT_USER.name} ${text}`, when: "Ahora" });
const completionDate = (status: TaskStatus, previous?: string) => status === "Hecho" ? previous ?? new Date().toISOString() : undefined;

export type NewTaskInput = { projectSlug: string; title: string; owner: string; prio: Priority; due: string; dueKind: DueKind };

type Store = {
  tasks: OsTask[];
  role: PreviewRole;
  toast: Toast | null;
  ideas: Idea[];
  localHydrated: boolean;
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
  const [state, dispatch] = useReducer(reducer, undefined, seedState);
  const [localHydrated, setLocalHydrated] = useState(false);

  useEffect(() => {
    const fallback = seedState();
    const stored = readLocalJson<PersistedState | null>(STORE_KEY, null);
    dispatch({ type: "hydrate", state: validPersistedState(stored, fallback) });
    setLocalHydrated(true);
  }, []);

  useEffect(() => {
    if (!localHydrated) return;
    const persisted: PersistedState = {
      tasks: state.tasks,
      seq: state.seq,
      role: state.role,
      services: state.services,
      ideas: state.ideas,
      ideaSeq: state.ideaSeq,
    };
    writeLocalJson(STORE_KEY, persisted);
  }, [localHydrated, state.ideaSeq, state.ideas, state.role, state.seq, state.services, state.tasks]);

  const update = useCallback((id: string, change: (task: OsTask) => OsTask, message: string, tone: Toast["tone"] = "default", undoable = false) => {
    const next = state.tasks.map((item) => (item.id === id ? change({ ...item }) : item));
    dispatch({ type: "replace", tasks: next, toast: { message: localMessage(message), tone, undo: undoable ? state.tasks : undefined } });
  }, [state.tasks]);

  const store = useMemo<Store>(() => ({
    tasks: state.tasks,
    role: state.role,
    toast: state.toast,
    ideas: state.ideas,
    localHydrated,
    servicesOf: (clientSlug) => state.services[clientSlug] ?? [],
    setServices: (clientSlug, services) => {
      const before = state.services[clientSlug] ?? [];
      const added = services.filter((id) => !before.includes(id)).map(serviceLabel);
      const removed = before.filter((id) => !services.includes(id)).map(serviceLabel);
      const parts = [added.length ? `Activado: ${added.join(", ")}` : "", removed.length ? `Desactivado: ${removed.join(", ")}` : ""].filter(Boolean);
      dispatch({ type: "services", clientSlug, services, message: localMessage(parts.join(" · ") || "Sin cambios en los servicios") });
    },
    addIdea: (clientSlug, title, detail) => {
      const id = `I-${state.ideaSeq}`;
      const idea: Idea = { id, clientSlug, title, detail, source: "Carga manual", author: CURRENT_USER.name, when: "Ahora", state: "Nueva" };
      dispatch({ type: "ideas", ideas: [idea, ...state.ideas], ideaSeq: state.ideaSeq + 1, message: localMessage(`${id} agregada al centro de ideas`) });
    },
    setIdeaState: (id, ideaState) => dispatch({ type: "ideas", ideas: state.ideas.map((idea) => (idea.id === id ? { ...idea, state: ideaState } : idea)), message: localMessage(`${id}: ${ideaState}`) }),
    setRole: (role) => dispatch({ type: "role", role }),
    setStatus: (id, status) => update(id, (item) => ({ ...item, status, completedAt: completionDate(status, item.completedAt), archivedAt: status === "Hecho" ? item.archivedAt : undefined, activity: [now(`cambió el estado de ${item.status} a ${status}`), ...item.activity] }), `Estado actualizado: ${status}`, "default", true),
    setPriority: (id, prio) => update(id, (item) => ({ ...item, prio, activity: [now(`cambió la prioridad a ${prio}`), ...item.activity] }), "Prioridad actualizada"),
    addComment: (id, text) => update(id, (item) => ({ ...item, comments: [...item.comments, { who: CURRENT_USER.name, when: "Ahora", text }], activity: [now("comentó"), ...item.activity] }), "Comentario publicado"),
    unblock: (id) => update(id, (item) => ({ ...item, blocked: undefined, activity: [now("quitó el bloqueo"), ...item.activity] }), "Tarea desbloqueada", "success", true),
    toggleDone: (id) => {
      const target = state.tasks.find((item) => item.id === id);
      if (!target) return;
      const done = target.status !== "Hecho";
      update(id, (item) => ({ ...item, status: done ? "Hecho" : "Por hacer", completedAt: done ? item.completedAt ?? new Date().toISOString() : undefined, archivedAt: done ? item.archivedAt : undefined, activity: [now(done ? "marcó la tarea como Hecho" : "reabrió la tarea"), ...item.activity] }), done ? `${target.id} marcada como hecha` : `${target.id} reabierta`, "default", true);
    },
    approve: (id) => {
      const unblocked = state.tasks.filter((item) => item.blocked?.includes(`(${id})`)).map((item) => item.id);
      const next = state.tasks.map((item) => {
        if (item.id === id) return { ...item, status: "Hecho" as const, completedAt: item.completedAt ?? new Date().toISOString(), activity: [now("aprobó la entrega"), ...item.activity] };
        if (unblocked.includes(item.id)) return { ...item, blocked: undefined, activity: [{ text: `Se desbloqueó al aprobarse ${id}`, when: "Ahora" }, ...item.activity] };
        return item;
      });
      const extra = unblocked.length ? ` ${unblocked.join(", ")} queda desbloqueada.` : "";
      dispatch({ type: "replace", tasks: next, toast: { message: localMessage(`Aprobado.${extra}`), tone: "success", undo: state.tasks } });
    },
    requestChanges: (id, note) => update(id, (item) => ({
      ...item,
      status: "En curso",
      completedAt: undefined,
      archivedAt: undefined,
      comments: note ? [...item.comments, { who: CURRENT_USER.name, when: "Ahora", text: note }] : item.comments,
      activity: [now("pidió cambios"), ...item.activity],
    }), "Cambios pedidos: la tarea vuelve a En curso", "default", true),
    createTask: (input) => {
      const id = `T-${state.seq}`;
      const created: OsTask = {
        id, projectSlug: input.projectSlug, title: input.title, owner: input.owner, prio: input.prio, due: input.due, dueKind: input.dueKind,
        status: "Por hacer", desc: "Sin descripción todavía.", files: [], comments: [], activity: [now("creó la tarea")],
      };
      dispatch({ type: "replace", tasks: [...state.tasks, created], seq: state.seq + 1, toast: { message: localMessage(`${id} creada en Por hacer`), tone: "default", undo: state.tasks } });
      return id;
    },
    notify: (message, tone = "default") => dispatch({ type: "toast", toast: { message, tone } }),
    undo: () => {
      if (state.toast?.undo) dispatch({ type: "replace", tasks: state.toast.undo, toast: { message: localMessage("Cambio deshecho"), tone: "default" } });
    },
    dismissToast: () => dispatch({ type: "toast", toast: null }),
  }), [localHydrated, state, update]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useOsStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useOsStore must be used inside OsStoreProvider");
  return store;
}
