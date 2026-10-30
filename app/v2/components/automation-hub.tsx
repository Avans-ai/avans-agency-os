import Link from "next/link";
import { ArrowRight, Bot, BrainCircuit, CheckCircle2, CircleAlert, Gauge, GitBranch, Hand, PlayCircle, ShieldCheck, Workflow } from "lucide-react";
import styles from "../integration-automation-hub.module.css";

const layers=[
 {title:"Regla determinística",meta:"Automatización",detail:"Evento, condición y acción predefinidos. Ideal para procesos repetibles y sensibles.",status:"Control alto"},
 {title:"Asistencia con IA",meta:"IA dentro del flujo",detail:"Resume, clasifica, interpreta o propone, pero el proceso mantiene estructura y límites.",status:"Control medio-alto"},
 {title:"Agente especializado",meta:"Autonomía acotada",detail:"Recibe objetivo, contexto y herramientas; elige pasos dentro de permisos definidos.",status:"Control variable"},
 {title:"Aprobación humana",meta:"Guardrail",detail:"Interrumpe acciones con impacto económico, contractual, reputacional o irreversible.",status:"Control humano"},
];

const runs=[
 ["Clasificar nuevo lead","Automation","Webhook → reglas → scoring → pipeline","Automático","OK"],
 ["Procesar reunión de cliente","IA asistida","Transcripción → extracción → validación","Revisión","Pendiente"],
 ["Analizar señal de benchmark","Agente","Fuentes → contraste → hipótesis → evidencia","Asistido","OK"],
 ["Modificar presupuesto publicitario","Acción sensible","Recomendación → aprobación especialista → ejecución","Humano","Bloqueado"],
];

export function AutomationHub(){
 return <div className={styles.page}>
  <section className={styles.hero}><div><span className={styles.kickerLight}>PLATAFORMA · ORQUESTACIÓN E IA</span><h1>Automatizar lo determinístico. Agentizar lo que requiere criterio.</h1><p>La plataforma decide qué debe ocurrir automáticamente, dónde la IA aporta interpretación y qué acciones requieren aprobación humana. Más autonomía no siempre significa mejor sistema.</p></div><aside><span>REGLA DE DISEÑO</span><strong>Objetivo + contexto + herramientas + límites.</strong><p>Todo agente debe saber qué puede hacer, qué no puede hacer, qué información utiliza y cuándo tiene que detenerse.</p></aside></section>
  <div className={styles.scope}><div><span>EVENTO</span><strong>Qué inicia la ejecución</strong></div><div><span>DECISIÓN</span><strong>Regla o criterio aplicado</strong></div><div><span>ACCIÓN</span><strong>Herramienta o cambio permitido</strong></div><div><span>CONTROL</span><strong>Guardrail, auditoría y resultado</strong></div></div>

  <section className={styles.metrics}><a href="#modelo"><span>Capas de autonomía</span><strong>4</strong><small>Desde regla hasta aprobación</small></a><a href="#runs"><span>Runs demo</span><strong>4</strong><small>Ejemplos de ejecución</small></a><a href="#guardrails"><span>Acciones sensibles</span><strong>Con aprobación</strong><small>No se delegan por defecto</small></a><a href="#costos"><span>Consumo IA</span><strong>Trazable</strong><small>Modelo + tokens + costo</small></a></section>

  <section className={styles.block} id="modelo"><header><div><span className={styles.kicker}>MODELO DE AUTONOMÍA</span><h2>No todo necesita un agente</h2></div><p>El mecanismo se elige según variabilidad, riesgo y necesidad de criterio.</p></header><div className={styles.layerGrid}>{layers.map((l,i)=><article key={l.title}><span>0{i+1}</span><em>{l.meta}</em><h3>{l.title}</h3><p>{l.detail}</p><small>{l.status}</small></article>)}</div>
  </section>

  <section className={styles.block}><header><div><span className={styles.kicker}>PROCESS ENGINE</span><h2>Cómo se ejecuta un proceso dentro de Avans OS</h2></div><p>La IA participa dentro de un flujo observable; no reemplaza la definición del proceso.</p></header><div className={styles.processFlow}><article><span>01</span><PlayCircle size={20}/><h3>Trigger</h3><p>Webhook, cambio de estado, fecha, mensaje o acción humana.</p></article><article><span>02</span><GitBranch size={20}/><h3>Reglas</h3><p>Precondiciones, prioridad, datos mínimos y rutas posibles.</p></article><article><span>03</span><BrainCircuit size={20}/><h3>IA / agente</h3><p>Interpreta o decide sólo cuando el proceso lo necesita.</p></article><article><span>04</span><Workflow size={20}/><h3>Herramienta</h3><p>CRM, email, documento, API, cliente o módulo interno.</p></article><article><span>05</span><Hand size={20}/><h3>Aprobación</h3><p>Se detiene si supera riesgo o umbral configurado.</p></article><article><span>06</span><CheckCircle2 size={20}/><h3>Resultado</h3><p>Salida, evidencia, consumo, errores y próximo paso.</p></article></div>
  </section>

  <section className={styles.block} id="runs"><header><div><span className={styles.kicker}>RUNS Y TRAZABILIDAD</span><h2>Cada ejecución conserva contexto y resultado</h2></div><p>Una automatización que falla silenciosamente es más peligrosa que un paso manual visible.</p></header><article className={styles.panel}><div className={styles.runHead}><span>Proceso</span><span>Tipo</span><span>Secuencia</span><span>Autonomía</span><span>Estado</span></div>{runs.map(([a,b,c,d,e])=><div className={styles.runRow} key={a}><div><strong>{a}</strong><small>Run de demostración</small></div><div><strong>{b}</strong></div><div><strong>{c}</strong></div><div><span>{d}</span></div><div><span className={e==="OK"?styles.badgeOk:e==="Bloqueado"?styles.badgeDanger:styles.badgeWarn}>{e}</span></div></div>)}</article></section>

  <section className={styles.block} id="guardrails"><header><div><span className={styles.kicker}>GUARDRAILS</span><h2>La autonomía se limita por impacto</h2></div><p>Los límites se aplican antes de ejecutar, no sólo después de revisar el resultado.</p></header><div className={styles.twoCol}><article className={styles.panel}><div className={styles.panelTitle}><div><span className={styles.kicker}>AUTOMÁTICO</span><h3>Qué puede avanzar sin intervención</h3></div><Bot size={20}/></div><div className={styles.ruleList}>{["Clasificar y enriquecer información","Crear tareas o estructuras","Preparar borradores","Mover etapas con reglas claras","Enviar alertas internas","Actualizar indicadores derivados"].map(x=><div key={x}><CheckCircle2 size={17}/><span><strong>{x}</strong></span></div>)}</div></article><article className={styles.panel}><div className={styles.panelTitle}><div><span className={styles.kicker}>VALIDACIÓN HUMANA</span><h3>Qué no delegamos por defecto</h3></div><ShieldCheck size={20}/></div><div className={styles.ruleList}>{["Precio y condiciones comerciales","Pagos, descuentos o notas de crédito","Publicación externa sensible","Cambios de presupuesto publicitario","Acceso a datos restringidos","Borrado o modificación irreversible"].map(x=><div key={x}><CircleAlert size={17}/><span><strong>{x}</strong></span></div>)}</div></article></div></section>

  <section className={styles.block} id="costos"><header><div><span className={styles.kicker}>MODELOS, COSTOS Y CALIDAD</span><h2>La IA también es infraestructura medible</h2></div><p>Cada capacidad debería utilizar el modelo mínimo suficiente para el trabajo y registrar consumo, latencia y calidad.</p></header><div className={styles.threeCol}><article className={styles.panel}><Gauge size={20}/><h3>Routing de modelos</h3><p>Modelo rápido para clasificación; mayor razonamiento sólo cuando la complejidad lo justifique.</p></article><article className={styles.panel}><ActivityCard/></article><article className={styles.panel}><BrainCircuit size={20}/><h3>Evaluación</h3><p>Casos de prueba, feedback humano, tasa de error y regresiones antes de ampliar autonomía.</p></article></div><div className={styles.links}><Link href="/v2/agentes">Agentes <ArrowRight size={15}/></Link><Link href="/v2/workflows">Workflows <ArrowRight size={15}/></Link><Link href="/v2/guardrails">Guardrails <ArrowRight size={15}/></Link><Link href="/v2/auditoria">Auditoría <ArrowRight size={15}/></Link></div></section>
 </div>
}

function ActivityCard(){
 return <><Workflow size={20}/><h3>Consumo por run</h3><p>Proveedor, modelo, tokens o unidad de consumo, costo estimado, duración y cliente/proceso imputable.</p></>;
}
