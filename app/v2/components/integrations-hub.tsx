import Link from "next/link";
import { ArrowRight, Cable, CheckCircle2, CircleAlert, Database, FileUp, Network, RefreshCcw, ShieldCheck, Webhook } from "lucide-react";
import styles from "../integration-automation-hub.module.css";

const sources=[
 {name:"Google Workspace",type:"Identidad",method:"OAuth / OIDC",status:"Pendiente",scope:"Login corporativo @avans.agency"},
 {name:"Google Drive",type:"Documentos",method:"API / permisos",status:"En diseño",scope:"Fuentes y archivos de clientes"},
 {name:"Plataformas de Ads",type:"Marketing",method:"API",status:"En diseño",scope:"Métricas, campañas y señales"},
 {name:"Sistemas de clientes",type:"Operación",method:"API / webhook / archivos",status:"Variable",scope:"Según disponibilidad del proveedor"},
 {name:"Email / mensajería",type:"Comunicación",method:"API / webhook",status:"En diseño",scope:"Entradas, alertas y acciones autorizadas"},
 {name:"Proveedores de IA",type:"IA",method:"API server-side",status:"Parcial",scope:"Modelos, archivos y ejecuciones"},
];

const paths=[
 ["01","API / webhook","Opción preferida","Sincronización estructurada, eventos y acciones en tiempo real."],
 ["02","Conector nativo","Cuando existe","Usar integración oficial antes que construir acceso paralelo."],
 ["03","Exportación estructurada","Sistema cerrado","CSV, XLSX, JSON, SFTP o Drive con importación controlada."],
 ["04","Carga asistida","Último recurso estable","Ingreso manual con validación y trazabilidad."],
 ["05","RPA","Excepcional","Sólo si no existe interfaz autorizada y el proceso es suficientemente estable."],
];

export function IntegrationsHub(){
 return <div className={styles.page}>
  <section className={styles.hero}><div><span className={styles.kickerLight}>PLATAFORMA · CONECTIVIDAD</span><h1>Integrarnos antes que reemplazar.</h1><p>Avans OS funciona como capa operativa sobre las herramientas que ya existen. Cada conexión debe declarar origen, permisos, frecuencia, responsable, salud y procedimiento de revocación.</p></div><aside><span>CRITERIO DE ARQUITECTURA</span><strong>No todos los sistemas necesitan ser reemplazados.</strong><p>Cuando un sistema ya resuelve bien una función, Avans OS debe conectarlo, contextualizarlo y usar sus datos sin duplicar innecesariamente la operación.</p></aside></section>
  <div className={styles.scope}><div><span>DESCUBRIR</span><strong>Qué sistema es fuente de verdad</strong></div><div><span>CONECTAR</span><strong>API, webhook o canal disponible</strong></div><div><span>NORMALIZAR</span><strong>Convertir datos al modelo Avans</strong></div><div><span>OBSERVAR</span><strong>Salud, permisos y errores</strong></div></div>

  <section className={styles.metrics}><a href="#catalogo"><span>Fuentes modeladas</span><strong>6</strong><small>Demo arquitectónica</small></a><a href="#rutas"><span>Rutas de integración</span><strong>5</strong><small>Orden de preferencia</small></a><a href="#gobierno"><span>Secretos cliente</span><strong>Server-side</strong><small>Nunca en navegador</small></a><a href="#salud"><span>Health check</span><strong>Por conexión</strong><small>Auth + latencia + eventos</small></a></section>

  <section className={styles.block} id="catalogo"><header><div><span className={styles.kicker}>CATÁLOGO DE CONEXIONES</span><h2>Una ficha técnica por sistema integrado</h2></div><p>Cada integración tiene propietario, método, alcance, ambiente, permisos y estado. El dato no aparece como disponible si la conexión todavía no existe.</p></header>
   <article className={styles.panel}><div className={styles.tableHead}><span>Fuente</span><span>Tipo</span><span>Método</span><span>Alcance</span><span>Estado</span></div>{sources.map(s=><div className={styles.tableRow} key={s.name}><div><strong>{s.name}</strong><small>Fuente / servicio</small></div><div><strong>{s.type}</strong></div><div><strong>{s.method}</strong></div><div><strong>{s.scope}</strong></div><div><span className={s.status==="Parcial"?styles.badgeOk:s.status==="Variable"?styles.badgeNeutral:styles.badgeWarn}>{s.status}</span></div></div>)}</article>
  </section>

  <section className={styles.block} id="rutas"><header><div><span className={styles.kicker}>ESTRATEGIA DE INTEGRACIÓN</span><h2>Elegir el mecanismo menos frágil posible</h2></div><p>La prioridad es mantener trazabilidad y estabilidad, incluso cuando el software externo sea cerrado.</p></header>
   <div className={styles.flowGrid}>{paths.map(([n,t,m,d])=><article key={n}><span>{n}</span><h3>{t}</h3><em>{m}</em><p>{d}</p></article>)}</div>
  </section>

  <section className={styles.block} id="gobierno"><header><div><span className={styles.kicker}>GOBIERNO</span><h2>Una integración no es sólo una API key</h2></div><p>Debe existir un ciclo de alta, validación, operación, rotación y baja.</p></header>
   <div className={styles.twoCol}>
    <article className={styles.panel}><div className={styles.panelTitle}><div><span className={styles.kicker}>FICHA DE CONEXIÓN</span><h3>Datos mínimos</h3></div><Cable size={20}/></div><div className={styles.stack}>{["Sistema y propietario","Cliente o área relacionada","Ambiente","Método de autenticación","Scopes / permisos","Fuente de verdad","Frecuencia o evento","Última sincronización","Política de rotación","Procedimiento de revocación"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><strong>{x}</strong></div>)}</div></article>
    <article className={styles.panel}><div className={styles.panelTitle}><div><span className={styles.kicker}>REGLAS</span><h3>Cómo proteger las conexiones</h3></div><ShieldCheck size={20}/></div><div className={styles.ruleList}><div><Webhook size={18}/><span><strong>Menor privilegio</strong><small>Sólo scopes necesarios para el proceso.</small></span></div><div><Database size={18}/><span><strong>Fuente de verdad explícita</strong><small>No duplicar edición en dos sistemas sin reconciliación.</small></span></div><div><RefreshCcw size={18}/><span><strong>Reintentos controlados</strong><small>Idempotencia, límites y dead-letter cuando corresponda.</small></span></div><div><FileUp size={18}/><span><strong>Importaciones auditadas</strong><small>Origen, versión, errores y resultado de cada carga.</small></span></div></div></article>
   </div>
  </section>

  <section className={styles.block} id="salud"><header><div><span className={styles.kicker}>OBSERVABILIDAD</span><h2>La integración debe decir cuándo dejó de ser confiable</h2></div><p>Tokens vencidos, webhooks fallidos o datos desactualizados deben generar una señal accionable.</p></header><div className={styles.threeCol}><article className={styles.panel}><CheckCircle2 size={20}/><h3>Conectividad</h3><p>Autorización válida, endpoint disponible y latencia dentro del rango.</p></article><article className={styles.panel}><CircleAlert size={20}/><h3>Calidad del dato</h3><p>Campos faltantes, duplicados, retrasos o cambios de esquema.</p></article><article className={styles.panel}><Network size={20}/><h3>Último evento</h3><p>Última sincronización, cantidad procesada, errores y reintentos.</p></article></div><div className={styles.links}><Link href="/v2/salud-sistema">Salud del sistema <ArrowRight size={15}/></Link><Link href="/v2/seguridad">Seguridad <ArrowRight size={15}/></Link><Link href="/v2/auditoria">Auditoría <ArrowRight size={15}/></Link></div></section>
 </div>
}