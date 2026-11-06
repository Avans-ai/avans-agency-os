import Link from "next/link";
import { ArrowRight, CircleAlert, CheckCircle2, Clock3, Filter, ShieldCheck, UserCheck } from "lucide-react";
import { attentionItems } from "../data";
import styles from "../command-inbox-hub.module.css";

const groups=[
 {label:"Crítica / alta",value:"3",detail:"Resolver primero"},
 {label:"Aprobaciones",value:"1",detail:"Visible en la cola demo"},
 {label:"Bloqueos",value:"1",detail:"Visible en la cola demo"},
 {label:"Aprendizajes",value:"1",detail:"Puede esperar"},
];

export function InboxHub(){
 return <div className={styles.page}>
  <section className={styles.hero}><div><span className={styles.kickerLight}>BANDEJA TRANSVERSAL · EXCEPCIONES</span><h1>Lo que una persona tiene que decidir.</h1><p>La bandeja reúne únicamente bloqueos, aprobaciones, alertas y excepciones que superan los límites automáticos. No es una lista de todas las tareas de Avans.</p></div><aside><span>PRINCIPIO</span><strong>Menos ruido, más contexto.</strong><p>Cada entrada explica qué ocurrió, por qué importa, qué propone el sistema, quién decide y qué pasa después.</p></aside></section>

  <section className={styles.metrics}>{groups.map(g=><a href="#cola" key={g.label}><span>{g.label}</span><strong>{g.value}</strong><small>{g.detail}</small></a>)}</section>

  <section className={styles.block} id="cola"><header><div><span className={styles.kicker}>COLA DE ATENCIÓN</span><h2>Priorización por impacto y urgencia</h2></div><div className={styles.filterPill}><Filter size={14}/> Área · cliente · tipo · prioridad</div></header>
   <article className={styles.panel}><div className={styles.inboxHead}><span>Prioridad</span><span>Contexto</span><span>Decisión requerida</span><span>Responsable</span><span>Vence</span></div><div>{attentionItems.map(item=>{
    const slug=item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
    return <Link href={`/v2/objetos/inbox/${slug}`} className={styles.inboxRow} key={item.id}><div><span className={item.priority==="Crítica"?styles.badgeDanger:item.priority==="Alta"?styles.badgeWarn:styles.badgeNeutral}>{item.priority}</span></div><div><small>{item.context}</small><strong>{item.title}</strong><p>{item.reason}</p></div><div><strong>{item.recommendation}</strong></div><div><strong>{item.owner}</strong></div><div><small>{item.due}</small><ArrowRight size={14}/></div></Link>
   })}</div></article>
  </section>

  <section className={styles.block}><header><div><span className={styles.kicker}>REGLAS DE ENTRADA</span><h2>Qué merece ocupar la bandeja</h2></div><p>Una notificación no es automáticamente una excepción.</p></header><div className={styles.ruleGrid}>
   <article><CircleAlert size={19}/><h3>Impacto</h3><p>Puede afectar cliente, dinero, plazo, reputación o continuidad.</p></article>
   <article><Clock3 size={19}/><h3>Urgencia</h3><p>Existe deadline, SLA o ventana de decisión relevante.</p></article>
   <article><ShieldCheck size={19}/><h3>Guardrail</h3><p>La acción supera autonomía, permiso o umbral configurado.</p></article>
   <article><UserCheck size={19}/><h3>Criterio humano</h3><p>No existe una regla suficientemente confiable para resolverla sola.</p></article>
  </div></section>

  <section className={styles.block}><header><div><span className={styles.kicker}>RESOLUCIÓN</span><h2>Qué debe ocurrir al cerrar una excepción</h2></div><p>Resolver también alimenta la memoria y mejora futuras ejecuciones.</p></header><div className={styles.resolutionFlow}>
   <article><span>01</span><h3>Entender</h3><p>Contexto, evidencia, fuente y motivo de la excepción.</p></article>
   <article><span>02</span><h3>Decidir</h3><p>Aprobar, ajustar, rechazar, escalar o pedir información.</p></article>
   <article><span>03</span><h3>Ejecutar</h3><p>El sistema continúa el workflow o mantiene el bloqueo.</p></article>
   <article><span>04</span><h3>Registrar</h3><p>Quién decidió, qué cambió y con qué fundamento.</p></article>
   <article><span>05</span><h3>Aprender</h3><p>El resultado puede sugerir ajustes de regla o contexto.</p></article>
  </div></section>

  <section className={styles.darkBand}><div><span className={styles.kickerLight}>BANDEJA ≠ TAREAS</span><h2>Las tareas viven en la operación. Las excepciones viven acá.</h2><p>Esto evita convertir el Command Center en otro gestor genérico y mantiene el foco en lo que realmente requiere intervención.</p></div><div className={styles.darkSteps}><Link href="/v2/operaciones"><strong>Operaciones</strong><ArrowRight size={14}/></Link><Link href="/v2/gerencia"><strong>Gerencia</strong><ArrowRight size={14}/></Link><Link href="/v2/auditoria"><strong>Auditoría</strong><ArrowRight size={14}/></Link></div></section>
 </div>
}