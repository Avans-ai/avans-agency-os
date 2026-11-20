import { test, expect } from "@playwright/test";
import { buildPrompt, normalizeResult, similarity, validateRequest, AssistantInputError } from "../app/v2/os/assistant/engine";
import { ASSISTANT_PROFILES, profileById, profileFields } from "../app/v2/os/assistant/profiles";
import { createProvider, providerStatus, ProviderError } from "../app/v2/os/assistant/providers";
import type { AssistantRequest } from "../app/v2/os/assistant/types";

const base: AssistantRequest = {
  profileId: "publicidad-digital:campanas",
  clientSlug: "aca",
  clientName: "ACA",
  serviceId: "publicidad-digital",
  operation: "crear-campana",
  user: { name: "QA", role: "admin" },
  draft: { estado: "Borrador" },
  sources: [
    { ref: "discovery:icp:1", kind: "icp", label: "ICP B2B · Compras", text: "Responsables de compras industriales", status: "validado", clientSlug: "aca" },
    { ref: "plan:publicidad-digital:2", kind: "plan", label: "Plan · Paid", text: "Generar leads calificados", status: "pendiente", clientSlug: "aca" },
    { ref: "publicidad-digital:campanas:CMP-1", kind: "campana", label: "Campaña · Remarketing de visitantes", text: "Objetivo: Remarketing", status: "manual", clientSlug: "aca" },
  ],
};

const raw = (overrides: Partial<Record<string, unknown>> = {}) => ({
  suggestions: [
    {
      type: "Concepto de campaña",
      title: "Compras sin demoras",
      description: "Campaña de leads para responsables de compras.",
      rationale: "El ICP validado prioriza tiempos de entrega.",
      proposedFields: [
        { field: "nombre", value: "Compras sin demoras" },
        { field: "objetivo", value: "Generación de leads" },
        { field: "plataforma", value: "Plataforma inventada" },
        { field: "estado", value: "Activa" },
        { field: "noExiste", value: "x" },
      ],
      sourceReferences: ["discovery:icp:1", "ref-inventado"],
      warnings: [],
      similarTo: [],
      ...overrides,
    },
    { type: "Concepto", title: "Sin fuentes", description: "Idea sin respaldo", rationale: "", proposedFields: [], sourceReferences: ["otro-cliente:1"], warnings: [], similarTo: [] },
    { type: "Concepto", title: "Remarketing de visitantes", description: "Remarketing de visitantes del sitio", rationale: "Plan", proposedFields: [{ field: "nombre", value: "Remarketing de visitantes" }], sourceReferences: ["plan:publicidad-digital:2"], warnings: [], similarTo: [] },
  ],
  missingContext: [],
});

test("every assistant profile only fills fields that exist in its form and never status or owner", () => {
  expect(ASSISTANT_PROFILES.map((profile) => profile.serviceId).sort()).toEqual(["audiovisuales", "contenidos", "desarrollo-web", "diseno-marca", "estrategia", "publicidad-digital"]);
  for (const profile of ASSISTANT_PROFILES) {
    const fields = profileFields(profile);
    expect(fields.map((field) => field.key)).toEqual(profile.fieldKeys);
    expect(profile.fieldKeys).not.toContain("estado");
    expect(profile.fieldKeys).not.toContain("responsable");
  }
});

test("requests are validated by schema and cannot mix clients", () => {
  expect(validateRequest(base).profile.id).toBe("publicidad-digital:campanas");
  expect(() => validateRequest({ ...base, sources: [...base.sources, { ...base.sources[0], ref: "x", clientSlug: "epsa" }] })).toThrow(AssistantInputError);
  expect(() => validateRequest({ ...base, profileId: "crm:trabajos" })).toThrow(/No hay un asistente/);
  expect(() => validateRequest({ ...base, serviceId: "contenidos" })).toThrow(AssistantInputError);
  expect(() => validateRequest({ nope: true })).toThrow(/formato/);
});

test("the prompt carries the specialist, allowed fields with options and cited sources only", () => {
  const { system, user } = buildPrompt(profileById("publicidad-digital:campanas")!, base);
  expect(system).toContain("Publicidad Digital");
  expect(system).toContain("objetivo (Objetivo): uno de [Generación de leads");
  expect(system).not.toContain("estado (");
  expect(user).toContain("ref: discovery:icp:1");
  expect(user).toContain("ACA (aca)");
});

test("normalization drops invalid options, unknown fields, unknown refs and unsupported ideas, and flags similar work", () => {
  const result = normalizeResult(profileById("publicidad-digital:campanas")!, base, raw(), { provider: "fake", model: "fake-1" });
  expect(result.suggestions).toHaveLength(2);
  const [first, second] = result.suggestions;
  expect(first.proposedFields).toEqual({ nombre: "Compras sin demoras", objetivo: "Generación de leads" });
  expect(first.sourceReferences).toEqual(["discovery:icp:1"]);
  expect(first.warnings.join(" ")).toContain("no es una opción válida");
  expect(result.missingContext.join(" ")).toContain("Sin fuentes");
  expect(second.similarTo).toContain("publicidad-digital:campanas:CMP-1");
  expect(second.warnings.join(" ")).toMatch(/validaci|demostraci/);
  expect(() => normalizeResult(profileById("publicidad-digital:campanas")!, base, { bad: 1 }, { provider: "fake", model: "x" })).toThrow(/schema/);
  expect(similarity("Campaña de posventa como diferencial", "Posventa como diferencial")).toBeGreaterThan(0.5);
});

test("provider is only active with explicit enablement and server-side keys", () => {
  expect(providerStatus({}).configured).toBe(false);
  expect(providerStatus({ OPENAI_API_KEY: "k" }).configured).toBe(false);
  expect(providerStatus({ AI_ASSISTANT_ENABLED: "true" }).reason).toMatch(/proveedor/);
  expect(providerStatus({ AI_ASSISTANT_ENABLED: "true", OPENAI_API_KEY: "k" }).reason).toMatch(/AI_MODEL/);
  expect(providerStatus({ AI_ASSISTANT_ENABLED: "true", OPENAI_API_KEY: "k", AI_MODEL: "m" })).toMatchObject({ configured: true, provider: "openai", model: "m" });
  expect(providerStatus({ AI_ASSISTANT_ENABLED: "true", ANTHROPIC_API_KEY: "k" })).toMatchObject({ configured: true, provider: "anthropic" });
  expect(JSON.stringify(providerStatus({ AI_ASSISTANT_ENABLED: "true", ANTHROPIC_API_KEY: "secret-key" }))).not.toContain("secret-key");
});

test("adapters send structured-output requests and parse each provider's format", async () => {
  const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const fake = (payload: unknown, status = 200) =>
    (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)), headers: init?.headers as Record<string, string> });
      return new Response(JSON.stringify(payload), { status });
    }) as typeof fetch;
  const openai = createProvider({ AI_ASSISTANT_ENABLED: "true", OPENAI_API_KEY: "k1", AI_MODEL: "m1" }, fake({ choices: [{ message: { content: JSON.stringify(raw()) } }] }))!;
  expect(await openai.generate({ system: "s", user: "u" })).toMatchObject({ suggestions: expect.any(Array) });
  expect(calls[0].url).toContain("api.openai.com");
  expect((calls[0].body.response_format as { type: string }).type).toBe("json_schema");
  const anthropic = createProvider({ AI_ASSISTANT_ENABLED: "true", ANTHROPIC_API_KEY: "k2" }, fake({ content: [{ type: "tool_use", name: "submit_suggestions", input: raw() }] }))!;
  expect(await anthropic.generate({ system: "s", user: "u" })).toMatchObject({ missingContext: [] });
  expect(calls[1].url).toContain("api.anthropic.com");
  expect(calls[1].headers["x-api-key"]).toBe("k2");
  const failing = createProvider({ AI_ASSISTANT_ENABLED: "true", ANTHROPIC_API_KEY: "k3" }, fake({ error: "x" }, 500))!;
  await expect(failing.generate({ system: "s", user: "u" })).rejects.toBeInstanceOf(ProviderError);
});
