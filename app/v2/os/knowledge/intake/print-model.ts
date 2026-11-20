import { questionnaireTemplate } from "../questionnaire";
import type { KnowledgeState } from "../types";
export type PrintBlock = {
  id: string;
  section: string;
  label: string;
  answer: string;
  options?: readonly string[];
  status: string;
  source: string;
  continuation: boolean;
  repeated: boolean;
};
function printable(value: unknown): string {
  return Array.isArray(value)
    ? value.map(printable).join(", ")
    : typeof value === "boolean"
      ? value
        ? "Sí"
        : "No"
      : value === undefined || value === null
        ? ""
        : String(value);
}
export function questionnairePrintPages(
  k: KnowledgeState,
  mode: "blank" | "filled",
) {
  const blocks: PrintBlock[] = [];
  for (const section of questionnaireTemplate.sections)
    for (const [qi, q] of section.questions.entries()) {
      const r = mode === "filled" ? k.questionnaire.responses[q.id] : undefined;
      const status = r?.demo
        ? "DEMO · sin validar"
        : r?.status === "validated"
          ? "Validada con el cliente"
          : r?.status === "answered"
            ? "Respondida · pendiente de validación"
            : r?.status === "draft"
              ? "Borrador"
              : "Pendiente";
      const source = r?.permission === "public" ? r.sourceReference : "";
      const add = (
        id: string,
        label: string,
        answer: string,
        options?: readonly string[],
      ) => {
        // Split long responses into full, ordered continuation blocks without truncation.
        const lines = answer.match(
          /[^\r\n]{1,72}(?:\r\n|\r|\n)?|\r\n|\r|\n/g,
        ) ?? [""];
        const chunks: string[] = [];
        for (let i = 0; i < lines.length; i += 3)
          chunks.push(lines.slice(i, i + 3).join(""));
        for (const [index, part] of chunks.entries())
          blocks.push({
            id: `${id}-${index}`,
            section: section.label,
            label,
            answer: part,
            options,
            status: mode === "filled" ? status : "",
            source:
              index === 0
                ? source.slice(0, 240) + (source.length > 240 ? "…" : "")
                : "",
            repeated: q.responseType === "repeatable",
            continuation: index > 0,
          });
      };
      if (q.responseType === "repeatable") {
        const rows =
          Array.isArray(r?.value) &&
          r.value.some((v) => v && typeof v === "object")
            ? (r.value as Record<string, unknown>[])
            : [{}];
        for (const [rowIndex, row] of rows.entries())
          for (const [fi, f] of (q.fields ?? []).entries())
            add(
              `${q.id}-${rowIndex}-${f.key}`,
              `${rowIndex + 1}.${fi + 1} ${f.label}`,
              mode === "filled" ? printable(row[f.key]) : "",
              f.kind === "boolean" ? ["Sí", "No"] : f.options,
            );
      } else
        add(
          q.id,
          `${qi + 1}. ${q.label}`,
          mode === "filled" ? printable(r?.value) : "",
        );
    }
  const pages: PrintBlock[][] = [];
  let page: PrintBlock[] = [];
  for (const b of blocks) {
    if (page.length && (page.length >= 4 || page[0].section !== b.section)) {
      pages.push(page);
      page = [];
    }
    page.push(b);
  }
  if (page.length) pages.push(page);
  return pages;
}
