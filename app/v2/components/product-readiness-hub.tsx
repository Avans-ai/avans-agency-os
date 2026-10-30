import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Database, PlugZap, ServerCog, ShieldCheck, Wrench } from "lucide-react";
import styles from "../product-readiness-hub.module.css";

const statusRows=[
 {area:"Command Center + Bandeja",ui:"Funciona",data:"Simulado",backend:"Parcial",integration:"No aplica",next:"Persistir decisiones y resoluciones"},
 {area:"Clientes 360°",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"Pendiente",next:"Modelo de datos + documentos + permisos"},
 {area:"Operaciones",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"Pendiente",next:"CRUD de procesos/proyectos + eventos"},
 {area:"Ventas",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"Pendiente",next:"Pipeline persistente + fuentes de leads"},
 {area:"Finanzas",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"Pendiente",next:"Facturación/cobranzas + fuente contable"},
 {area:"RRHH",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"Pendiente",next:"Usuarios reales + capacidad + ausencias"},
 {area:"Gerencia",ui:"Funciona",data:"Derivado demo",backend:"Pendiente",integration:"Depende de fuentes",next:"KPIs sólo con datos conectados"},
 {area:"Benchmark",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"Pendiente",next:"Captura de fuentes + evidencia"},
 {area:"Usuarios y roles",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"Pendiente",next:"Google Auth + RBAC/RLS"},
 {area:"Integraciones",ui:"Funciona",data:"Arquitectura",backend:"Pendiente",integration:"Pendiente",next:"Conectores y health checks reales"},
 {area:"Automatizaciones e IA",ui:"Funciona",data:"Runs demo",backend:"Pendiente",integration:"Pendiente",next:"Runtime, cola, reintentos y proveedores"},
 {area:"Seguridad",ui:"Funciona",data:"Arquitectura",backend:"Pendiente",integration:"Pendiente",next:"Enforcement, secretos y políticas"},
 {area:"Auditoría",ui:"Funciona",data:"Simulado",backend:"Pendiente",integration:"No aplica",next:"Audit log inmutable"},
 {area:"Salud del sistema",ui:"Funciona",data:"Parcial",backend:"Parcial",integration:"Pendiente",next:"Uptime, jobs, backups y alertas"},
];

const blockers=[
 ["01","Autenticación real","Google Workspace sólo @avans.agency, sesiones y baja segura."],
 ["02","Persistencia y RLS","Supabase con esquema definitivo, políticas por rol/cliente y migraciones."],
 ["03","Acciones server-side","CRUD, aprobaciones, cambios de estado y validaciones fuera del navegador."],
 ["04","Integraciones prioritarias","Definir primero las fuentes reales que Avans usa en operación."],
 ["05","Runtime de automatizaciones","Jobs, reintentos, idempotencia, colas y ejecución observable."],
 ["06","Auditoría real","Registrar quién hizo qué, resultado, motivo y before/after."],
 ["07","Continuidad","Backups reales, storage, restore test, monitoreo y alertas."],
 ["08","Dependencias","Resolver vulnerabilidades antes de tratar el producto como producción."],
];

function tone(status:string){
 if(status==="Funciona") return styles.ok;
 if(status==="Parcial"||status==="Derivado demo") return styles.partial;
 if(status==="Pendiente"||status==="Depende de fuentes") return styles.pending;
 return styles.simulated;
}

export function ProductReadinessHub(){
 return <div className={styles.page}>
  <section className={styles.hero}><div><span>PRODUCTO REAL · ESTADO ACTUAL</span><h1>Qué funciona hoy y qué todavía es arquitectura.</h1><p>Esta vista separa experiencia navegable, datos simulados, backend pendiente e integraciones faltantes. El objetivo es dejar de medir Avans OS por cantidad de pantallas y empezar a medirlo por capacidades operativas reales.</p></div><aside><strong>Preview funcional</strong><p>La interfaz y navegación están avanzadas. La mayor parte de las acciones de negocio todavía no persiste datos ni ejecuta integraciones reales.</p></aside></section>

  <section className={styles.legend}><div><CheckCircle2 size={17}/><strong>Funciona</strong><span>La interacción o superficie existe y responde.</span></div><div><CircleAlert size={17}/><strong>Simulado</strong><span>La UX funciona, pero usa datos de demostración.</span></div><div><Database size={17}/><strong>Pendiente backend</strong><span>Falta persistencia, API o enforcement.</span></div><div><PlugZap size={17}/><strong>Pendiente integración</strong><span>Falta conectar la fuente externa real.</span></div></section>

  <section className={styles.block}><header><div><span>MATRIZ DE READINESS</span><h2>Estado por área</h2></div><p>Una pantalla puede estar terminada visualmente y seguir lejos de producción. Esta matriz evita confundir ambas cosas.</p></header>
   <article className={styles.panel}><div className={styles.head}><span>Área</span><span>UI</span><span>Datos</span><span>Backend</span><span>Integraciones</span><span>Próximo paso</span></div>
   {statusRows.map(r=><div className={styles.row} key={r.area}><div><strong>{r.area}</strong></div><div><span className={tone(r.ui)}>{r.ui}</span></div><div><span className={tone(r.data)}>{r.data}</span></div><div><span className={tone(r.backend)}>{r.backend}</span></div><div><span className={tone(r.integration)}>{r.integration}</span></div><div><strong>{r.next}</strong></div></div>)}</article>
  </section>

  <section className={styles.block}><header><div><span>MVP OPERATIVO</span><h2>Bloqueadores antes de usarlo como sistema real</h2></div><p>No hace falta terminar todo el producto. Sí hace falta cerrar estas capas para que el núcleo pueda operar con usuarios y datos reales.</p></header>
   <div className={styles.blockerGrid}>{blockers.map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
  </section>

  <section className={styles.block}><div className={styles.twoCol}>
   <article className={styles.panel}><div className={styles.panelTitle}><div><span>YA PODEMOS VALIDAR</span><h3>Producto y experiencia</h3></div><CheckCircle2 size={20}/></div><ul><li>Arquitectura de navegación y jerarquías.</li><li>Flujos principales entre áreas.</li><li>Modelo de Cliente 360°.</li><li>Bandeja de excepciones y Command Center.</li><li>Lectura ejecutiva, seguridad e infraestructura conceptual.</li><li>Composición visual Avans y densidad de información.</li></ul></article>
   <article className={styles.panel}><div className={styles.panelTitle}><div><span>TODAVÍA NO DEBEMOS PROMETER</span><h3>Capacidades productivas</h3></div><ShieldCheck size={20}/></div><ul><li>Login real y restricción efectiva por dominio.</li><li>Datos financieros, RRHH o clientes actualizados automáticamente.</li><li>Automatizaciones ejecutándose en producción.</li><li>Agentes tomando acciones reales.</li><li>Backups/restores comprobados.</li><li>KPIs en tiempo real sin fuentes conectadas.</li></ul></article>
  </div></section>

  <section className={styles.darkBand}><div><span>ORDEN DE IMPLEMENTACIÓN</span><h2>Primero núcleo operativo. Después inteligencia avanzada.</h2><p>Autenticación → datos → permisos → acciones → integraciones → automatización → observabilidad. La IA entra sobre una base operativa trazable, no al revés.</p></div><div className={styles.links}><Link href="/v2/usuarios"><Wrench size={16}/> Usuarios y acceso <ArrowRight size={14}/></Link><Link href="/v2/integraciones"><PlugZap size={16}/> Integraciones <ArrowRight size={14}/></Link><Link href="/v2/salud-sistema"><ServerCog size={16}/> Salud del sistema <ArrowRight size={14}/></Link></div></section>
 </div>
}