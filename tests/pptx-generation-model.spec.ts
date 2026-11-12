import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { osClients, type ServiceId } from "../app/v2/os/os-data";
import { seedKnowledge } from "../app/v2/os/knowledge/state";
import { newBrand, newItem } from "../app/v2/os/knowledge/benchmark";
import { newEntity } from "../app/v2/os/discovery/model";
import {
  buildPresentationManifest,
  savePptxExport,
  presentationIsStale,
  assertExportAllowed,
  MASTER_SHA256,
  DRAFT_WATERMARK,
} from "../app/v2/os/knowledge/presentation/manifest";
import {
  buildPresentationFile,
  manifestToDeckSpec,
  sha256Hex,
} from "../app/v2/os/knowledge/presentation/pptx";
import type { KnowledgeState } from "../app/v2/os/knowledge/types";
import type { PresentationMode } from "../app/v2/os/knowledge/presentation/types";
import { readZip, readText } from "../lib/pptx/zip";
import { readRenderDeck, slideTexts } from "../lib/pptx/render-model";
import { findAll, getAttr, outerXml } from "../lib/pptx/xml";
import { generatePptx, INSTRUCTION_PATTERNS } from "../lib/pptx/generate";
import { replaceText, listShapes } from "../lib/pptx/slide";
import { wrapLines, fitText } from "../lib/pptx/text-fit";

const template = new Uint8Array(
  readFileSync("assets/templates/marketing-discovery-v1.pptx"),
);
const ctx = { actor: "PM QA", at: "2026-11-12T15:00:00.000Z" };
const epsa = osClients.find((c) => c.slug === "epsa")!;
const aca = osClients.find((c) => c.slug === "aca")!;
const outDir = process.env.PPTX_OUT_DIR ?? join("test-results", "pptx");

async function generate(
  k: KnowledgeState,
  client = epsa,
  services: ServiceId[] = client.services,
  mode: PresentationMode = "internal-draft",
  name?: string,
) {
  const manifest = buildPresentationManifest(k, client, services, mode, ctx);
  const file = await buildPresentationFile(template, manifest, 1, "test");
  if (name) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `${name}.pptx`), file.bytes);
    writeFileSync(
      join(outDir, `${name}.report.json`),
      JSON.stringify(file.report, null, 2),
    );
  }
  const deck = readRenderDeck(file.bytes);
  return { manifest, file, deck, texts: slideTexts(deck) };
}

/** EPSA with records in every module, long texts and several repetitions. */
function richEpsa(): KnowledgeState {
  const k = seedKnowledge(epsa);
  const item = (section: string, values: Record<string, string>) => ({
    ...newItem(section, ctx),
    values,
  });
  k.discovery.salesProcess.cycleDuration = "Entre 45 y 90 días";
  k.discovery.salesProcess.averageTicket = "USD 18.000 por operación";
  k.discovery.salesProcess.decider = "Dirección comercial con aprobación de compras";
  k.discovery.offerings[0].reasonToBelieve =
    "Más de 20 años fabricando equipos industriales y 300 instalaciones activas en la región.";
  k.discovery.offerings[0].strengths =
    "Entrega en plazo, repuestos locales y soporte técnico propio en planta. Configuración modular que se adapta al layout de cada cliente sin obra civil.";
  k.discovery.targetSegments[0] = {
    ...k.discovery.targetSegments[0],
    match: 85,
    potential: 75,
    currentRelevance: 70,
  };
  k.discovery.targetSegments.push({
    ...newEntity("targetSegments", "segment-distributors"),
    name: "Distribuidores regionales",
    type: "B2B",
    match: 30,
    potential: 60,
    currentRelevance: 20,
  });
  const own = k.benchmark.brands[0];
  own.items = [
    item("content", {
      links: "https://example.com/post-1",
      channel: "LinkedIn",
      followers: "12.400 seguidores",
      frequency: "3 por semana",
      summary:
        "Contenido técnico sobre eficiencia de planta, casos de clientes y lanzamientos de producto. Protagonizan ingenieros propios.",
    }),
  ];
  const rival = { ...newBrand("Rival Industrial"), id: "rival-1", rationale: "Competidor directo en la región" };
  rival.items = [
    item("overview", {
      claim: "Soluciones que no se detienen",
      description: "Fabricante regional con 40 años de trayectoria",
      positioning: "Precio competitivo y red de distribuidores",
      audience: "Pymes industriales",
    }),
    item("web", { home: "Home con buscador de productos", summary: "Sitio orientado a catálogo." }),
  ];
  const rival2 = { ...newBrand("Referente Global"), id: "rival-2", type: "Referente" as const };
  k.benchmark.brands = [own, rival, rival2];
  k.benchmark.findings = [
    { ...item("findings", { category: "Qué podemos tomar", statement: "Casos de clientes con datos concretos" }), impactedServices: [] },
    { ...item("findings", { category: "Qué debemos evitar", statement: "Mensajes genéricos de calidad" }), impactedServices: [] },
  ];
  k.plan.modules.estrategia = [
    item("objectives", { statement: "Posicionar Line Up como la línea modular de referencia", outcome: "Reconocimiento en el segmento industrial", indicator: "Leads calificados por mes" }),
    item("objectives", { statement: "Generar demanda calificada", outcome: "Pipeline comercial previsible" }),
    item("objectives", { statement: "Sostener la relación posventa" }),
  ];
  k.plan.modules["publicidad-digital"] = [
    { ...item("campaigns", { name: "Lanzamiento Line Up", platforms: "LinkedIn Ads · Google Ads", share: "60" }), id: "camp-1" },
    { ...item("campaigns", { name: "Posventa", platforms: "Google Ads", share: "40" }), id: "camp-2" },
    { ...item("allocations", { share: "70", channel: "LinkedIn Ads" }), values: { share: "70", channel: "LinkedIn Ads", campaignIds: ["camp-1"] } },
    { ...item("allocations", { share: "30", channel: "Google Ads" }), values: { share: "30", channel: "Google Ads", campaignIds: ["camp-1"] } },
  ];
  k.plan.modules.contenidos = [
    item("contentAxes", { name: "Casos reales", description: "Instalaciones y resultados medibles de clientes industriales", audience: "Responsables de compras", piecesPerMonth: "4" }),
  ];
  return k;
}

const allText = (texts: string[][]) => texts.flat().join("\n");

test("master fingerprint is verified before generating", async () => {
  expect(await sha256Hex(template)).toBe(MASTER_SHA256);
  const manifest = buildPresentationManifest(seedKnowledge(epsa), epsa, epsa.services, "internal-draft", ctx);
  const tampered = template.slice();
  tampered[tampered.length - 10] ^= 0xff;
  await expect(buildPresentationFile(tampered, manifest, 1, "x")).rejects.toThrow(/master oficial/);
});

for (const [client, label] of [
  [epsa, "epsa"],
  [aca, "aca"],
] as const) {
  test(`${label}: seeded data produce a valid draft built from the master`, async () => {
    const { manifest, file, deck, texts } = await generate(seedKnowledge(client), client, client.services, "internal-draft", `${label}-seed-draft`);
    // Package opens and its slide list matches the manifest.
    const files = readZip(file.bytes);
    expect(deck.slides.length).toBe(manifest.slides.length);
    expect(file.info.slideCount).toBe(manifest.slides.length);
    const pres = readText(files, "ppt/presentation.xml");
    expect(findAll(pres, "p:sldId").length).toBe(manifest.slides.length);
    const ct = readText(files, "[Content_Types].xml");
    for (let i = 1; i <= manifest.slides.length; i++) {
      expect(files.has(`ppt/slides/slide${i}.xml`)).toBe(true);
      expect(ct).toContain(`/ppt/slides/slide${i}.xml`);
    }
    expect(files.has(`ppt/slides/slide${manifest.slides.length + 1}.xml`)).toBe(false);
    expect([...files.keys()].some((n) => n.startsWith("ppt/notesSlides/"))).toBe(false);
    // Fonts, master, layout and theme are untouched.
    const original = readZip(template);
    for (const part of [
      "ppt/fonts/Figtree-regular.fntdata",
      "ppt/fonts/Syne-regular.fntdata",
      "ppt/slideMasters/slideMaster1.xml",
      "ppt/slideLayouts/slideLayout1.xml",
      "ppt/theme/theme2.xml",
    ])
      expect(Buffer.compare(Buffer.from(files.get(part)!), Buffer.from(original.get(part)!))).toBe(0);
    // Every relationship target exists.
    for (const [name, bytes] of files) {
      if (!name.endsWith(".rels")) continue;
      const xml = new TextDecoder().decode(bytes);
      const base =
        name === "_rels/.rels"
          ? []
          : name.replace(/_rels\/([^/]+)\.rels$/, "$1").split("/").slice(0, -1);
      for (const rel of findAll(xml, "Relationship")) {
        const tag = outerXml(xml, rel);
        if (getAttr(tag, "TargetMode") === "External") continue;
        const target = getAttr(tag, "Target")!;
        const parts = [...base];
        for (const seg of target.split("/")) {
          if (seg === "..") parts.pop();
          else parts.push(seg);
        }
        expect(files.has(parts.join("/")), `${name} → ${target}`).toBe(true);
      }
    }
    // No template placeholders or internal instructions survive.
    const text = allText(texts);
    expect(text).not.toMatch(/\[[^\]]*\]/);
    for (const re of [/Duplicar esta slide/, /PÁGINA INTERNA/, /Todo lo que está en coral/, /PROJECT MANAGER/, /LÍDER TÉCNICO/, /CONTENT MANAGER/, /• DISEÑADOR/, /Los KPIs son los mismos para todos/, /Agregar o quitar columnas/, /Pendiente de completar/])
      expect(text, String(re)).not.toMatch(re);
    for (const slide of texts)
      for (const line of slide)
        for (const re of INSTRUCTION_PATTERNS) expect(line, `${re}`).not.toMatch(re);
    // Draft marker on every slide, and in the file properties.
    for (const slide of texts) expect(slide).toContain(DRAFT_WATERMARK);
    expect(readText(files, "docProps/core.xml")).toContain("Borrador");
    // The cover carries the client name.
    expect(texts[0]).toContain(client.name);
    // Pending data are reported per slide when fields are missing.
    expect(file.info.pendingCount).toBeGreaterThan(0);
    expect(manifest.missingFields.length).toBeGreaterThan(0);
  });
}

test("contracted services decide which modules are present (EPSA vs ACA)", async () => {
  const e = await generate(seedKnowledge(epsa));
  const a = await generate(seedKnowledge(aca), aca);
  const pages = (m: typeof e.manifest) => new Set(m.slides.map((s) => s.templateSlideNumber));
  // EPSA contracts Estrategia; ACA does not.
  for (const n of [27, 28, 29, 30, 31]) {
    expect(pages(e.manifest).has(n)).toBe(true);
    expect(pages(a.manifest).has(n)).toBe(false);
  }
  for (const m of [e.manifest, a.manifest]) {
    for (const n of [2, 32, 33, 34, 45, 46, 47, 48, 49, 50, 51, 52, 53, 55]) expect(pages(m).has(n)).toBe(false);
    for (const n of [35, 36, 38, 41, 42]) expect(pages(m).has(n)).toBe(true);
  }
  const indexOf = (r: typeof e) => r.texts[r.manifest.slides.findIndex((s) => s.templateSlideNumber === 26)];
  expect(indexOf(e)).toEqual(expect.arrayContaining(["01", "Estrategia y coordinación", "02", "Publicidad digital", "03", "Contenidos"]));
  expect(indexOf(e)).not.toContain("Diseño de marca");
  expect(indexOf(e)).not.toContain("Desarrollo web");
  expect(indexOf(a)).toEqual(expect.arrayContaining(["01", "Publicidad digital", "02", "Contenidos"]));
  expect(indexOf(a)).not.toContain("Estrategia y coordinación");
  expect(a.file.info.slideCount).toBeLessThan(e.file.info.slideCount);
});

test("products, ICPs, competitor blocks and campaigns are duplicated from their master page", async () => {
  const k = richEpsa();
  const { manifest, texts } = await generate(k, epsa, epsa.services, "internal-draft", "epsa-rich-draft");
  const count = (n: number) => manifest.slides.filter((s) => s.templateSlideNumber === n).length;
  expect(count(8)).toBe(2); // Line Up + Servicios posventa
  expect(count(11)).toBe(2); // two B2B ICPs
  expect(count(12)).toBe(0); // B2C not applicable
  for (const n of [20, 21, 22, 23, 24]) expect(count(n)).toBe(2); // two competitors
  expect(count(15)).toBe(1); // own brand block
  expect(count(36)).toBe(2);
  expect(count(37)).toBe(2); // one investment page per campaign
  const at = (n: number, i = 0) => texts[manifest.slides.filter((s) => s.templateSlideNumber === n)[i].outputOrder - 1];
  expect(at(8, 0)).toContain("Line Up");
  expect(at(8, 1)).toContain("Servicios posventa");
  expect(at(11, 0)).toContain("Responsables de compras");
  expect(at(11, 1)).toContain("Dirección comercial");
  expect(at(20, 0)).toContain("Rival Industrial");
  expect(at(20, 1)).toContain("Referente Global");
  expect(at(21, 0)).toContain("02 · BENCHMARK · RIVAL INDUSTRIAL");
  expect(at(37, 0)).toEqual(expect.arrayContaining(["Lanzamiento Line Up", "70%", "LinkedIn Ads"]));
  expect(allText(texts)).not.toMatch(/\[[^\]]*\]/);
  // Targeting: bubbles follow match (x) / potential (y); unused bubbles are removed.
  const targeting = manifest.slides.find((s) => s.templateSlideNumber === 10)!;
  const deck = readRenderDeck((await buildPresentationFile(template, manifest, 1, "t")).bytes);
  const shapes = deck.slides[targeting.outputOrder - 1].elements;
  const bubbles = shapes.filter((e) => e.kind === "shape" && e.geometry === "ellipse");
  expect(bubbles.length).toBe(2);
  const [big, small] = bubbles.sort((a, b) => b.box.cx - a.box.cx);
  expect(big.box.x + big.box.cx / 2).toBeGreaterThan(small.box.x + small.box.cx / 2); // 85 vs 30 match
  expect(big.box.y + big.box.cy / 2).toBeLessThan(small.box.y + small.box.cy / 2); // 75 vs 60 potential
  expect(at(10)).toEqual(expect.arrayContaining(["Empresas", "Distribuidores regionales"]));
  expect(allText(texts)).not.toMatch(/pendiente/i);
});

test("client version is blocked while data are missing and has no draft marker when allowed", async () => {
  const k = seedKnowledge(epsa);
  const blocked = buildPresentationManifest(k, epsa, epsa.services, "client", ctx);
  expect(() => assertExportAllowed(blocked)).toThrow(/bloqueada/);
  // The engine itself never adds the marker to a client-mode manifest.
  const spec = manifestToDeckSpec({ ...blocked, missingFields: [] });
  expect(spec.draftMarker).toBeNull();
  const { bytes } = generatePptx(template, spec);
  const texts = slideTexts(readRenderDeck(bytes));
  expect(allText(texts)).not.toContain(DRAFT_WATERMARK);
});

test("history keeps previous versions and marks them outdated when data change", async () => {
  let k = seedKnowledge(epsa);
  const m1 = buildPresentationManifest(k, epsa, epsa.services, "internal-draft", ctx);
  const f1 = await buildPresentationFile(template, m1, 1, "v1");
  k = savePptxExport(k, m1, f1.info, 1, "v1", ctx);
  expect(k.presentationExports![0].format).toBe("pptx");
  expect(presentationIsStale(k, epsa.services, k.presentationExports![0])).toBe(false);
  k = { ...k, discovery: { ...k.discovery, companyProfile: { ...k.discovery.companyProfile, coverage: "Argentina y Uruguay" } } };
  expect(presentationIsStale(k, epsa.services, k.presentationExports![0])).toBe(true);
  const m2 = buildPresentationManifest(k, epsa, epsa.services, "internal-draft", ctx);
  const f2 = await buildPresentationFile(template, m2, 2, "v2");
  k = savePptxExport(k, m2, f2.info, 2, "v2", ctx);
  expect(k.presentationExports!.map((e) => e.version)).toEqual([1, 2]);
  expect(() => savePptxExport(k, m2, f2.info, 2, "dup", ctx)).toThrow(/versión/);
  // Regenerating from a stored manifest reproduces the same bytes.
  const again = await buildPresentationFile(template, k.presentationExports![0].manifest, 1, "v1");
  expect(again.info.sha256).toBe(f1.info.sha256);
});

test("text replacement keeps run formatting, escapes XML and fits long values", () => {
  const files = readZip(template);
  const slide8 = readText(files, "ppt/slides/slide8.xml");
  const shapes = listShapes(slide8);
  const desc = shapes.find((s) => s.id === "172")!;
  const long =
    "Línea modular <industrial> & escalable: " +
    "incluye diseño, fabricación, instalación y puesta en marcha con soporte local. ".repeat(6);
  const r = replaceText(desc.xml, long + "\n\nSegundo párrafo", 9000000);
  expect(r.xml).toContain("&lt;industrial&gt; &amp; escalable");
  expect(r.xml).toContain('typeface="Figtree"');
  const color = /<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val="(\w+)"/.exec(desc.xml)![1];
  expect(r.xml).toMatch(new RegExp(`<a:rPr[^>]*>\\s*<a:solidFill><a:srgbClr val="${color}"`)); // run colour kept
  expect((r.xml.match(/<a:p>/g) ?? []).length).toBe(2); // empty line dropped
  expect(r.grown || r.size < r.baseSize).toBe(true);
  expect(r.fits).toBe(true);
  // Deterministic wrapping and fitting.
  expect(wrapLines("uno dos tres", 1000, 18)).toEqual(["uno dos tres"]);
  expect(wrapLines("supercalifragilistico", 40, 18).length).toBeGreaterThan(1);
  const fit = fitText(["x ".repeat(400)], 1800, { widthPt: 300, heightPt: 40, typeface: "Figtree", bold: false, lineSpacing: 1, spaceBeforePt: 0, spaceAfterPt: 0, wrap: true }, 40);
  expect(fit.size).toBeLessThan(1800);
});
