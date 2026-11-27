/* Ayudas de prueba para la cadena de tareas por etapa (app/v2/os/workflow-tasks.ts).
 * Un objeto de origen puede tener varias tareas (revisión, diseño, ajustes…), pero:
 * ids únicos, una sola tarea abierta a la vez y todas vinculadas a la primera de la cadena. */
import { expect } from "@playwright/test";

export type ChainTask = { id: string; status: string; owner: string; chainId?: string; cycle?: number; workflow?: { kind: string; stage: string; href: string }; workItem?: { id: string; collection: string }; completedAt?: string; previousTaskId?: string; serviceId?: string; title: string; createdAt?: string };

export const openOf = <T extends { status: string }>(tasks: T[]) => tasks.filter((task) => task.status !== "Hecho");

/** Verifica la cadena y devuelve la tarea vigente (la abierta o, si terminó, la última creada). */
export function expectChain<T extends ChainTask>(tasks: T[], base?: string): T {
  expect(tasks.length, "la cadena tiene al menos una tarea").toBeGreaterThan(0);
  expect(new Set(tasks.map((task) => task.id)).size, "ids únicos").toBe(tasks.length);
  expect(openOf(tasks).length, "como máximo una tarea abierta por origen").toBeLessThanOrEqual(1);
  const first = base ? tasks.find((task) => task.id === base) : tasks.find((task) => !task.chainId);
  expect(first, "la primera tarea conserva el id histórico").toBeTruthy();
  for (const task of tasks) if (task.id !== first!.id) expect(task.chainId).toBe(first!.id);
  for (const task of tasks.filter((item) => item.status === "Hecho")) expect(task.completedAt, `${task.id} completada con fecha`).toBeTruthy();
  const later = tasks.filter((task) => task.id !== first!.id).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  return openOf(tasks)[0] ?? later.at(-1) ?? first!;
}
