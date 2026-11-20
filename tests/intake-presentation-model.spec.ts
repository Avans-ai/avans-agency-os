import { test, expect } from "@playwright/test";
import type { KnowledgeState } from "../app/v2/os/knowledge/types";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { osClients, type ServiceId } from "../app/v2/os/os-data";
import {
  seedKnowledge,
  discoveryOf,
  replaceDiscovery,
  isKnowledge,
} from "../app/v2/os/knowledge/state";
import { newEntity } from "../app/v2/os/discovery/model";
import { newSource } from "../app/v2/os/knowledge/sources";
import { newBrand, newItem } from "../app/v2/os/knowledge/benchmark";
import {
  questionnaireToProposals,
  reviewProposal,
} from "../app/v2/os/knowledge/proposals";
import {
  extractSource,
  validateFile,
  officeEntries,
  bytesHash,
  INTAKE_LIMITS,
  sanitizeFileName,
} from "../app/v2/os/knowledge/intake/extraction";
import {
  analysisInput,
  mapAnalysisOutput,
  DemoAnalysisProvider,
  UnconfiguredAnalysisProvider,
  analyzeSources,
  demoSourceTexts,
} from "../app/v2/os/knowledge/intake/analysis";
import {
  addIntakeSource,
  addSuggestions,
  reviewSuggestions,
  editSuggestion,
  suggestionConflicts,
  questionnaireSourceCoverage,
} from "../app/v2/os/knowledge/intake/mutations";
import { questionnairePrintPages } from "../app/v2/os/knowledge/intake/print-model";
import {
  buildPresentationManifest,
  assertExportAllowed,
  saveManifestPreview,
  presentationIsStale,
  MASTER_SHA256,
  DRAFT_WATERMARK,
} from "../app/v2/os/knowledge/presentation/manifest";
import {
  GoogleSlidesAdapter,
  compilePresentationRequests,
  validateNativePresentation,
  validatePptx,
  type TemplateBinding,
  type NativePresentation,
  PPTX_MIME,
} from "../lib/presentations/google-slides";
import { presentationReadiness } from "../lib/presentations/readiness";
import { docxFixture, pptxFixture, officeFile } from "./intake-fixtures";
const client = osClients.find((c) => c.slug === "epsa")!,
  ctx = { actor: "PM QA", at: "2026-11-10T18:00:00.000Z" };
const fresh = () => seedKnowledge(client);
const file = (name: string, bytes: Uint8Array, type = "") => ({
  name,
  size: bytes.length,
  type,
});
async function demo(): Promise<KnowledgeState> {
  let k = fresh();
  for (const [i, rawText] of demoSourceTexts.entries())
    k = addIntakeSource(
      k,
      {
        ...newSource(client.slug, ctx),
        id: `source-${i}`,
        title: `DEMO ${i}`,
        demo: true,
        rawText,
        contentHash: await bytesHash(new TextEncoder().encode(rawText)),
        intake: { status: "ready", warnings: [], originalStored: false },
      },
      ctx,
    );
  const s = await analyzeSources(
    k,
    ["source-0", "source-1"],
    new DemoAnalysisProvider(),
    ctx,
    new AbortController().signal,
  );
  return addSuggestions(k, s, ctx);
}
test("file validation checks extension, MIME, bytes, emptiness, limits and XML safety", async () => {
  expect(sanitizeFileName("../a\u202e.exe")).toBe("a_.exe");
  expect(() =>
    validateFile({ name: "x.exe", size: 10, type: "application/octet-stream" }),
  ).toThrow(/no permitido/);
  expect(() =>
    validateFile({ name: "x.pdf", size: 10, type: "image/png" }),
  ).toThrow(/MIME/);
  expect(() =>
    validateFile({ name: "x.txt", size: 0, type: "text/plain" }),
  ).toThrow(/vacío/);
  expect(() =>
    validateFile({
      name: "x.txt",
      size: INTAKE_LIMITS.fileBytes + 1,
      type: "text/plain",
    }),
  ).toThrow(/10 MB/);
  const bad = Buffer.from("not a pdf");
  await expect(extractSource("s", file("x.pdf", bad), bad)).rejects.toThrow(
    /no es un PDF/,
  );
  const macro = officeFile({
    "word/document.xml": "<doc/>",
    "word/vbaProject.bin": "bad",
  });
  expect(() => officeEntries(macro)).toThrow(/macros/);
  const xml = officeFile({
    "word/document.xml": '<!DOCTYPE x [<!ENTITY a "bad">]><doc>&a;</doc>',
  });
  await expect(extractSource("s", file("x.docx", xml), xml)).rejects.toThrow(
    /entidades/,
  );
});
test("DOCX, PPTX, XLSX cached values, CSV and text extract without executing embedded content", async () => {
  for (const [name, bytes] of [
    ["x.docx", docxFixture()],
    ["x.pptx", pptxFixture()],
    ["x.csv", Buffer.from("Producto,Precio\nEjemplo,10")],
    ["x.md", Buffer.from("# Empresa\nTexto QA")],
  ] as const) {
    const result = await extractSource("s", file(name, bytes), bytes);
    expect(result.rawText).toBeTruthy();
  }
  const orderedPptx = officeFile({
    "ppt/presentation.xml":
      '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId r:id="two"/><p:sldId r:id="one"/></p:sldIdLst></p:presentation>',
    "ppt/_rels/presentation.xml.rels":
      '<Relationships><Relationship Id="one" Target="slides/slide1.xml"/><Relationship Id="two" Target="slides/slide2.xml"/></Relationships>',
    "ppt/slides/slide1.xml": '<a:r xmlns:a="a"><a:t>Primera parte</a:t></a:r>',
    "ppt/slides/slide2.xml": '<a:r xmlns:a="a"><a:t>Segunda parte</a:t></a:r>',
  });
  expect(
    (await extractSource("s", file("ordered.pptx", orderedPptx), orderedPptx))
      .rawText,
  ).toBe("Página 1\nSegunda parte\n\nPágina 2\nPrimera parte");
  const xlsx = officeFile({
    "xl/sharedStrings.xml":
      "<sst><si><r><t>Nombre </t></r><r><t>completo</t></r></si><si><t>Segundo</t></si></sst>",
    "xl/worksheets/sheet1.xml":
      '<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>1</v></c><c><f>2+2</f><v>4</v></c></row></sheetData></worksheet>',
  });
  const result = await extractSource("s", file("x.xlsx", xlsx), xlsx);
  expect(result.rawText).toContain("Nombre completo | Segundo | 4");
  expect(result.warnings[0]).toContain("No se ejecutan");
  const emptySheet = officeFile({
    "xl/worksheets/sheet1.xml": "<worksheet><sheetData/></worksheet>",
  });
  await expect(
    extractSource("s", file("empty.xlsx", emptySheet), emptySheet),
  ).rejects.toThrow(/no contiene valores/);
  const empty = officeFile({
    "word/document.xml": '<w:document xmlns:w="x"><w:body/></w:document>',
  });
  await expect(
    extractSource("s", file("x.docx", empty), empty),
  ).rejects.toThrow(/No se encontró/);
  const corrupt = Buffer.from("PKbroken");
  await expect(
    extractSource("s", file("x.pptx", corrupt), corrupt),
  ).rejects.toThrow(/ZIP/);
});
test("official master fingerprint and all 56 slides are inspected and extractable", async () => {
  const bytes = readFileSync("assets/templates/marketing-discovery-v1.pptx");
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(MASTER_SHA256);
  const result = await extractSource(
    "master",
    file("master.pptx", bytes),
    bytes,
  );
  expect(result.metadata.pages).toBe(56);
  expect(result.rawText).toContain("Roadmap de implementación");
});
test("duplicate sources and storage budgets preserve existing state; clients stay isolated", () => {
  let k = fresh();
  const source = {
    ...newSource(client.slug, ctx),
    contentHash: "same",
    rawText: "Text",
    intake: {
      status: "ready" as const,
      warnings: [],
      originalStored: false as const,
    },
  };
  k = addIntakeSource(k, source, ctx);
  expect(() => addIntakeSource(k, { ...source, id: "again" }, ctx)).toThrow(
    /duplicado/,
  );
  expect(() =>
    addIntakeSource(k, { ...source, clientSlug: "aca" }, ctx),
  ).toThrow(/otro cliente/);
  expect(() =>
    addIntakeSource(
      k,
      {
        ...source,
        id: "big",
        contentHash: "different",
        rawText: "x".repeat(INTAKE_LIMITS.totalTextCharacters),
      },
      ctx,
    ),
  ).toThrow(/límite local/);
});
test("analysis cannot fabricate evidence, target arbitrary fields or use an unconfigured engine", async () => {
  const k = await demo();
  await expect(
    analyzeSources(
      k,
      ["source-0"],
      new UnconfiguredAnalysisProvider(),
      ctx,
      new AbortController().signal,
    ),
  ).rejects.toThrow(/no configurado/);
  const input = analysisInput(k, ["source-0"]),
    provider = new DemoAnalysisProvider();
  expect(() =>
    mapAnalysisOutput(
      k,
      input,
      {
        suggestions: [
          {
            questionId: "companyProfile.name",
            proposedValue: "Fake",
            explanation: "x",
            confidence: 0.9,
            evidence: [
              { sourceId: "source-0", excerpt: "this text never occurred" },
            ],
          },
        ],
      },
      provider,
      ctx,
    ),
  ).toThrow(/evidencia/);
  expect(() =>
    mapAnalysisOutput(
      k,
      input,
      {
        suggestions: [
          {
            questionId: "__proto__.name",
            proposedValue: "Fake",
            explanation: "x",
            confidence: 0.9,
            evidence: [
              {
                sourceId: "source-0",
                excerpt: "Nombre comercial: Empresa Ejemplo",
              },
            ],
          },
        ],
      },
      provider,
      ctx,
    ),
  ).toThrow(/Pregunta inexistente/);
});
test("suggestions require explicit review, preserve conflicts, and do not silently change Discovery", async () => {
  let k = await demo();
  const before = structuredClone(k.discovery);
  const coverage = k.answerSuggestions!.find(
    (s) => s.questionId === "companyProfile.coverage",
  )!;
  expect(suggestionConflicts(k, coverage).alternatives).toHaveLength(1);
  expect(() => reviewSuggestions(k, [coverage.id], "approve", ctx)).toThrow(
    /Confirmá/,
  );
  expect(() =>
    reviewSuggestions(k, [coverage.id], "approve", ctx, {
      batch: true,
      explicitReview: true,
    }),
  ).toThrow(/individual/);
  k = reviewSuggestions(k, [coverage.id], "approve", ctx, {
    explicitReview: true,
  });
  expect(k.questionnaire.responses[coverage.questionId].value).toBe(
    "Argentina y Uruguay",
  );
  expect(k.discovery).toEqual(before);
  expect(k.versions.length).toBeGreaterThan(0);
  expect(reviewSuggestions(k, [coverage.id], "approve", ctx)).toEqual(k);
  k = questionnaireToProposals(k, ctx);
  const proposal = k.proposals.find((p) => p.targetFieldPath === "coverage")!;
  expect(proposal.sourceId).toBe("source-0");
  k = reviewProposal(k, proposal.id, "approve", ctx);
  expect(discoveryOf(k).companyProfile.demo).toBe(true);
});
test("edit, reject, ask-client and confidence gates retain the questionnaire and audit", async () => {
  let k = await demo();
  const name = k.answerSuggestions!.find(
    (s) => s.questionId === "companyProfile.name",
  )!;
  k = editSuggestion(k, name.id, "Nombre revisado", ctx);
  k = reviewSuggestions(k, [name.id], "approve", ctx, {
    highConfidenceOnly: true,
  });
  expect(k.questionnaire.responses[name.questionId].value).toBe(
    "Nombre revisado",
  );
  const legal = k.answerSuggestions!.find(
    (s) => s.questionId === "companyProfile.legalName",
  )!;
  k = reviewSuggestions(k, [legal.id], "reject", ctx);
  expect(k.questionnaire.responses[legal.questionId]).toBeUndefined();
  const coverage = k.answerSuggestions!.find(
    (s) => s.questionId === "companyProfile.coverage",
  )!;
  k = reviewSuggestions(k, [coverage.id], "ask", ctx);
  expect(questionnaireSourceCoverage(k).ask).toBe(1);
  expect(k.audit.length).toBeGreaterThan(3);
});
test("blank print never contains answers, filled preserves long responses without truncation", async () => {
  const k = await demo();
  const answer = "SECRETO QA " + "respuesta con detalle ".repeat(100);
  k.questionnaire.responses["companyProfile.name"] = {
    questionId: "companyProfile.name",
    value: answer,
    status: "answered",
    permission: "confidential",
    sourceReference: "FUENTE PRIVADA",
    clarification: "",
    updatedAt: ctx.at,
    updatedBy: ctx.actor,
  };
  const blank = questionnairePrintPages(k, "blank").flat();
  expect(JSON.stringify(blank)).not.toContain("SECRETO QA");
  expect(blank.every((b) => !b.answer && !b.source && !b.status)).toBe(true);
  const filled = questionnairePrintPages(k, "filled")
    .flat()
    .filter((b) => b.id.startsWith("companyProfile.name-"));
  expect(filled.map((b) => b.answer).join("")).toBe(answer);
  expect(filled.every((b) => b.source === "")).toBe(true);
});
test("manifest respects repeated offerings, profiles, competitors, campaigns and active modules", () => {
  const k = fresh();
  k.discovery.offerings = [
    { ...newEntity("offerings", "o1"), name: "Producto uno" },
    { ...newEntity("offerings", "o2"), name: "Producto dos" },
  ];
  k.discovery.b2bIcps = [
    { ...newEntity("b2bIcps", "p1"), name: "Perfil uno" },
    { ...newEntity("b2bIcps", "p2"), name: "Perfil dos" },
  ];
  k.discovery.applicability.b2bIcps.applies = true;
  k.discovery.applicability.b2cIcps.applies = false;
  k.benchmark.brands = [
    newBrand(client.name, true),
    { ...newBrand("Rival uno"), id: "r1" },
    { ...newBrand("Rival dos"), id: "r2" },
  ];
  k.plan.modules["publicidad-digital"] = [
    { ...newItem("campaigns", ctx), id: "c1", values: { name: "Campaña uno" } },
    { ...newItem("campaigns", ctx), id: "c2", values: { name: "Campaña dos" } },
  ];
  const active: ServiceId[] = ["publicidad-digital", "crm"];
  const m = buildPresentationManifest(k, client, active, "internal-draft", ctx);
  const count = (n: number) =>
    m.slides.filter((s) => s.templateSlideNumber === n).length;
  expect(count(8)).toBe(2);
  expect(count(11)).toBe(2);
  expect(count(12)).toBe(0);
  for (const n of [20, 21, 22, 23, 24]) expect(count(n)).toBe(2);
  expect(count(36)).toBe(2);
  expect(count(37)).toBe(2);
  expect(count(2)).toBe(0);
  expect(count(32)).toBe(0);
  expect(count(41)).toBe(0);
  expect(m.slides.at(-1)!.templateSlideNumber).toBe(56);
  expect(m.slides.some((s) => s.templateSlideNumber === 3)).toBe(true);
  expect(m.warnings.join(" ")).toContain("CRM");
  expect(m.slides.every((s) => s.removeInstructionLayers)).toBe(true);
  expect(
    m.slides
      .flatMap((s) => Object.values(s.replacements))
      .some((s) => /\[.*\]/.test(s)),
  ).toBe(false);
});
test("client export blocks incomplete data, warnings require confirmation; snapshots are immutable", () => {
  let k = fresh();
  const m = buildPresentationManifest(
    k,
    client,
    client.services,
    "client",
    ctx,
  );
  expect(() => assertExportAllowed(m)).toThrow(/bloqueada/);
  const draft = buildPresentationManifest(
    k,
    client,
    client.services,
    "internal-draft",
    ctx,
  );
  expect(() => assertExportAllowed(draft)).not.toThrow();
  k = saveManifestPreview(k, draft, ctx);
  const first = k.presentationExports![0];
  expect(presentationIsStale(k, client.services, first)).toBe(false);
  k.discovery.companyProfile.coverage = "Dato nuevo";
  expect(presentationIsStale(k, client.services, first)).toBe(true);
  expect(first.manifest.snapshot.discovery.companyProfile.coverage).not.toBe(
    "Dato nuevo",
  );
  k = saveManifestPreview(
    k,
    buildPresentationManifest(
      k,
      client,
      client.services,
      "internal-draft",
      ctx,
    ),
    ctx,
  );
  expect(k.presentationExports!.map((e) => e.version)).toEqual([1, 2]);
  expect(() => assertExportAllowed({ ...m, missingFields: [] })).toThrow(
    /advertencias/,
  );
  expect(() =>
    assertExportAllowed({ ...m, missingFields: [], warningsConfirmed: true }),
  ).not.toThrow();
});
test("Google and PPTX remain blocked even when environment names are present", () => {
  expect(
    presentationReadiness({
      GOOGLE_CLIENT_ID: "present",
      GOOGLE_CLIENT_SECRET: "present",
    }).enabled,
  ).toBe(false);
});
test("Google adapters use official endpoints, never expose errors or credentials, export real ZIP bytes", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const http = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/export?"))
      return new Response(new Uint8Array(pptxFixture()));
    return Response.json({
      id: "copied",
      presentationId: "copied",
      slides: [],
    });
  };
  const adapter = new GoogleSlidesAdapter("test-token", http as typeof fetch);
  await adapter.copy("master", "folder", "Client", "export");
  await adapter.presentation("copied");
  await adapter.batch(
    "copied",
    [{ deleteObject: { objectId: "obsolete" } }],
    "revision",
  );
  const bytes = await adapter.exportPptx("copied");
  expect(bytes[0]).toBe(80);
  expect(calls[0].url).toContain("/drive/v3/files/master/copy");
  expect(calls[2].url).toContain("/v1/presentations/copied:batchUpdate");
  expect(calls[3].url).toContain(encodeURIComponent(PPTX_MIME));
  await expect(
    adapter.importMaster(pptxFixture(), "Wrong master", "folder"),
  ).rejects.toThrow(/plantilla maestra oficial/);
  expect(calls).toHaveLength(4);
  const bad = new GoogleSlidesAdapter(
    "secret",
    async () => new Response("secret document text", { status: 403 }),
  );
  await expect(bad.presentation("master")).rejects.toThrow(
    /^Google presentation API HTTP 403$/,
  );
});
test("template compiler duplicates native objects, deletes instructions, marks drafts and refuses unverified bindings", () => {
  const m = buildPresentationManifest(
    fresh(),
    client,
    [],
    "internal-draft",
    ctx,
  );
  m.slides = [
    {
      templateSlideKey: "slide-1",
      templateSlideNumber: 1,
      title: "Cover",
      outputOrder: 1,
      replacements: { 20: "Cliente QA" },
      images: [],
      removeInstructionLayers: true,
      removeObjectKeys: ["22"],
      warnings: [],
    },
  ];
  const native: NativePresentation = {
    presentationId: "master",
    slides: [
      {
        objectId: "cover",
        pageElements: [
          {
            objectId: "name",
            shape: {
              text: {
                textElements: [
                  {
                    textRun: {
                      content: "[ Nombre ]\n",
                      style: { fontFamily: "Figtree" },
                    },
                  },
                ],
              },
            },
          },
          {
            objectId: "role",
            shape: {
              text: {
                textElements: [{ textRun: { content: "• PROJECT MANAGER\n" } }],
              },
            },
          },
        ],
      },
    ],
  };
  const binding: TemplateBinding = {
    templateFileId: "master",
    masterSha256: MASTER_SHA256,
    visualValidation: { at: ctx.at, by: ctx.actor },
    slides: {
      "slide-1": {
        slideId: "cover",
        objects: { 20: "name", 22: "role" },
        textSlots: { 20: { text: "[ Nombre ]", maxCharacters: 60 } },
      },
    },
  };
  const plan = compilePresentationRequests(m, binding, native);
  expect(plan.duplicate).toHaveLength(1);
  expect(JSON.stringify(plan.populate)).toContain(DRAFT_WATERMARK);
  expect(plan.removeOriginals).toEqual([
    { deleteObject: { objectId: "cover" } },
  ]);
  expect(() =>
    compilePresentationRequests(
      m,
      { ...binding, visualValidation: { at: "", by: "" } },
      native,
    ),
  ).toThrow(/validación visual/);
  expect(() => validateNativePresentation(native, m)).toThrow(/placeholders/);
});
test("PPTX validator reopens editable OOXML and verifies manifest count", () => {
  const m = buildPresentationManifest(
    fresh(),
    client,
    [],
    "internal-draft",
    ctx,
  );
  m.slides = m.slides.slice(0, 1);
  expect(validatePptx(pptxFixture(), m).slides).toBe(1);
  m.slides.push(m.slides[0]);
  expect(() => validatePptx(pptxFixture(), m)).toThrow(/no coincide/);
  expect(() => validatePptx(Buffer.from("%PDF-fake"), m)).toThrow();
});

test("changed or missing sources block approval and linked evidence cannot be deleted", async () => {
  const k = await demo(),
    suggestion = k.answerSuggestions![0];
  const changed = structuredClone(k);
  changed.sources.find((s) => s.id === suggestion.sourceIds[0])!.version++;
  expect(suggestionConflicts(changed, suggestion).sourceChanged).toBe(true);
  expect(() =>
    reviewSuggestions(changed, [suggestion.id], "approve", ctx, {
      explicitReview: true,
    }),
  ).toThrow(/fuente cambió/);
  const removed = structuredClone(k);
  removed.sources = removed.sources.filter(
    (s) => !suggestion.sourceIds.includes(s.id),
  );
  expect(() =>
    reviewSuggestions(removed, [suggestion.id], "approve", ctx, {
      explicitReview: true,
    }),
  ).toThrow(/fuente cambió/);
  const d = discoveryOf(k);
  d.sources = d.sources.filter((s) => !suggestion.sourceIds.includes(s.id));
  expect(() => replaceDiscovery(k, d, ctx)).toThrow(/trazabilidad/);
  const foreign = structuredClone(k);
  foreign.answerSuggestions![0].clientSlug = "aca";
  expect(isKnowledge(foreign, "epsa")).toBe(false);
});
test("high-confidence batch leaves lower-confidence answers pending and multiline print preserves every character", async () => {
  let k = await demo();
  const name = k.answerSuggestions!.find(
    (s) => s.questionId === "companyProfile.name",
  )!;
  const legal = k.answerSuggestions!.find(
    (s) => s.questionId === "companyProfile.legalName",
  )!;
  legal.confidence = 0.5;
  k = reviewSuggestions(k, [name.id, legal.id], "approve", ctx, {
    batch: true,
    highConfidenceOnly: true,
  });
  expect(k.answerSuggestions!.find((s) => s.id === name.id)!.status).toBe(
    "applied",
  );
  expect(k.answerSuggestions!.find((s) => s.id === legal.id)!.status).toBe(
    "pending",
  );
  const value = "Una línea\n".repeat(120);
  k.questionnaire.responses[name.questionId].value = value;
  const blocks = questionnairePrintPages(k, "filled")
    .flat()
    .filter((b) => b.id.startsWith(name.questionId + "-"));
  expect(blocks.map((b) => b.answer).join("")).toBe(value);
  expect(blocks.every((b) => (b.answer.match(/\n/g) || []).length <= 3)).toBe(
    true,
  );
});
