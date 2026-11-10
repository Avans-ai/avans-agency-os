"use client";
import Image from "next/image";
import Link from "next/link";
import type { OsClient } from "../../os-data";
import { useKnowledge } from "../use-knowledge";
import { questionnairePrintPages } from "./print-model";
import p from "./print.module.css";
export function QuestionnairePrint({
  client,
  mode,
}: {
  client: OsClient;
  mode: "blank" | "filled";
}) {
  const { k, hydrated, editable } = useKnowledge(client);
  if (!hydrated) return <p>Cargando cuestionario…</p>;
  if (mode === "filled" && !editable)
    return (
      <main className={p.toolbar}>
        Esta vista completada está disponible para el administrador y el PM
        asignado.{" "}
        <Link href={`/v2/clientes/${client.slug}?view=ficha`}>
          Volver a la ficha
        </Link>
      </main>
    );
  const pages = questionnairePrintPages(k, mode),
    total = pages.length + 1;
  const date = new Date().toLocaleDateString("es-AR", {
    timeZone: "America/Buenos_Aires",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const footer = (n: number) => (
    <footer className={p.footer}>
      <span>Avans · Cuestionario inicial · {client.name}</span>
      <span>
        {n} / {total}
      </span>
    </footer>
  );
  const logo = (
    <Image
      src="/avans-master-logo.png"
      alt="Avans"
      width={150}
      height={48}
      unoptimized
    />
  );
  return (
    <main className={p.root}>
      <div className={p.toolbar}>
        <Link href={`/v2/clientes/${client.slug}?view=ficha`}>
          Volver a la ficha
        </Link>
        <span>
          {mode === "blank" ? "Cuestionario vacío" : "Cuestionario completado"}{" "}
          · A4 · {total} páginas
        </span>
        <button onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <p>
          Vista local de esta sesión. No genera un enlace público a las
          respuestas. Para el PDF, usá tamaño A4 y desactivá los encabezados y
          pies automáticos del navegador.
        </p>
      </div>
      <section
        className={`${p.sheet} ${p.cover}`}
        aria-label="Portada del cuestionario"
      >
        {logo}
        <div className={p.coverTitle}>
          <span className={p.kicker}>CONOZCAMOS TU NEGOCIO</span>
          <h1>
            Cuestionario
            <br />
            inicial
          </h1>
          <h2>{client.name}</h2>
          <div className={p.coralRule} />
          <p>
            Una conversación para entender qué hace la empresa, cómo vende y qué
            necesitan sus clientes. Podés responder con ejemplos, referencias y
            documentos.
          </p>
          <p>
            Si algo no aplica, indicalo. Si todavía no tenés un dato, dejalo
            pendiente para revisarlo juntos.
          </p>
        </div>
        <div className={p.contact}>
          <strong>Datos de contacto</strong>
          <p>
            Nombre y rol: <span />
          </p>
          <p>
            Email / teléfono: <span />
          </p>
          <p>Fecha: {date}</p>
        </div>
        {footer(1)}
      </section>
      {pages.map((blocks, i) => (
        <section className={p.sheet} key={i} data-print-page>
          <header className={p.pageHeader}>
            {logo}
            <span>
              Cuestionario inicial
              <br />
              {client.name}
            </span>
          </header>
          <div className={p.sectionTitle}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h2>{blocks[0].section}</h2>
          </div>
          {blocks.map((block) => (
            <article className={p.question} key={block.id}>
              <h3>
                {block.label}
                {block.continuation ? " · continuación" : ""}
              </h3>
              {mode === "blank" && block.options ? (
                <div className={p.checkboxes}>
                  {block.options.map((option) => (
                    <span key={option}>□ {option}</span>
                  ))}
                </div>
              ) : null}
              {mode === "filled" && block.answer ? (
                <p className={p.answer}>{block.answer}</p>
              ) : block.repeated && mode === "blank" ? (
                <table
                  className={p.answerTable}
                  aria-label={`Respuesta: ${block.label}`}
                >
                  <tbody>
                    <tr>
                      <th>Dato</th>
                      <td />
                    </tr>
                    <tr>
                      <th>Detalle</th>
                      <td />
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className={p.answerLines}>
                  <div />
                  <div />
                  <div />
                </div>
              )}
              {mode === "filled" ? (
                <div className={p.answerMeta}>
                  {block.status}
                  {block.source ? ` · Fuente: ${block.source}` : ""}
                </div>
              ) : null}
            </article>
          ))}
          {footer(i + 2)}
        </section>
      ))}
    </main>
  );
}
