import Link from "next/link";
import { Activity, ArrowRight, BellRing, BriefcaseBusiness, CircleAlert, FileChartColumn, Gauge, Layers3, ShieldCheck, Users } from "lucide-react";
import { attentionItems } from "../data";
import { avansClients } from "../agency-client-data";
import { getOperationalObjectForRow } from "../object-data";
import styles from "../command-inbox-hub.module.css";

const areas = [
  { label: "Operaciones", value: "Clientes + ejecución", detail: "Cuentas, proyectos, procesos y producción", href: "/v2/operaciones", icon: Layers3 },
  { label: "Ventas", value: "Pipeline", detail: "Leads, discovery, propuestas y handoff", href: "/v2/ventas", icon: BriefcaseBusiness },
  { label: "Finanzas", value: "Forecast", detail: "Proyección, cobranzas, costos y rentabilidad", href: "/v2/finanzas#forecast", icon: FileChartColumn },
  { label: "RRHH", value: "Burbujas y talento", detail: "Contractors, formularios, equipo y capacidad", href: "/v2/rrhh#burbujas", icon: Users },
  { label: "Gerencia", value: "Planificación", detail: "Prioridades, riesgos, responsables y decisiones", href: "/v2/gerencia#planificacion", icon: Gauge },
];
const system = [
  { label: "Estado del producto", state: "Demo en revisión", detail: "Datos sintéticos; backend e integraciones pendientes", href: "/v2/estado-producto" },
  { label: "Integraciones", state: "Por conectar", detail: "Catálogo y alcance definidos, no conexiones productivas", href: "/v2/integraciones" },
  { label: "Automatizaciones e IA", state: "Simulado", detail: "Runs y límites representados, sin ejecución real", href: "/v2/automatizaciones" },
  { label: "Seguridad", state: "Pendiente", detail: "Google @avans.agency y permisos siguen previstos", href: "/v2/seguridad" },
  { label: "Salud del sistema", state: "Por validar", detail: "Backups y restauración productiva no comprobados", href: "/v2/salud-sistema" },
];
const signals = [
  ["Epsa", "Benchmark · demo", "Señal competitiva de ejemplo", "Revisar en Estrategia", "/v2/clientes/epsa/benchmark"],
  ["ACA", "Operación · demo", "Precondición pendiente de un proceso", "Resolver dependencia", "/v2/operaciones"],
  ["Grupo Portland", "Ventas · demo", "Propuesta pendiente de validación", "Decisión comercial", "/v2/ventas"],
];

export function CommandCenterHub() {
  const critical = attentionItems.filter(item => item.priority === "Crítica" || item.priority === "Alta").length;
  return <div className={styles.page}>
    <section className={styles.hero}><div><span className={styles.kickerLight}>AVANS OS · CINCO ÁREAS CONECTADAS</span><h1>Qué necesita atención hoy.</h1><p>Operaciones, Ventas, Finanzas, RRHH y Gerencia. Clientes y su conocimiento viven dentro de Operaciones y alimentan al resto de la agencia.</p></div><aside><span>DEMO EN REVISIÓN</span><strong>Primero excepciones. Después actividad.</strong><p>Los indicadores y las señales son ejemplos. No representan información actual de Avans ni servicios conectados.</p></aside></section>
    <section className={styles.metrics}>
      <Link href="/v2/inbox"><span>Atención en la demo</span><strong>{attentionItems.length}</strong><small>{critical} de prioridad alta o crítica</small></Link>
      <Link href="/v2/operaciones#clientes"><span>Clientes en Operaciones</span><strong>{avansClients.length}</strong><small>Una misma ficha 360° por cuenta</small></Link>
      <Link href="/v2/rrhh#burbujas"><span>Organización del equipo</span><strong>Burbujas</strong><small>Contractors y Pull de talentos</small></Link>
      <Link href="/v2/gerencia#planificacion"><span>Dirección</span><strong>Planificación</strong><small>Prioridades, riesgos y plazos</small></Link>
    </section>
    <section className={styles.block}><header><div><span className={styles.kicker}>PRIORIDAD DEL DÍA · DATOS DEMO</span><h2>Atención transversal</h2></div><Link href="/v2/inbox">Abrir bandeja <ArrowRight size={15}/></Link></header>
      <div className={styles.priorityLayout}>
        <article className={styles.panel}><div className={styles.panelTitle}><div><span className={styles.kicker}>EXCEPCIONES</span><h3>Lo que requiere una persona</h3></div><BellRing size={20}/></div><div>{attentionItems.map(item => {
          const object = getOperationalObjectForRow("inbox", item.title);
          return <Link href={object ? `/v2/objetos/inbox/${object.slug}` : "/v2/inbox"} className={styles.attentionRow} key={item.id}><span className={item.priority === "Crítica" ? styles.badgeDanger : item.priority === "Alta" ? styles.badgeWarn : styles.badgeNeutral}>{item.priority}</span><div><small>{item.context}</small><strong>{item.title}</strong><p>{item.reason}</p></div><div><span>{item.owner}</span><small>{item.due} · ejemplo</small><ArrowRight size={14}/></div></Link>;
        })}</div></article>
        <aside className={styles.panel}><div className={styles.panelTitle}><div><span className={styles.kicker}>CINCO ÁREAS</span><h3>Lectura por área</h3></div><Gauge size={20}/></div><div className={styles.areaList}>{areas.map(area => { const Icon = area.icon; return <Link href={area.href} key={area.label}><Icon size={17}/><div><span>{area.label}</span><strong>{area.value}</strong><small>{area.detail}</small></div><ArrowRight size={14}/></Link>; })}</div></aside>
      </div>
    </section>
    <section className={styles.block}><header><div><span className={styles.kicker}>OPERACIONES / CLIENTES</span><h2>Todo el contexto de cada cuenta, sin duplicarlo.</h2></div><Link href="/v2/clientes">Abrir portfolio <ArrowRight size={15}/></Link></header><div className={styles.signalGrid}>
      <Link href="/v2/clientes"><span>CLIENTE 360°</span><h3>Información y conocimiento</h3><p>Brief, documentos, decisiones, proyectos e historial preservados.</p><div><strong>Ver cuentas</strong><ArrowRight size={14}/></div></Link>
      <Link href="/v2/benchmark"><span>CLIENTES / BENCHMARK</span><h3>Competencia y referencias</h3><p>Señales y evidencia siguen vinculadas a cada cliente.</p><div><strong>Ver benchmark</strong><ArrowRight size={14}/></div></Link>
      <Link href="/v2/rrhh#burbujas"><span>CONEXIÓN CON RRHH</span><h3>Burbujas y asignaciones</h3><p>Relacionar equipos y clientes sin crear una segunda ficha de cuenta.</p><div><strong>Revisar burbujas</strong><ArrowRight size={14}/></div></Link>
    </div></section>
    <section className={styles.block}><header><div><span className={styles.kicker}>SEÑALES · DEMO</span><h2>Cambios que podrían convertirse en acciones</h2></div><p>La validación humana precede a las acciones sensibles.</p></header><div className={styles.signalGrid}>{signals.map(([client, type, title, next, href]) => <Link href={href} key={title}><span>{type}</span><h3>{client}</h3><p>{title}</p><div><strong>{next}</strong><ArrowRight size={14}/></div></Link>)}</div></section>
    <section className={styles.block}><header><div><span className={styles.kicker}>PLATAFORMA</span><h2>Qué falta conectar antes de operar con datos reales</h2></div></header><div className={styles.systemGrid}>{system.map(item => <Link href={item.href} key={item.label}><div><span>{item.label}</span><strong>{item.state}</strong></div><p>{item.detail}</p><ArrowRight size={15}/></Link>)}</div></section>
    <section className={styles.darkBand}><div><span className={styles.kickerLight}>REORDENAR, NO DESCARTAR</span><h2>Excepción → decisión → ejecución → evidencia.</h2><p>Operaciones integra clientes y ejecución. Gerencia prioriza, Finanzas proyecta y RRHH organiza la capacidad. Los módulos previos siguen disponibles.</p></div><div className={styles.darkSteps}><div><CircleAlert size={18}/><strong>Detectar</strong></div><div><Gauge size={18}/><strong>Priorizar</strong></div><div><Activity size={18}/><strong>Resolver</strong></div><div><ShieldCheck size={18}/><strong>Registrar</strong></div></div></section>
  </div>;
}
