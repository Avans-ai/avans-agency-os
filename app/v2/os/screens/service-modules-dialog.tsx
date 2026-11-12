"use client";

import { useMemo, useState } from "react";
import { AvansModuleIcon } from "../brand";
import { people, serviceCatalog, serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel } from "../overlays";
import {
  MODULE_WORKSPACE_AREAS,
  SERVICE_DESCRIPTIONS,
  SERVICE_RELATIONS,
  applyModuleDrafts,
  canManageModules,
  changesContract,
  defaultLeader,
  planSectionsFor,
  resolveModules,
  useServiceModules,
  type ModuleDraft,
} from "../service-modules";
import { Badge, buttonClass } from "../ui";
import s from "../os.module.css";
import d from "./service-modules.module.css";

/** «+ Agregar módulo de servicio»: visible for admins and the assigned PM. */
export function AddServiceModuleButton({ client, label = "+ Agregar módulo de servicio", variant = "primary" }: { client: OsClient; label?: string; variant?: "primary" | "secondary" }) {
  const { role } = useOsStore();
  const [open, setOpen] = useState(false);
  if (!canManageModules(role, client.slug)) return null;
  return (
    <>
      <button type="button" className={buttonClass(variant, true)} onClick={() => setOpen(true)}>{label}</button>
      {open ? <ServiceModulesDialog client={client} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ServiceModulesDialog({ client, onClose }: { client: OsClient; onClose: () => void }) {
  const { servicesOf, setServices, notify } = useOsStore();
  const { stored, save, invalid } = useServiceModules(client);
  const active = servicesOf(client.slug);
  const current = useMemo(() => resolveModules(client, stored, active), [client, stored, active]);
  const [drafts, setDrafts] = useState<Record<string, ModuleDraft>>(() =>
    Object.fromEntries(
      serviceCatalog.map((service) => {
        const saved = current[service.id];
        return [service.id, {
          serviceId: service.id,
          active: active.includes(service.id),
          kind: saved?.kind ?? "contracted",
          scope: saved?.scope ?? "",
          startDate: saved?.startDate ?? "",
          leader: saved?.leader ?? defaultLeader(client, service.id),
        }];
      }),
    ),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const changed = serviceCatalog.map((service) => drafts[service.id]).filter((draft) => {
    const before = current[draft.serviceId];
    return !!before?.active !== draft.active || (draft.active && (before?.kind !== draft.kind || (before?.scope ?? "") !== draft.scope || (before?.startDate ?? "") !== draft.startDate || (before?.leader ?? "") !== draft.leader));
  });
  const contractual = changed.filter((draft) => changesContract(current, draft));

  function update(serviceId: ServiceId, patch: Partial<ModuleDraft>) {
    setDrafts((value) => ({ ...value, [serviceId]: { ...value[serviceId], ...patch } }));
    setError("");
  }

  function submit() {
    if (!changed.length) { onClose(); return; }
    const missingScope = changed.filter((draft) => draft.active && draft.kind === "contracted" && !draft.scope.trim());
    if (missingScope.length) {
      setError(`Describí el alcance contratado de: ${missingScope.map((draft) => serviceLabel(draft.serviceId)).join(", ")}.`);
      return;
    }
    if (contractual.length && !confirmed) {
      setError("Confirmá que los cambios de alcance contractual fueron acordados con el cliente.");
      return;
    }
    const { modules, changes } = applyModuleDrafts(current, changed);
    save(modules);
    const nextActive = serviceCatalog.map((service) => service.id).filter((id) => drafts[id].active);
    setServices(client.slug, nextActive);
    notify(`${changes.length} módulo(s) actualizados · guardado en este navegador`, "success");
    onClose();
  }

  return (
    <OSSidePanel
      label={`Módulos de servicio de ${client.name}`}
      heading={<h2 className={d.title}>Módulos de servicio · {client.name}</h2>}
      onClose={onClose}
      persistentFooter
      wide
      footer={
        <div className={d.footer}>
          {contractual.length ? (
            <label className={d.confirm}>
              <input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(""); }} />
              Confirmo que los cambios de alcance de {contractual.map((draft) => serviceLabel(draft.serviceId)).join(", ")} fueron acordados con el cliente.
            </label>
          ) : null}
          {error ? <p className={d.error} role="alert">{error}</p> : null}
          <div className={d.footerActions}>
            <button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button>
            <button type="button" className={buttonClass("primary")} onClick={submit}>{changed.length ? `Guardar ${changed.length} cambio(s)` : "Cerrar"}</button>
          </div>
        </div>
      }
    >
      <div className={d.dialog}>
        <p className={s.demoNote} style={{ margin: 0 }}>
          Al activar un módulo se suma a la navegación del cliente, se habilitan sus secciones del Plan de Marketing y se prepara su espacio de {MODULE_WORKSPACE_AREAS.join(", ").toLowerCase()}. Desactivarlo lo oculta sin borrar datos ni historial. Persistencia local de la preview: no se sincroniza entre usuarios.
        </p>
        {invalid ? <p className={d.error} role="alert">La configuración guardada tiene un formato incompatible. No se sobrescribe hasta que guardes.</p> : null}
        <ul className={d.list}>
          {serviceCatalog.map((service) => {
            const draft = drafts[service.id];
            const saved = current[service.id];
            const plan = planSectionsFor(service.id);
            return (
              <li key={service.id} className={d.item} data-active={draft.active}>
                <label className={d.itemHead}>
                  <input type="checkbox" checked={draft.active} onChange={(event) => update(service.id, { active: event.target.checked })} aria-describedby={`module-${service.id}-desc`} />
                  <span className={d.icon} aria-hidden="true"><AvansModuleIcon name={service.icon} size={32} /></span>
                  <span className={d.itemTitle}>
                    <strong>{service.label}</strong>
                    <span id={`module-${service.id}-desc`}>{SERVICE_DESCRIPTIONS[service.id]}</span>
                  </span>
                  <span className={d.badges}>
                    {saved?.active ? <Badge tone="cool">Activo · {saved.kind === "contracted" ? "Contratado" : "Demostración"}</Badge> : saved ? <Badge tone="stone">Inactivo · datos conservados</Badge> : <Badge tone="stone">No activo</Badge>}
                  </span>
                </label>
                {draft.active ? (
                  <div className={d.config}>
                    <div className={d.kind} role="group" aria-label={`Tipo de módulo de ${service.label}`}>
                      <button type="button" aria-pressed={draft.kind === "contracted"} onClick={() => update(service.id, { kind: "contracted" })}>Contratado</button>
                      <button type="button" aria-pressed={draft.kind === "demo"} onClick={() => update(service.id, { kind: "demo" })}>Demostración</button>
                    </div>
                    <div className={d.grid}>
                      <label className={s.field}>
                        <span>Responsable o líder</span>
                        <select className={`${s.input} ${s.inputSm}`} value={draft.leader} onChange={(event) => update(service.id, { leader: event.target.value })}>
                          <option value="">Sin asignar</option>
                          {people.map((person) => <option key={person.name}>{person.name}</option>)}
                        </select>
                      </label>
                      <label className={s.field}>
                        <span>Fecha de inicio</span>
                        <input type="date" className={`${s.input} ${s.inputSm}`} value={draft.startDate} onChange={(event) => update(service.id, { startDate: event.target.value })} />
                      </label>
                    </div>
                    <label className={s.field}>
                      <span>Alcance contratado{draft.kind === "contracted" ? <span className={s.req} aria-hidden="true"> *</span> : null}</span>
                      <textarea className={`${s.input} ${s.inputSm}`} rows={2} value={draft.scope} placeholder={draft.kind === "contracted" ? "Entregables, frecuencia y límites acordados" : "Opcional en módulos de demostración"} onChange={(event) => update(service.id, { scope: event.target.value })} />
                    </label>
                    <p className={d.meta}>
                      <strong>Plan de Marketing:</strong> {plan.length ? plan.join(" · ") : "plantilla estratégica pendiente de definición"}
                      <br />
                      <strong>Se relaciona con:</strong> {SERVICE_RELATIONS[service.id].map(serviceLabel).join(" · ")}
                    </p>
                    {saved?.history.length ? (
                      <details className={d.history}>
                        <summary>Historial · {saved.history.length}</summary>
                        <ul>{saved.history.slice().reverse().map((entry, index) => <li key={`${entry.at}-${index}`}>{new Date(entry.at).toLocaleString("es-AR")} · {entry.actor} · {entry.action}</li>)}</ul>
                      </details>
                    ) : null}
                  </div>
                ) : saved?.history.length ? <p className={d.meta}>Última acción: {saved.history[saved.history.length - 1].action}</p> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </OSSidePanel>
  );
}
