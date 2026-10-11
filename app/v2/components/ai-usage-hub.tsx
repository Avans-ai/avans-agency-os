"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, Coins, Gauge, Layers3, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";
import type { AiUsageEvent, AiUsageSnapshot } from "../ai-usage-data";
import styles from "../ai-usage-hub.module.css";

type Group = { label: string; cost: number; generated: number; approved: number; attempts: number; count: number };
const money = (amount: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
const num = (value: number) => new Intl.NumberFormat("es-AR").format(value);
// Match numeric(18,6) storage precision; do not compare floating-point sums.
const usdMicros = (amount: number) => BigInt(Number(amount).toFixed(6).replace(".", ""));
const percent = (part: number, total: number) => total ? Math.round(part / total * 100) : 0;
const sum = (items: AiUsageEvent[], key: "cost_usd" | "units_generated" | "units_approved" | "attempts" | "minutes_saved" | "input_tokens" | "output_tokens") =>
  items.reduce((total, item) => total + Number(item[key] || 0), 0);

function groupBy(items: AiUsageEvent[], key: "area" | "activity" | "provider"): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const name = item[key];
    const current = groups.get(name) ?? { label: name, cost: 0, generated: 0, approved: 0, attempts: 0, count: 0 };
    current.cost += Number(item.cost_usd);
    current.generated += Number(item.units_generated);
    current.approved += Number(item.units_approved);
    current.attempts += Number(item.attempts);
    current.count += 1;
    groups.set(name, current);
  }
  return [...groups.values()].sort((a, b) => b.cost - a.cost);
}

export function AiUsageHub({ snapshot }: { snapshot: AiUsageSnapshot }) {
  const [days, setDays] = useState(30);
  const [area, setArea] = useState("Todas");
  const [asOf] = useState(() => Date.now());
  const areas = useMemo(() => ["Todas", ...new Set(snapshot.events.map((item) => item.area))], [snapshot.events]);
  const cutoff = asOf - days * 86400000;
  const filtered = snapshot.events.filter((item) => new Date(item.occurred_at).getTime() >= cutoff && (area === "Todas" || item.area === area));
  const allAreas = groupBy(filtered, "area");
  const activities = groupBy(filtered, "activity");
  const providers = groupBy(filtered, "provider");
  const totalCost = sum(filtered, "cost_usd");
  const generated = sum(filtered, "units_generated");
  const approved = sum(filtered, "units_approved");
  const attempts = sum(filtered, "attempts");
  const textEvents = filtered.filter((item) => item.modality === "text");
  const inputTokens = sum(textEvents, "input_tokens");
  const outputTokens = sum(textEvents, "output_tokens");
  const minutesSaved = sum(filtered, "minutes_saved");
  const unknownCosts = filtered.filter((row) => row.cost_usd === null).length;
  const estimated = filtered.filter((row) => row.cost_source === "estimated" && row.cost_usd !== null).reduce((value, row) => value + Number(row.cost_usd), 0);
  const month = new Date(asOf).toISOString().slice(0, 7);
  const currentMonth = snapshot.events.filter((item) => item.occurred_at.startsWith(month));
  const monthSpendMicros = currentMonth.reduce((value, row) => value + usdMicros(row.cost_usd ?? 0), BigInt(0));
  const monthlyBudgetMicros = snapshot.budgets.reduce((value, row) => value + usdMicros(row.monthly_limit_usd), BigInt(0));
  const monthSpend = Number(monthSpendMicros) / 1000000;
  const monthlyBudget = Number(monthlyBudgetMicros) / 1000000;
  const coverageComplete = snapshot.coverage?.status === "complete";
  const coverageLabel = snapshot.coverage?.status === "partial" ? "Cobertura incompleta" : "Cobertura sin verificar";
  const budgetShare = monthlyBudget > 0 ? monthSpend / monthlyBudget * 100 : null;
  const incompleteMonth = !coverageComplete || currentMonth.some((item) => item.cost_usd === null);
  const budgetStatus = incompleteMonth
    ? (coverageComplete ? "Costos sin informar" : coverageLabel)
    : monthSpendMicros > monthlyBudgetMicros ? "Límite superado"
      : monthSpendMicros === monthlyBudgetMicros && monthlyBudgetMicros > BigInt(0) ? "Límite alcanzado"
        : monthlyBudgetMicros === BigInt(0) ? "Sin consumo registrado"
          : monthSpendMicros * BigInt(5) >= monthlyBudgetMicros * BigInt(4) ? "Revisar gasto" : "Dentro del presupuesto";
  const focus = coverageComplete ? activities.filter((item) => item.generated >= 2 && percent(item.approved, item.generated) < 55) : [];
  const available = snapshot.mode === "live" || snapshot.mode === "demo";

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}>GERENCIA / INTELIGENCIA OPERATIVA</span>
          <h1>Control de consumo <em>y eficiencia</em> de IA.</h1>
          <p>No basta saber cuántos tokens usamos. Avans OS relaciona gasto, proveedor, área, actividad y resultados aprobados para detectar dónde conviene optimizar.</p>
          <div className={styles.heroLinks}>
            <Link href="/v2/gerencia">Volver a Gerencia <ArrowRight size={15}/></Link>
            <Link href="/v2/automatizaciones">Ver automatizaciones <ArrowRight size={15}/></Link>
          </div>
        </div>
        <aside className={styles.heroAside}>
          <span>ESTADO DE LA FUENTE</span>
          <strong>{snapshot.mode === "demo" ? "Demostración · datos ficticios" : snapshot.mode === "live" ? "Telemetría conectada" : snapshot.mode === "forbidden" ? "Acceso restringido" : "Datos no disponibles"}</strong>
          <p>{snapshot.note}</p>
          <div><ShieldCheck size={17}/><small>Costos internos · acceso limitado por rol al conectar la base</small></div>
        </aside>
      </section>

      {!available ? (
        <section className={styles.empty}>
          <ShieldCheck size={28}/>
          <h2>{snapshot.mode === "forbidden" ? "El módulo requiere autorización" : "Esperando datos de consumo"}</h2>
          <p>{snapshot.note}</p>
          <Link href="/v2/gerencia">Regresar a Gerencia <ArrowRight size={15}/></Link>
        </section>
      ) : (
        <>
          <div className={styles.filterBar}>
            <div className={styles.filterTitle}><Activity size={16}/><span>Analizar consumo</span></div>
            <div className={styles.dayTabs} aria-label="Período de análisis">
              {([7, 30, 90] as const).map((value) => (
                <button type="button" key={value} aria-pressed={days === value} className={days === value ? styles.selected : ""} onClick={() => setDays(value)}>{value} días</button>
              ))}
            </div>
            <label className={styles.areaFilter}>Área
              <select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((option) => <option key={option} value={option}>{option}</option>)}</select>
            </label>
          </div>

          <section className={styles.metrics} aria-label="Indicadores de consumo de IA">
            {[
              { icon: Coins, title: "Inversión IA conocida", value: money(totalCost), detail: `${filtered.length} registros · ${unknownCosts} sin importe${coverageComplete ? "" : " · mínimo conocido"}` },
              { icon: Gauge, title: "Resultados aprobados", value: num(approved), detail: `${percent(approved, generated)}% de ${num(generated)} resultados generados${coverageComplete ? "" : " en la muestra"}` },
              { icon: Layers3, title: "Costo por resultado aprobado", value: approved && !unknownCosts && coverageComplete ? money(totalCost / approved) : "—", detail: !coverageComplete ? `${coverageLabel}: no se calcula eficiencia total` : unknownCosts ? "Faltan importes para calcularlo" : "Incluye intentos y resultados no aprobados" },
              { icon: BarChart3, title: "Iteraciones", value: num(attempts), detail: generated ? `${(attempts / generated).toFixed(1)} intentos por resultado${coverageComplete ? "" : " en la muestra"}` : "Sin resultados" },
              { icon: Sparkles, title: "Tokens (texto)", value: num(inputTokens + outputTokens), detail: `${num(inputTokens)} entrada · ${num(outputTokens)} salida` },
              { icon: TrendingDown, title: "Tiempo declarado como ahorrado", value: minutesSaved ? `${(minutesSaved / 60).toFixed(1)} h` : "—", detail: "Dato de resultados; no equivale a ROI validado" },
            ].map(({ icon: Icon, title, value, detail }) => (
              <article className={styles.metric} key={title}>
                <div><span>{title}</span><Icon size={18}/></div>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </section>

          <div className={styles.statusStrip}><span>{snapshot.mode === "demo" ? "DATOS ILUSTRATIVOS · NO SON CONSUMOS REALES" : !coverageComplete ? `${coverageLabel.toUpperCase()} · TOTALES PARCIALES` : unknownCosts ? `${unknownCosts} COSTOS SIN INFORMAR · TOTALES PARCIALES` : "DATOS INTERNOS · ACCESO SEGÚN ROL"}</span><span>{estimated ? `${money(estimated)} de costos estimados en este filtro` : "Sin costos estimados en el filtro"}</span></div>

          <section className={styles.split}>
            <article className={styles.panel}>
              <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>01 / DISTRIBUCIÓN</span><h2>¿Dónde se gasta más?</h2></div><small>Gasto USD por área</small></div>
              <div className={styles.barList}>
                {allAreas.length ? allAreas.map((row, i) => (
                  <div className={styles.barRow} key={row.label}>
                    <div><span><b>{String(i + 1).padStart(2, "0")}</b> {row.label}</span><strong>{money(row.cost)}</strong></div>
                    <div className={styles.track}><i style={{ width: `${percent(row.cost, allAreas[0].cost)}%` }} /></div>
                    <small>{percent(row.cost, totalCost)}% del gasto conocido{coverageComplete ? "" : " en la muestra"} · {row.approved} resultados aprobados</small>
                  </div>
                )) : <p className={styles.noData}>No hay eventos en este filtro.</p>}
              </div>
            </article>
            <article className={styles.panel}>
              <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>02 / PRESUPUESTO</span><h2>Uso mensual</h2></div><small>Mes calendario actual · todas las áreas</small></div>
              {snapshot.budgets.length > 0 ? (
                <>
                  <div className={styles.budgetValues}><strong>{money(monthSpend)}</strong><span>de {money(monthlyBudget)}</span></div>
                  <div className={styles.budgetTrack}><i style={{ width: `${budgetShare === null ? (monthSpend > 0 ? 100 : 0) : Math.min(100, budgetShare)}%` }}/></div>
                  <div className={styles.budgetFoot}><span>{budgetShare === null ? "Presupuesto cero" : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(budgetShare)}% mínimo conocido`}</span><strong>{budgetStatus}</strong></div>
                  <div className={styles.budgetAreas}>{snapshot.budgets.map((row) => {
                    const used = currentMonth.filter((item) => item.area === row.area).reduce((n, item) => n + Number(item.cost_usd), 0);
                    return <div key={row.area}><span>{row.area}</span><strong>{money(used)} / {money(row.monthly_limit_usd)}</strong></div>;
                  })}</div>
                </>
              ) : <p className={styles.noData}>No hay presupuestos mensuales configurados. Ningún límite se presume.</p>}
            </article>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>03 / PRODUCTIVIDAD</span><h2>Del consumo al resultado útil</h2></div><p>{coverageComplete ? "La tasa de aprobación y el costo por resultado permiten evaluar retrabajo, no medir desempeño individual." : "Muestra incompleta: cantidades y tasas sólo describen los registros visibles. No se calcula eficiencia total."}</p></div>
            <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Actividad</th><th>Inversión</th><th>Generados</th><th>Aprobados</th><th>Eficiencia</th><th>Costo / aprobado</th></tr></thead><tbody>
              {activities.map((row) => (
                <tr key={row.label}><td><strong>{row.label}</strong><small>{row.attempts} intentos</small></td><td>{money(row.cost)}</td><td>{num(row.generated)}</td><td>{num(row.approved)}</td><td><span className={!coverageComplete || percent(row.approved,row.generated) < 55 ? styles.low : styles.good}>{percent(row.approved,row.generated)}%{coverageComplete ? "" : " de la muestra"}</span></td><td>{coverageComplete && row.approved && !filtered.some((item) => item.activity === row.label && item.cost_usd === null) ? money(row.cost / row.approved) : "—"}</td></tr>
              ))}
              {!activities.length && <tr><td colSpan={6}>Sin actividad en el período.</td></tr>}
            </tbody></table></div>
          </section>

          <section className={styles.split}>
            <article className={styles.panel}>
              <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>04 / PROVEEDORES</span><h2>Consumo por motor</h2></div><small>No comparar tokens con créditos de video</small></div>
              <div className={styles.providers}>{providers.length ? providers.map((p) => (
                <div key={p.label}><div><strong>{p.label}</strong><span>{money(p.cost)}</span></div><small>{p.count} eventos · {percent(p.cost,totalCost)}% del gasto conocido{coverageComplete ? "" : " en la muestra"}</small></div>
              )) : <p className={styles.noData}>Sin registros.</p>}</div>
              <p className={styles.hint}>Texto: tokens de entrada/salida. Imagen y video: costo facturado o estimado, unidades y créditos según proveedor. Sin conversiones artificiales.</p>
            </article>
            <article className={styles.panel}>
              <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>05 / OPTIMIZACIÓN</span><h2>Oportunidades de mejora</h2></div><small>Señales orientativas</small></div>
              {focus.length ? focus.map((item) => (
                <div key={item.label} className={styles.insight}><span>REVISAR FLUJO</span><strong>{item.label}</strong><p>Solo {percent(item.approved,item.generated)}% de resultados aprobados. Analizar briefing, modelo elegido y cantidad de iteraciones antes de recortar presupuesto.</p></div>
              )) : <div className={styles.insight}><span>SEGUIMIENTO</span><strong>{coverageComplete ? "Sin desvíos detectados por esta regla" : "Faltan registros para evaluar desvíos"}</strong><p>{coverageComplete ? "Seguir registrando resultados aprobados y costos reales para construir una línea base." : "Completar la cobertura antes de tomar decisiones sobre presupuesto o eficiencia."}</p></div>}
              <p className={styles.hint}>Las sugerencias no ejecutan cambios automáticamente. Gerencia y el área responsable validan cualquier ajuste.</p>
            </article>
          </section>
          <footer className={styles.footer}><Link href="/v2/finanzas">Ver control económico <ArrowRight size={14}/></Link><span>Telemetría: área · actividad · cliente/proyecto · modelo · costo · intentos · aprobación</span></footer>
        </>
      )}
    </div>
  );
}

