"use client";

/* Instancia 1 · Planificación general de la campaña, paso a paso, con borrador guardado
 * y envío a validación del PM. Target y productos se eligen del Marketing Discovery. */
import { useState } from "react";
import { OSSidePanel } from "../overlays";
import type { OsClient } from "../os-data";
import { buttonClass } from "../ui";
import { CAMPAIGN_OBJECTIVES } from "./paid-collections";
import { campaignPlan, FUNNEL_STAGES, joinList, monthsBetween, PAID_CHANNELS, PLAN_STEPS, planStepErrors, sharesTotal, type PaidChannel } from "./paid-model";
import { AiPending, ChannelStack, DiscoveryLink, moneyShort, usePaidDiscovery, type DiscoveryOption } from "./paid-ui";
import { usePaidOperations } from "./use-paid-operations";
import type { ModuleRecord } from "./types";
import p from "./paid.module.css";

const FIELDS = ["nombre", "objetivo", "inicio", "fin", "icpIds", "segmentoIds", "audiencia", "productoIds", "productosTexto", "presupuestoMensual", "presupuesto", "enfoque", "mensaje", "funnel", "metaAds", "googleAds", "otrosCanales", "landing", "estimuloWhatsapp", "estimuloCrm", "estimuloEmail"] as const;

function initialValues(campaign?: ModuleRecord) {
  const values: Record<string, string> = {};
  for (const key of FIELDS) values[key] = campaign?.values[key] ?? "";
  return values;
}
function initialChannels(campaign?: ModuleRecord) {
  const shares = campaign ? campaignPlan(campaign).channels : {};
  return Object.fromEntries(PAID_CHANNELS.map((channel) => [channel, shares[channel] ? String(shares[channel]) : ""])) as Record<PaidChannel, string>;
}

function Picker({ legend, options, selected, onChange, disabled, empty }: { legend: string; options: DiscoveryOption[]; selected: string[]; onChange: (ids: string[]) => void; disabled: boolean; empty: React.ReactNode }) {
  return <fieldset className={p.fieldset} data-wide>
    <legend>{legend}</legend>
    {options.length ? options.map((option) => <label key={option.id} className={p.check}><input type="checkbox" disabled={disabled} checked={selected.includes(option.id)} onChange={(event) => onChange(event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))} /><span>{option.name} <span className={p.small}>· {option.detail}</span></span></label>) : <p className={p.small} role="status">{empty}</p>}
  </fieldset>;
}

export function CampaignWizard({ client, campaign, onClose, onDone }: { client: OsClient; campaign?: ModuleRecord; onClose: () => void; onDone: (record: ModuleRecord) => void }) {
  const ops = usePaidOperations(client);
  const discovery = usePaidDiscovery(client);
  const [current, setCurrent] = useState<ModuleRecord | undefined>(campaign);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(campaign));
  const [channels, setChannels] = useState<Record<PaidChannel, string>>(() => initialChannels(campaign));
  const [step, setStep] = useState(() => (campaign ? campaignPlan(campaign).step : 0));
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState("");
  const editable = ops.can("lt");
  const plan = current ? campaignPlan(current) : undefined;
  const locked = plan?.state === "En validación del PM" || plan?.state === "Aprobada";
  const disabled = !editable || locked;
  const stepDef = PLAN_STEPS[step];
  const set = (key: string, value: string) => { setValues((before) => ({ ...before, [key]: value })); setSaved(""); };
  const ids = (key: string) => (values[key] || "").split(",").filter(Boolean);
  const total = sharesTotal(Object.fromEntries(Object.entries(channels).map(([key, value]) => [key, Number(value) || 0])));
  const payload = () => ({ ...values, canales: JSON.stringify(Object.fromEntries(Object.entries(channels).filter(([, value]) => Number(value) > 0).map(([key, value]) => [key, Number(value)]))), pasoPlan: String(step) });
  const done = (index: number) => !planStepErrors(payload(), PLAN_STEPS[index].id).length;

  function save(note?: string) {
    const record = ops.savePlanDraft(payload(), current, note);
    if (record) { setCurrent(record); setSaved(`Borrador guardado · paso ${step + 1} de ${PLAN_STEPS.length}`); }
    return record;
  }
  function next() {
    const problems = planStepErrors(payload(), stepDef.id);
    setErrors(problems);
    if (problems.length) return;
    if (step < PLAN_STEPS.length - 1) setStep(step + 1);
  }
  function submit() {
    const problems = planStepErrors(payload(), "all");
    setErrors(problems);
    if (problems.length) return;
    const record = save("Completó la planificación");
    if (!record) return;
    const sent = ops.planAction(record, "submit");
    if (sent) onDone(sent);
  }

  const months = monthsBetween(values.inicio, values.fin);
  const title = current ? `Planificación · ${current.values.nombre}` : "Nueva campaña · Instancia 1";
  return <OSSidePanel label={title} heading={<span>Instancia 1 · Planificación general · {client.name}</span>} onClose={onClose} extraWide>
    <div className={p.stack} style={{ gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{title}</h2>
      <p className={p.muted}>El Líder técnico ({ops.team.lt}) configura la campaña paso a paso y la envía a validación del PM ({ops.team.pm}). Se guarda en este navegador; los roles son visuales.</p>
      {!editable ? <p className={p.errors} style={{ paddingLeft: 12 }} role="status">Tu rol de vista previa puede consultar la planificación, pero solo el Líder técnico asignado a la cuenta la configura.</p> : null}
      {locked ? <p className={p.ok} role="status">La planificación está «{plan?.state}»: para editarla, el PM tiene que devolverla.</p> : null}
      <div className={p.wizard}>
        <nav aria-label="Pasos de la planificación"><ol className={p.steps}>{PLAN_STEPS.map((item, index) => <li key={item.id}><button type="button" aria-current={index === step ? "step" : undefined} data-done={done(index)} onClick={() => { setErrors([]); setStep(index); }}><b>{index + 1}</b><span>{item.label}<small>{item.hint}</small></span></button></li>)}</ol></nav>
        <div>
          <div className={p.stepBody}>
            <h3>{step + 1}. {stepDef.label}</h3>
            {stepDef.id === "target" ? <div className={p.fields}>
              <label data-wide><span>Nombre de la campaña</span><input value={values.nombre} disabled={disabled} maxLength={120} onChange={(e) => set("nombre", e.target.value)} /></label>
              <label><span>Objetivo</span><select value={values.objetivo} disabled={disabled} onChange={(e) => set("objetivo", e.target.value)}><option value="">Elegir…</option>{CAMPAIGN_OBJECTIVES.map((o) => <option key={o}>{o}</option>)}</select></label>
              <label><span>Inicio</span><input type="date" value={values.inicio} disabled={disabled} onChange={(e) => set("inicio", e.target.value)} /></label>
              <label><span>Fin (opcional)</span><input type="date" value={values.fin} disabled={disabled} onChange={(e) => set("fin", e.target.value)} /></label>
              <Picker legend="ICP del Discovery" options={discovery.icps} selected={ids("icpIds")} disabled={disabled} onChange={(next) => set("icpIds", joinList(next))} empty={<>El Discovery de {client.name} no tiene ICP cargados. <DiscoveryLink client={client}>Completalo en el Marketing Discovery</DiscoveryLink> o describí el target abajo.</>} />
              <Picker legend="Segmentos del Discovery" options={discovery.segments} selected={ids("segmentoIds")} disabled={disabled} onChange={(next) => set("segmentoIds", joinList(next))} empty={<>El Discovery de {client.name} no tiene segmentos cargados.</>} />
              <label data-wide><span>Target (detalle o texto libre)</span><textarea rows={2} value={values.audiencia} disabled={disabled} maxLength={600} onChange={(e) => set("audiencia", e.target.value)} placeholder="Ej.: jefes de mantenimiento de plantas de más de 50 empleados" /></label>
            </div> : null}
            {stepDef.id === "productos" ? <div className={p.fields}>
              <Picker legend="Productos o servicios del Discovery" options={discovery.offerings} selected={ids("productoIds")} disabled={disabled} onChange={(next) => set("productoIds", joinList(next))} empty={<>El Discovery de {client.name} no tiene productos ni servicios cargados. <DiscoveryLink client={client}>Cargalos en el Marketing Discovery</DiscoveryLink> o describilos abajo.</>} />
              <label data-wide><span>Productos o servicios (texto, si no están en el Discovery)</span><textarea rows={2} value={values.productosTexto} disabled={disabled} maxLength={600} onChange={(e) => set("productosTexto", e.target.value)} /></label>
            </div> : null}
            {stepDef.id === "presupuesto" ? <div className={p.fields}>
              <label><span>Presupuesto mensual (ARS)</span><input inputMode="numeric" value={values.presupuestoMensual} disabled={disabled} onChange={(e) => set("presupuestoMensual", e.target.value.replace(/[^\d]/g, ""))} /></label>
              <label><span>Presupuesto total del período (ARS, opcional)</span><input inputMode="numeric" value={values.presupuesto} disabled={disabled} onChange={(e) => set("presupuesto", e.target.value.replace(/[^\d]/g, ""))} /></label>
              <p className={p.small} data-wide>{Number(values.presupuestoMensual) ? `${moneyShort(Number(values.presupuestoMensual))} por mes × ${months} ${months === 1 ? "mes" : "meses"} ≈ ${moneyShort(Number(values.presupuestoMensual) * months)} en el período.` : "El presupuesto mensual alimenta el semáforo de ritmo de gasto del Inicio."}</p>
            </div> : null}
            {stepDef.id === "canales" ? <div className={p.fields}>
              {PAID_CHANNELS.map((channel) => <label key={channel}><span>{channel} (%)</span><input inputMode="decimal" aria-label={`${channel} (%)`} value={channels[channel]} disabled={disabled} onChange={(e) => { setChannels((before) => ({ ...before, [channel]: e.target.value.replace(/[^\d.]/g, "") })); setSaved(""); }} /></label>)}
              <div data-wide className={p.stack} style={{ gap: 8 }}>
                <p className={total === 100 ? p.ok : p.errors} style={{ paddingLeft: 12 }} role="status">Total: {Math.round(total * 10) / 10} % {total === 100 ? "· distribución completa" : "· tiene que sumar 100 %"}</p>
                <ChannelStack channels={Object.fromEntries(Object.entries(channels).map(([key, value]) => [key, Number(value) || 0]))} label="Distribución planificada" />
                <p className={p.small}>Ninguna plataforma está conectada: la distribución es el plan, no un dato sincronizado. ChatGPT Ads: disponibilidad a validar.</p>
              </div>
            </div> : null}
            {stepDef.id === "enfoque" ? <div className={p.fields}>
              <label data-wide><span>Enfoque publicitario</span><textarea rows={3} value={values.enfoque} disabled={disabled} maxLength={1500} onChange={(e) => set("enfoque", e.target.value)} placeholder="Ángulo, tensión o beneficio que guía la campaña" /></label>
              <label data-wide><span>Mensaje principal</span><textarea rows={2} value={values.mensaje} disabled={disabled} maxLength={600} onChange={(e) => set("mensaje", e.target.value)} /></label>
              <fieldset className={p.fieldset} data-wide><legend>Etapas del funnel que cubre</legend><div className={p.chips}>{FUNNEL_STAGES.map((stage) => { const on = ids("funnel").includes(stage); return <button type="button" key={stage} className={p.toggle} aria-pressed={on} disabled={disabled} onClick={() => set("funnel", joinList(on ? ids("funnel").filter((item) => item !== stage) : [...ids("funnel"), stage]))}>{stage}</button>; })}</div></fieldset>
              <div data-wide><AiPending what="Sugerencia de estrategia publicitaria" /></div>
            </div> : null}
            {stepDef.id === "anuncios" ? <div className={p.fields}>
              <label data-wide><span>Anuncios de Meta Ads</span><textarea rows={3} value={values.metaAds} disabled={disabled} maxLength={1500} onChange={(e) => set("metaAds", e.target.value)} placeholder="Conjuntos, audiencias, formatos y anuncios previstos" /></label>
              <label data-wide><span>Anuncios de Google Ads</span><textarea rows={3} value={values.googleAds} disabled={disabled} maxLength={1500} onChange={(e) => set("googleAds", e.target.value)} placeholder="Campañas de búsqueda, grupos y palabras clave, display" /></label>
              <label data-wide><span>Otros canales (TikTok Ads, ChatGPT Ads, LinkedIn Ads)</span><textarea rows={2} value={values.otrosCanales} disabled={disabled} maxLength={1500} onChange={(e) => set("otrosCanales", e.target.value)} /></label>
              <p className={p.small} data-wide>Las piezas concretas se piden en la Instancia 2 con el formulario de pedido de anuncio.</p>
              <div data-wide><AiPending what="Sugerencia de anuncios" /></div>
            </div> : null}
            {stepDef.id === "landing" ? <div className={p.fields}>
              <label data-wide><span>Landing page</span><textarea rows={4} value={values.landing} disabled={disabled} maxLength={1500} onChange={(e) => set("landing", e.target.value)} placeholder="Objetivo, secciones, formulario y conexión con el CRM" /></label>
            </div> : null}
            {stepDef.id === "estimulos" ? <div className={p.fields}>
              <label data-wide><span>WhatsApp</span><textarea rows={2} value={values.estimuloWhatsapp} disabled={disabled} maxLength={1000} onChange={(e) => set("estimuloWhatsapp", e.target.value)} /></label>
              <label data-wide><span>CRM</span><textarea rows={2} value={values.estimuloCrm} disabled={disabled} maxLength={1000} onChange={(e) => set("estimuloCrm", e.target.value)} /></label>
              <label data-wide><span>Email marketing</span><textarea rows={2} value={values.estimuloEmail} disabled={disabled} maxLength={1000} onChange={(e) => set("estimuloEmail", e.target.value)} /></label>
            </div> : null}
            {errors.length ? <ul className={p.errors} role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
            {saved ? <p className={p.ok} role="status">{saved}</p> : null}
          </div>
          <div className={p.wizardFoot}>
            <button type="button" className={buttonClass("ghost", true)} disabled={disabled} onClick={() => save()}>Guardar borrador</button>
            <div>
              <button type="button" className={buttonClass("secondary", true)} disabled={step === 0} onClick={() => { setErrors([]); setStep(step - 1); }}>Anterior</button>
              {step < PLAN_STEPS.length - 1 ? <button type="button" className={buttonClass("primary", true)} onClick={next}>Siguiente</button> : <button type="button" className={buttonClass("primary", true)} disabled={disabled} onClick={submit}>Enviar a validación del PM</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  </OSSidePanel>;
}
