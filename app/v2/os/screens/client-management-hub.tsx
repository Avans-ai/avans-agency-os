"use client";

/* Gestión y estrategia: información de la cuenta y canales, accesos a Ficha,
 * Benchmark, Plan, Reportes y Documentos, y estado/actualizaciones recientes.
 * Todo lo que antes ocupaba la cabecera del cliente vive acá. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { AvansIcon, AvansModuleIcon, type AvansIconName } from "../brand";
import { canManageClient, directorMeta, type ClientChannel } from "../director-data";
import { externalBrands } from "../knowledge/benchmark";
import { questionnaireProgress } from "../knowledge/questionnaire";
import { useKnowledge } from "../knowledge/use-knowledge";
import { useLocalStorageState } from "../local-persistence";
import { serviceCatalog, type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { Avatar, Badge, buttonClass } from "../ui";
import s from "../os.module.css";
import h from "./client-management-hub.module.css";
import type { ClientManagementView } from "./client-management-views";

export const CHANNEL_TYPES = ["Sitio web", "Redes sociales", "Meta Ads", "Google Ads", "LinkedIn", "E-commerce", "CRM", "Otra plataforma"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];
type StoredChannel = ClientChannel & { type?: ChannelType };

/** Compatibilidad: los canales guardados antes no tenían tipo; se infiere del nombre. */
export function channelType(channel: StoredChannel): ChannelType {
  if (channel.type && CHANNEL_TYPES.includes(channel.type)) return channel.type;
  const label = channel.label.toLowerCase();
  if (/meta|facebook ads/.test(label)) return "Meta Ads";
  if (/google ads|adwords/.test(label)) return "Google Ads";
  if (/linkedin/.test(label)) return "LinkedIn";
  if (/tienda|shop|ecommerce|e-commerce|tiendanube|mercado/.test(label)) return "E-commerce";
  if (/crm|hubspot|salesforce/.test(label)) return "CRM";
  if (channel.kind === "web" || /web|sitio/.test(label)) return "Sitio web";
  if (channel.kind === "social") return "Redes sociales";
  return "Otra plataforma";
}
const TYPE_ICON: Record<ChannelType, AvansIconName> = {
  "Sitio web": "enlace",
  "Redes sociales": "dialogo",
  "Meta Ads": "senal",
  "Google Ads": "busqueda",
  LinkedIn: "grupo",
  "E-commerce": "cartera",
  CRM: "embudo",
  "Otra plataforma": "integracion",
};
const KIND_FOR: Record<ChannelType, ClientChannel["kind"]> = {
  "Sitio web": "web",
  "Redes sociales": "social",
  "Meta Ads": "platform",
  "Google Ads": "platform",
  LinkedIn: "social",
  "E-commerce": "platform",
  CRM: "platform",
  "Otra plataforma": "platform",
};

export const MANAGEMENT_SECTIONS: { id: ClientManagementView; label: string; description: string; icon: AvansIconName }[] = [
  { id: "ficha", label: "Ficha del cliente", description: "Alcance, Discovery y cuestionario", icon: "identidad" },
  { id: "benchmark", label: "Benchmark", description: "Competidores e insights", icon: "monitor" },
  { id: "plan", label: "Plan de Marketing", description: "Plan por módulo contratado", icon: "objetivo" },
  { id: "reportes", label: "Reportes", description: "Semanal y mensual", icon: "datos" },
  { id: "documentos", label: "Documentos", description: "Fuentes y actualizaciones", icon: "registro" },
];

/** Subnavegación dentro de Gestión y estrategia (resumen + cinco accesos). */
export function ManagementSubnav({ client, view }: { client: OsClient; view: string }) {
  const current = view === "cuestionario" ? "ficha" : view;
  return (
    <nav className={h.subnav} aria-label={`Gestión de ${client.name}`}>
      <Link href={`/v2/clientes/${client.slug}?view=gestion`} aria-current={current === "gestion" ? "page" : undefined}>Resumen</Link>
      {MANAGEMENT_SECTIONS.map((item) => (
        <Link key={item.id} href={`/v2/clientes/${client.slug}?view=${item.id}`} aria-current={current === item.id ? "page" : undefined}>{item.label}</Link>
      ))}
    </nav>
  );
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function ClientManagementHub({ client }: { client: OsClient }) {
  const { role, notify, servicesOf } = useOsStore();
  const canManage = canManageClient(role, client.slug);
  const meta = directorMeta(client.slug);
  const [channels, setChannels] = useLocalStorageState<StoredChannel[]>(`client:${client.slug}:channels`, meta?.channels ?? []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ type: ChannelType; label: string; value: string }>({ type: "Sitio web", label: "", value: "" });
  const { k, d: discovery } = useKnowledge(client);
  const active = serviceCatalog.filter((service) => servicesOf(client.slug).includes(service.id));

  const status = useMemo(() => {
    const progress = questionnaireProgress(k.questionnaire);
    const brands = externalBrands(k.benchmark);
    const planItems = Object.values(k.plan.modules).flat().filter(Boolean);
    const validatedPlan = planItems.filter((item) => item?.status === "Validado").length;
    const pendingProposals = k.proposals.filter((proposal) => proposal.status === "pending").length;
    const openReviews = k.reviews.filter((review) => !review.resolvedAt).length;
    return {
      ficha: { line: `Discovery ${discovery.status.toLowerCase()} · Cuestionario ${progress.answered} de ${progress.total}`, tone: discovery.status === "Validado" ? ("cool" as const) : ("peach" as const), badge: discovery.status },
      benchmark: { line: `${brands.length} ${brands.length === 1 ? "marca analizada" : "marcas analizadas"} · ${k.benchmark.findings.length} conclusiones`, tone: k.benchmark.findings.length ? ("cool" as const) : ("stone" as const), badge: k.benchmark.findings.length ? "Con conclusiones" : "Sin conclusiones" },
      plan: { line: `${active.length} módulos · ${validatedPlan} de ${planItems.length} decisiones validadas`, tone: planItems.length && validatedPlan === planItems.length ? ("cool" as const) : ("peach" as const), badge: planItems.length ? `${validatedPlan}/${planItems.length}` : "Sin decisiones" },
      reportes: { line: "Semanal operativo y mensual de resultados", tone: "stone" as const, badge: "Datos demo" },
      documentos: { line: `${k.sources.length} fuentes · ${pendingProposals} cambios para aprobar`, tone: pendingProposals || openReviews ? ("peach" as const) : ("cool" as const), badge: pendingProposals || openReviews ? `${pendingProposals + openReviews} pendientes` : "Al día" },
      pendingProposals,
      openReviews,
    };
  }, [active.length, discovery.status, k]);

  const updates = useMemo(() => [...k.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6), [k.audit]);
  const byType = useMemo(() => {
    const groups = new Map<ChannelType, StoredChannel[]>();
    for (const channel of channels) groups.set(channelType(channel), [...(groups.get(channelType(channel)) ?? []), channel]);
    return groups;
  }, [channels]);

  function update(id: string, patch: Partial<StoredChannel>) {
    setChannels((current) => current.map((channel) => (channel.id === id ? { ...channel, ...patch, ...(patch.type ? { kind: KIND_FOR[patch.type] } : {}) } : channel)));
  }
  function add() {
    if (!draft.value.trim()) {
      notify("Completá la cuenta, URL o descripción del canal", "error");
      return;
    }
    setChannels((current) => [...current, { id: `LOCAL-${Date.now()}`, type: draft.type, kind: KIND_FOR[draft.type], label: draft.label.trim() || draft.type, value: draft.value.trim() }]);
    setDraft({ type: draft.type, label: "", value: "" });
    notify("Canal agregado · guardado en este navegador", "success");
  }
  function remove(id: string) {
    setChannels((current) => current.filter((channel) => channel.id !== id));
    notify("Canal quitado de la cuenta (solo en este navegador)");
  }

  return (
    <div className={h.hub}>
      <section className={h.account} aria-labelledby="account-title">
        <div className={h.sectionHead}>
          <div>
            <span className={h.eyebrow}>01 · Cuenta</span>
            <h2 id="account-title">Información de la cuenta y canales</h2>
          </div>
          {canManage ? (
            <button type="button" className={buttonClass(editing ? "dark" : "secondary", true)} aria-expanded={editing} onClick={() => setEditing((value) => !value)}>{editing ? "Listo" : "Editar canales"}</button>
          ) : <Badge tone="stone">Canales en solo lectura</Badge>}
        </div>
        <dl className={h.facts}>
          <div><dt>Cliente desde</dt><dd>{client.since}</dd></div>
          <div><dt>Burbuja</dt><dd>{client.bubble}</dd></div>
          <div><dt>Responsable</dt><dd>{client.owner}</dd></div>
          <div><dt>Equipo</dt><dd className={h.team}>{client.team.slice(0, 5).map((person) => <Avatar key={person.name} name={person.name} size="sm" />)}<span>{client.team.length}</span></dd></div>
          <div className={h.wide}><dt>Módulos activos</dt><dd className={h.modules}>{active.length ? active.map((service) => <span key={service.id}><AvansModuleIcon name={service.icon} size={20} />{service.label}</span>) : "Sin módulos activos"}</dd></div>
        </dl>
        <div className={h.channels} aria-label="Canales y plataformas">
          {channels.length ? CHANNEL_TYPES.filter((type) => byType.has(type)).map((type) => (
            <div className={h.channelGroup} key={type}>
              <span className={h.channelType}><AvansIcon name={TYPE_ICON[type]} size={16} />{type}</span>
              <ul>
                {byType.get(type)!.map((channel) => (
                  <li key={channel.id} className={h.channel}>
                    {editing ? (
                      <div className={h.channelEdit}>
                        <label><span className={s.srOnly}>Tipo de {channel.label}</span><select className={`${s.input} ${s.inputSm}`} value={channelType(channel)} onChange={(event) => update(channel.id, { type: event.target.value as ChannelType })}>{CHANNEL_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
                        <label><span className={s.srOnly}>Nombre de {channel.label}</span><input className={`${s.input} ${s.inputSm}`} value={channel.label} onChange={(event) => update(channel.id, { label: event.target.value })} /></label>
                        <label><span className={s.srOnly}>Cuenta o URL de {channel.label}</span><input className={`${s.input} ${s.inputSm}`} value={channel.value} onChange={(event) => update(channel.id, { value: event.target.value })} /></label>
                        <button type="button" className={buttonClass("ghost", true)} onClick={() => remove(channel.id)} aria-label={`Quitar ${channel.label}`}>Quitar</button>
                      </div>
                    ) : (
                      <><strong>{channel.label}</strong><span>{channel.value}</span></>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )) : <p className={s.demoNote}>Todavía no hay canales cargados.</p>}
        </div>
        {editing ? (
          <form className={h.addChannel} onSubmit={(event) => { event.preventDefault(); add(); }} aria-label="Agregar canal">
            <label className={s.field}><span>Tipo</span><select className={`${s.input} ${s.inputSm}`} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ChannelType })}>{CHANNEL_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className={s.field}><span>Nombre</span><input className={`${s.input} ${s.inputSm}`} value={draft.label} placeholder={draft.type} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
            <label className={s.field}><span>Cuenta, URL o detalle</span><input className={`${s.input} ${s.inputSm}`} value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} /></label>
            <button type="submit" className={buttonClass("primary", true)}>Agregar canal</button>
          </form>
        ) : null}
        <p className={s.demoNote}>Canales guardados en este navegador. Registrar un canal no conecta la plataforma ni sincroniza datos; los permisos de la preview son visuales, no de backend.</p>
      </section>

      <section aria-labelledby="management-access-title">
        <div className={h.sectionHead}>
          <div>
            <span className={h.eyebrow}>02 · Gestión y estrategia</span>
            <h2 id="management-access-title">Documentos de gestión</h2>
          </div>
        </div>
        <nav className={h.accessGrid} aria-label={`Accesos de gestión de ${client.name}`}>
          {MANAGEMENT_SECTIONS.map((item) => {
            const info = status[item.id as "ficha" | "benchmark" | "plan" | "reportes" | "documentos"];
            return (
              <Link key={item.id} href={`/v2/clientes/${client.slug}?view=${item.id}`} className={h.access}>
                <span className={h.accessIcon}><AvansIcon name={item.icon} size={22} /></span>
                <strong>{item.label}</strong>
                <span className={h.accessDesc}>{item.description}</span>
                <span className={h.accessStatus}><Badge tone={info.tone}>{info.badge}</Badge><small>{info.line}</small></span>
              </Link>
            );
          })}
        </nav>
      </section>

      <section className={h.updates} aria-labelledby="management-updates-title">
        <div className={h.sectionHead}>
          <div>
            <span className={h.eyebrow}>03 · Estado</span>
            <h2 id="management-updates-title">Estado y actualizaciones relevantes</h2>
          </div>
          <div className={h.counters}>
            <span><strong>{status.pendingProposals}</strong> cambios para aprobar</span>
            <span><strong>{status.openReviews}</strong> revisiones abiertas</span>
          </div>
        </div>
        {updates.length ? (
          <ol className={h.timeline}>
            {updates.map((entry) => (
              <li key={entry.id}><time dateTime={entry.at}>{formatDate(entry.at)}</time><span>{entry.action}</span><small>{entry.actor}</small></li>
            ))}
          </ol>
        ) : <p className={s.demoNote}>Sin actualizaciones registradas en Discovery, Benchmark, Plan o Documentos.</p>}
        {status.pendingProposals || status.openReviews ? <Link className={s.link} href={`/v2/clientes/${client.slug}?view=documentos`}>Revisar en Documentos</Link> : null}
      </section>
    </div>
  );
}

