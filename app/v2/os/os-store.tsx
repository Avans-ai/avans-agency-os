"use client";

/* Preview store for Avans OS.
 * Changes persist in localStorage so the review flow survives reloads on the
 * same browser. This is intentionally not presented as Supabase or as
 * multi-user persistence. Replace these actions with authenticated server
 * mutations once the Avans Supabase project is active and its RLS policies
 * have been applied and tested. */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useSyncExternalStore, type ReactNode } from "react";
import { CURRENT_USER, ideas as seedIdeas, osClients, osTasks, serviceLabel, type DueKind, type Idea, type IdeaState, type OsTask, type Priority, type ServiceId, type TaskStatus, type TaskWorkItem } from "./os-data";
import { readLocalJson, writeLocalJson, writeLocalBatch } from "./local-persistence";
import { clientOfTask, serviceForTask, withTaskService } from "./director-data";

import { PREVIEW_ROLES, previewActor, type PreviewRole } from "./preview-roles";
import { upcomingNotifications, workflowNotification, type WorkflowNotification, type LocalWrite } from "./workflow-tasks";
import { withContentDemoTasks } from "./modules/content-demo-tasks";
export type { PreviewRole } from "./preview-roles";
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
  notifications: WorkflowNotification[];
  hydrated: boolean;
};
type PersistedState = Pick<State, "tasks" | "seq" | "role" | "services" | "ideas" | "ideaSeq" | "notifications">;
type Action =
  | { type: "hydrate"; state: PersistedState }
  | { type: "replace"; tasks: OsTask[]; toast?: Omit<Toast, "id"> | null; seq?: number; notification?: WorkflowNotification }
  | { type: "toast"; toast: Omit<Toast, "id"> | null }
  | { type: "role"; role: PreviewRole }
  | { type: "services"; clientSlug: string; services: ServiceId[]; message: string }
  | { type: "ideas"; ideas: Idea[]; ideaSeq?: number; message: string };

const STORE_KEY = "workspace";
const localMessage = (message: string) => `${message} · guardado en este navegador`;

function seedState(): State {
  return {
    // Datos de demostración de Contenidos: un navegador nuevo empieza con la tarea de cada contenido demo.
    tasks: withContentDemoTasks(osTasks, false),
    seq: 150,
    role: "admin",
    toast: null,
    toastSeq: 0,
    services: Object.fromEntries(osClients.map((client) => [client.slug, client.services])),
    ideas: seedIdeas,
    ideaSeq: 40,
    notifications: [],
    hydrated: false,
  };
}

function validPersistedState(value: PersistedState | null, fallback: State): PersistedState {
  if (!value || !Array.isArray(value.tasks) || !Array.isArray(value.ideas) || typeof value.services !== "object") {
    return fallback;
  }
  return {
    // Migración compatible (misma clave): las tareas guardadas antes de `serviceId` lo reciben
    // desde serviceForTask. No se descarta ni se reescribe ningún otro dato.
    tasks: value.tasks.map(withTaskService),
    seq: Number.isFinite(value.seq) ? value.seq : fallback.seq,
    role: PREVIEW_ROLES.some((item) => item.id === value.role) ? value.role : "admin",
    notifications: Array.isArray(value.notifications) ? value.notifications : [],
    services: { ...fallback.services, ...value.services },
    ideas: value.ideas,
    ideaSeq: Number.isFinite(value.ideaSeq) ? value.ideaSeq : fallback.ideaSeq,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state, hydrated: true, toast: state.toast?.undo ? null : state.toast };
    case "replace": {
      const toastSeq = action.toast ? state.toastSeq + 1 : state.toastSeq;
      return { ...state, notifications: action.notification ? [action.notification, ...state.notifications] : state.notifications, tasks: action.tasks, seq: action.seq ?? state.seq, toastSeq, toast: action.toast ? { ...action.toast, id: toastSeq } : action.toast === null ? null : state.toast };
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

export type NewTaskInput = {
  projectSlug: string;
  title: string;
  owner: string;
  prio: Priority;
  due: string;
  dueKind: DueKind;
  /** Módulo dueño de la tarea. Si falta se deduce del proyecto (serviceForTask). */
  serviceId?: ServiceId;
  workItem?: TaskWorkItem;
  deliverable?: string;
  desc?: string;
  approver?: string;
};

export type TaskEdit = Partial<Pick<OsTask, "owner" | "due" | "dueKind" | "desc" | "approver" | "deliverable" | "workItem" | "projectSlug">>;

type Store = {
  tasks: OsTask[];
  role: PreviewRole;
  toast: Toast | null;
  ideas: Idea[];
  localHydrated: boolean;
  notifications: WorkflowNotification[];
  markNotificationRead: (id: string) => void;
  commitWorkflow: (task: OsTask, notification: WorkflowNotification | undefined, writes: LocalWrite[]) => boolean;
  /** Reemplaza tareas y registros locales en un solo guardado (p. ej. reiniciar datos de demostración). */
  commitTasks: (update: (tasks: OsTask[]) => OsTask[], writes: LocalWrite[]) => boolean;
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
  /** Edita responsable, vencimiento, vínculos o descripción y deja constancia en la actividad. */
  editTask: (id: string, patch: TaskEdit, activity: string) => void;
  /** Registra una referencia de archivo (nombre/enlace). No sube binarios. */
  addFileRef: (id: string, name: string, meta: string) => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
  undo: () => void;
  dismissToast: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function OsStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);

  useEffect(() => {
    const fallback = seedState();
    const stored = readLocalJson<PersistedState | null>(STORE_KEY, null);
    dispatch({ type: "hydrate", state: validPersistedState(stored, fallback) });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const persisted: PersistedState = {
      tasks: state.tasks,
      seq: state.seq,
      role: state.role,
      services: state.services,
      ideas: state.ideas,
      ideaSeq: state.ideaSeq,
      notifications: state.notifications,
    };
    const saved = readLocalJson<PersistedState | null>(STORE_KEY, null);
    if (JSON.stringify(saved) !== JSON.stringify(persisted)) writeLocalJson(STORE_KEY, persisted);
  }, [state.hydrated, state.ideaSeq, state.ideas, state.role, state.seq, state.services, state.tasks, state.notifications]);

  // Keep other open tabs in this browser coherent. No cross-device sync is implied.
  useEffect(() => {
    function receive(event: StorageEvent) {
      if (event.key === "avans-os:preview:v1:workspace" && event.newValue) {
        const value = readLocalJson<PersistedState | null>(STORE_KEY, null);
        if (value) dispatch({ type: "hydrate", state: validPersistedState(value, seedState()) });
      }
    }
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);

  const update = useCallback((id: string, change: (task: OsTask) => OsTask, message: string, tone: Toast["tone"] = "default", undoable = false) => {
    const next = state.tasks.map((item) => (item.id === id ? change({ ...item }) : item));
    const before = state.tasks.find((item) => item.id === id);
    const after = next.find((item) => item.id === id);
    const kind = after && before ? after.owner !== before.owner ? "owner" : after.status === "En aprobación" && before.status !== after.status ? "review" : after.blocked && before.blocked !== after.blocked ? "blocked" : undefined : undefined;
    const notification = kind && after ? workflowNotification({ ...after, clientSlug: clientOfTask(after)?.slug }, `${id}-${Date.now()}`, new Date().toISOString(), kind) : undefined;
    dispatch({ type: "replace", tasks: next, notification, toast: { message: localMessage(message), tone, undo: undoable ? state.tasks : undefined } });
  }, [state.tasks]);

  const store = useMemo<Store>(() => ({
    tasks: state.tasks,
    role: state.role,
    toast: state.toast,
    ideas: state.ideas,
    localHydrated: state.hydrated,
    notifications: state.notifications,
    markNotificationRead: (id) => {
      const latest = validPersistedState(readLocalJson<PersistedState | null>(STORE_KEY, null), state);
      const reminder = upcomingNotifications(latest.tasks, new Date().toISOString()).find((item) => item.id === id);
      const all = reminder && !latest.notifications.some((item) => item.id === id) ? [...latest.notifications, reminder] : latest.notifications;
      const next = { ...latest, notifications: all.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) };
      if (writeLocalJson(STORE_KEY, next)) dispatch({ type: "hydrate", state: next });
    },
    commitWorkflow: (task, notification, writes) => {
      const latest = validPersistedState(readLocalJson<PersistedState | null>(STORE_KEY, null), state);
      const next: PersistedState = { ...latest,
        tasks: latest.tasks.some((item) => item.id === task.id) ? latest.tasks.map((item) => item.id === task.id ? task : item) : [...latest.tasks, task],
        notifications: notification && !latest.notifications.some((item) => item.id === notification.id) ? [notification, ...latest.notifications] : latest.notifications,
      };
      if (!writeLocalBatch([...writes, { key: STORE_KEY, value: next }])) {
        dispatch({ type: "toast", toast: { message: "No se pudo guardar el cambio. Revisá el espacio disponible del navegador y reintentá.", tone: "error" } });
        return false;
      }
      dispatch({ type: "hydrate", state: next });
      return true;
    },
    commitTasks: (update, writes) => {
      const latest = validPersistedState(readLocalJson<PersistedState | null>(STORE_KEY, null), state);
      const next: PersistedState = { ...latest, tasks: update(latest.tasks) };
      if (!writeLocalBatch([...writes, { key: STORE_KEY, value: next }])) {
        dispatch({ type: "toast", toast: { message: "No se pudo guardar el cambio. Revisá el espacio disponible del navegador y reintentá.", tone: "error" } });
        return false;
      }
      dispatch({ type: "hydrate", state: next });
      return true;
    },
    servicesOf: (clientSlug) => state.services[clientSlug] ?? [],
    setServices: (clientSlug, services) => {
      const before = state.services[clientSlug] ?? [];
      const added = services.filter((id) => !before.includes(id)).map(serviceLabel);
      const removed = before.filter((id) => !services.includes(id)).map(serviceLabel);
      const parts = [added.length ? `Activado: ${added.join(", ")}` : "", removed.length ? `Desactivado: ${removed.join(", ")}` : ""].filter(Boolean);
      // Se persiste en el acto: commitTasks/commitWorkflow parten de lo guardado y, si un módulo que se
      // monta enseguida (p. ej. al activarse) los usa antes del efecto de persistencia, no deben
      // restaurar la lista de servicios anterior.
      const latest = validPersistedState(readLocalJson<PersistedState | null>(STORE_KEY, null), state);
      writeLocalJson(STORE_KEY, { ...latest, services: { ...latest.services, [clientSlug]: services } });
      dispatch({ type: "services", clientSlug, services, message: localMessage(parts.join(" · ") || "Sin cambios en los servicios") });
    },
    addIdea: (clientSlug, title, detail) => {
      const id = `I-${state.ideaSeq}`;
      const idea: Idea = { id, clientSlug, title, detail, source: "Carga manual", author: CURRENT_USER.name, when: "Ahora", state: "Nueva" };
      dispatch({ type: "ideas", ideas: [idea, ...state.ideas], ideaSeq: state.ideaSeq + 1, message: localMessage(`${id} agregada al centro de ideas`) });
    },
    setIdeaState: (id, ideaState) => dispatch({ type: "ideas", ideas: state.ideas.map((idea) => (idea.id === id ? { ...idea, state: ideaState } : idea)), message: localMessage(`${id}: ${ideaState}`) }),
    setRole: (role) => dispatch({ type: "role", role }),
    setStatus: (id, status) => {
      if (state.tasks.find((task) => task.id === id)?.workflow) { dispatch({ type: "toast", toast: { message: "Abrí la pieza vinculada para avanzar su revisión y conservar las aprobaciones.", tone: "default" } }); return; }
      update(id, (item) => ({ ...item, status, completedAt: completionDate(status, item.completedAt), archivedAt: status === "Hecho" ? item.archivedAt : undefined, activity: [now(`cambió el estado de ${item.status} a ${status}`), ...item.activity] }), `Estado actualizado: ${status}`, "default", true); },
    setPriority: (id, prio) => update(id, (item) => ({ ...item, prio, activity: [now(`cambió la prioridad a ${prio}`), ...item.activity] }), "Prioridad actualizada"),
    addComment: (id, text) => update(id, (item) => ({ ...item, comments: [...item.comments, { who: CURRENT_USER.name, when: "Ahora", text }], activity: [now("comentó"), ...item.activity] }), "Comentario publicado"),
    unblock: (id) => update(id, (item) => ({ ...item, blocked: undefined, activity: [now("quitó el bloqueo"), ...item.activity] }), "Tarea desbloqueada", "success", true),
    toggleDone: (id) => {
      const target = state.tasks.find((item) => item.id === id);
      if (!target) return;
      if (target.workflow) { dispatch({ type: "toast", toast: { message: "Completá la acción desde la pieza vinculada.", tone: "default" } }); return; }
      const done = target.status !== "Hecho";
      update(id, (item) => ({ ...item, status: done ? "Hecho" : "Por hacer", completedAt: done ? item.completedAt ?? new Date().toISOString() : undefined, archivedAt: done ? item.archivedAt : undefined, activity: [now(done ? "marcó la tarea como Hecho" : "reabrió la tarea"), ...item.activity] }), done ? `${target.id} marcada como hecha` : `${target.id} reabierta`, "default", true);
    },
    approve: (id) => {
      if (state.tasks.find((task) => task.id === id)?.workflow) { dispatch({ type: "toast", toast: { message: "Revisá y aprobá desde la pieza vinculada.", tone: "default" } }); return; }
      const unblocked = state.tasks.filter((item) => item.blocked?.includes(`(${id})`)).map((item) => item.id);
      const next = state.tasks.map((item) => {
        if (item.id === id) return { ...item, status: "Hecho" as const, completedAt: item.completedAt ?? new Date().toISOString(), activity: [now("aprobó la entrega"), ...item.activity] };
        if (unblocked.includes(item.id)) return { ...item, blocked: undefined, activity: [{ text: `Se desbloqueó al aprobarse ${id}`, when: "Ahora" }, ...item.activity] };
        return item;
      });
      const extra = unblocked.length ? ` ${unblocked.join(", ")} queda desbloqueada.` : "";
      dispatch({ type: "replace", tasks: next, toast: { message: localMessage(`Aprobado.${extra}`), tone: "success", undo: state.tasks } });
    },
    requestChanges: (id, note) => {
      if (state.tasks.find((task) => task.id === id)?.workflow) { dispatch({ type: "toast", toast: { message: "Pedí los ajustes desde la pieza vinculada.", tone: "default" } }); return; }
      update(id, (item) => ({
      ...item,
      status: "En curso",
      completedAt: undefined,
      archivedAt: undefined,
      comments: note ? [...item.comments, { who: CURRENT_USER.name, when: "Ahora", text: note }] : item.comments,
      activity: [now("pidió cambios"), ...item.activity],
    }), "Cambios pedidos: la tarea vuelve a En curso", "default", true); },
    createTask: (input) => {
      const id = `T-${state.seq}`;
      const created: OsTask = {
        id, projectSlug: input.projectSlug, title: input.title, owner: input.owner, prio: input.prio, due: input.due, dueKind: input.dueKind,
        serviceId: input.serviceId ?? serviceForTask({ id, projectSlug: input.projectSlug }),
        workItem: input.workItem,
        deliverable: input.deliverable,
        approver: input.approver,
        status: "Por hacer", desc: input.desc?.trim() || "Sin descripción todavía.", files: [], comments: [], activity: [{ text: `${previewActor(state.role)} creó la tarea`, when: new Date().toISOString() }],
      };
      dispatch({ type: "replace", tasks: [...state.tasks, created], notification: workflowNotification({ ...created, clientSlug: clientOfTask(created)?.slug }, `${id}-${Date.now()}`, new Date().toISOString(), "assignment"), seq: state.seq + 1, toast: { message: localMessage(`${id} creada en Por hacer`), tone: "default", undo: state.tasks } });
      return id;
    },
    editTask: (id, patch, activity) => update(id, (item) => ({ ...item, ...patch, activity: [now(activity), ...item.activity] }), "Tarea actualizada", "default", true),
    addFileRef: (id, name, meta) => update(id, (item) => ({ ...item, files: [...item.files, { name, ext: "REF", meta }], activity: [now(`registró el archivo «${name}»`), ...item.activity] }), "Referencia de archivo registrada"),
    notify: (message, tone = "default") => dispatch({ type: "toast", toast: { message, tone } }),
    undo: () => {
      if (state.toast?.undo) dispatch({ type: "replace", tasks: state.toast.undo, toast: { message: localMessage("Cambio deshecho"), tone: "default" } });
    },
    dismissToast: () => dispatch({ type: "toast", toast: null }),
  }), [state, update]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function useOsStore() {
  const store = useContext(StoreContext);
  // A streamed/Suspense child may hydrate after the provider has loaded storage.
  // Its first render must still match the server's seed, then reveal local data.
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  if (!store) throw new Error("useOsStore must be used inside OsStoreProvider");
  return hydrated ? store : {
    ...store,
    tasks: osTasks,
    ideas: seedIdeas,
    role: "admin" as PreviewRole,
    notifications: [],
    localHydrated: false,
    servicesOf: (slug: string) => osClients.find((client) => client.slug === slug)?.services ?? [],
  };
}
