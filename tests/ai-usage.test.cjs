// Unit/SSR regressions only. Supabase requests use an in-memory HTTP adapter;
// no credentials, external requests, database or RLS execution are involved.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createClient } = require('@supabase/supabase-js');

function loadSource(relative, imports = {}, env = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const compiledModule = { exports: {} };
  const localRequire = (name) => {
    if (name in imports) return imports[name];
    if (name === 'next/link') return (props) => React.createElement('a', { href: props.href }, props.children);
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    return require(name);
  };
  new Function('require', 'module', 'exports', 'process', output)(localRequire, compiledModule, compiledModule.exports, { env });
  return compiledModule.exports;
}

const fakeEnv = { NEXT_PUBLIC_SUPABASE_URL: 'https://telemetry-test.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-test-only', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-only' };
const capture = { organization_id: 'org-a', provider: 'test-provider', source_event_id: 'operation-a', model: 'test-model', modality: 'text', area: 'Test area', activity: 'Test task', units_generated: 1, cost_usd: 10, cost_source: 'provider' };
const event = (overrides = {}) => ({ id: 'event-a', occurred_at: new Date(Date.now() - 60000).toISOString(), area: 'Test area', activity: 'Test task', provider: 'test-provider', model: 'test-model', modality: 'text', input_tokens: 1, output_tokens: 1, units_generated: 1, units_approved: 1, attempts: 1, cost_usd: 10, minutes_saved: 0, cost_source: 'provider', ...overrides });
const snapshot = (overrides = {}) => ({ mode: 'live', events: [], budgets: [], note: 'Synthetic unit test', coverage: { status: 'complete', returned_events: 0, total_events: 0 }, ...overrides });
const { AiUsageHub } = loadSource('app/v2/components/ai-usage-hub.tsx');
const render = (data) => renderToStaticMarkup(React.createElement(AiUsageHub, { snapshot: data }));
const text = (data) => render(data).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const budget = (spent, limit) => snapshot({ events: [event({ cost_usd: spent })], budgets: [{ area: 'Test area', monthly_limit_usd: limit }] });

function recorderHarness() {
  const rows = new Map();
  const requests = [];
  let sequence = 0;
  async function fetchInMemory(input, init) {
    const url = new URL(input);
    assert.equal(url.origin, 'https://telemetry-test.invalid');
    assert.equal(url.pathname, '/rest/v1/ai_usage_events');
    const headers = new Headers(init.headers);
    const method = init.method || 'GET';
    const payload = init.body ? JSON.parse(init.body) : null;
    requests.push({ method, payload, url, headers });
    const selected = () => [...rows.values()].filter((row) => [...url.searchParams].every(([key, value]) => !value.startsWith('eq.') || row[key] === value.slice(3)));
    let result;
    if (method === 'POST') {
      const key = [payload.organization_id, payload.provider, payload.source_event_id].join(':');
      const existing = rows.get(key);
      if (existing && headers.get('Prefer').includes('resolution=ignore-duplicates')) result = [];
      else {
        const next = { ...(existing || { id: 'id-' + ++sequence }), ...payload };
        rows.set(key, next); result = [next];
      }
    } else if (method === 'PATCH') {
      for (const row of selected()) Object.assign(row, payload);
      return new Response(null, { status: 204 });
    } else {
      assert.equal(method, 'GET'); result = selected();
    }
    const single = headers.get('Accept') === 'application/vnd.pgrst.object+json';
    if (single && result.length !== 1) return new Response(JSON.stringify({ code: 'PGRST116', message: 'Expected exactly one row', details: `Results contain ${result.length} rows` }), { status: 406, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(single ? result[0] : result), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const recorder = loadSource('lib/ai-usage-recorder.ts', {
    '@supabase/supabase-js': { createClient: (url, key, options) => createClient(url, key, { ...options, global: { fetch: fetchInMemory } }) },
  }, fakeEnv);
  return { ...recorder, rows, requests };
}

test('replay after approval preserves outcome, savings, cost and original ID', async () => {
  const db = recorderHarness();
  const id = await db.recordAiUsage(capture);
  await db.recordAiUsageOutcome({ organization_id: 'org-a', usage_event_id: id, approved: 1, minutes_saved: 60 });
  const before = { ...[...db.rows.values()][0] };
  assert.equal(await db.recordAiUsage(capture), id);
  assert.equal(db.rows.size, 1);
  assert.deepEqual([...db.rows.values()][0], before);
  assert.match(db.requests.find((r) => r.method === 'POST').headers.get('Prefer'), /resolution=ignore-duplicates/);
});

test('simultaneous duplicate captures return one ID without duplicate rows', async () => {
  const db = recorderHarness();
  const ids = await Promise.all(Array.from({ length: 5 }, () => db.recordAiUsage(capture)));
  assert.equal(new Set(ids).size, 1); assert.equal(db.rows.size, 1);
});

test('idempotency includes organization and provider', async () => {
  const db = recorderHarness();
  const ids = await Promise.all([capture, { ...capture, organization_id: 'org-b' }, { ...capture, provider: 'other-provider' }].map(db.recordAiUsage));
  assert.equal(new Set(ids).size, 3); assert.equal(db.rows.size, 3);
});

test('omitted minutes_saved preserves value, explicit null clears it', async () => {
  const db = recorderHarness(); const id = await db.recordAiUsage(capture);
  await db.recordAiUsageOutcome({ organization_id: 'org-a', usage_event_id: id, approved: 1, minutes_saved: 60 });
  await db.recordAiUsageOutcome({ organization_id: 'org-a', usage_event_id: id, approved: 1 });
  assert.equal([...db.rows.values()][0].minutes_saved, 60);
  assert.equal(Object.hasOwn(db.requests.filter((r) => r.method === 'PATCH').at(-1).payload, 'minutes_saved'), false);
  await db.recordAiUsageOutcome({ organization_id: 'org-a', usage_event_id: id, approved: 1, minutes_saved: null });
  assert.equal([...db.rows.values()][0].minutes_saved, null);
});

test('invalid approval and another organization cannot update event', async () => {
  const db = recorderHarness(); const id = await db.recordAiUsage(capture);
  await assert.rejects(db.recordAiUsageOutcome({ organization_id: 'org-a', usage_event_id: id, approved: 2 }), /exceed/);
  await assert.rejects(db.recordAiUsageOutcome({ organization_id: 'org-b', usage_event_id: id, approved: 1 }), /not found/);
  assert.equal(db.requests.filter((r) => r.method === 'PATCH').length, 0);
});

for (const [spent, expected] of [[794.9, 'Dentro del presupuesto'], [795, 'Dentro del presupuesto'], [800, 'Revisar gasto'], [994.9, 'Revisar gasto'], [995, 'Revisar gasto'], [1000, 'Límite alcanzado'], [1000.01, 'Límite superado']]) {
  test(`budget status uses exact USD ${spent} / 1000`, () => {
    const output = text(budget(spent, 1000)); assert.ok(output.includes(expected));
    if (spent <= 1000) assert.doesNotMatch(output, /Límite superado/);
  });
}

test('explicit zero budget with spend is exceeded; zero spend is valid', () => {
  for (const spent of [0, 1]) {
    const output = text(budget(spent, 0));
    assert.match(output, /Presupuesto cero/);
    assert.ok(output.includes(spent ? 'Límite superado' : 'Sin consumo registrado'));
    assert.doesNotMatch(output, /No hay presupuestos|NaN|Infinity/);
  }
  assert.match(text(snapshot()), /No hay presupuestos mensuales configurados/);
});

test('decimal sums use stored micro-USD precision at exact thresholds', () => {
  for (const [costs, limit, expected] of [[[0.1, 0.2], 0.3, 'Límite alcanzado'], [[0.1, 0.7], 1, 'Revisar gasto'], [[0.3, 0.000001], 0.3, 'Límite superado']]) {
    const output = text(snapshot({ events: costs.map((cost_usd, i) => event({ id: `event-${i}`, cost_usd })), budgets: [{ area: 'Test area', monthly_limit_usd: limit }] }));
    assert.ok(output.includes(expected));
    if (expected !== 'Límite superado') assert.doesNotMatch(output, /Límite superado/);
  }
});

test('partial and unknown coverage never claim complete budget or efficiency', () => {
  for (const coverage of [{ status: 'partial', returned_events: 1000, total_events: 1500 }, { status: 'unknown', returned_events: 1, total_events: null }, undefined]) {
    const output = text({ ...budget(100, 1000), coverage });
    assert.doesNotMatch(output, /Dentro del presupuesto|Sin desvíos detectados/);
    assert.match(output, /no se calcula eficiencia total/);
    assert.match(output, /mínimo conocido/);
    assert.match(output, /Faltan registros para evaluar desvíos/);
  }
});

test('unknown costs hide cost per result and cannot confirm budget', () => {
  const output = text(snapshot({ events: [event({ cost_usd: null })], budgets: [{ area: 'Test area', monthly_limit_usd: 1000 }] }));
  assert.match(output, /Faltan importes para calcularlo/); assert.match(output, /COSTOS SIN INFORMAR/);
  assert.doesNotMatch(output, /Dentro del presupuesto/);
});

test('only text modality contributes to Tokens (texto)', () => {
  const output = text(snapshot({ events: [event({ input_tokens: 7, output_tokens: 3 }), event({ id: 'video', modality: 'video', input_tokens: 700, output_tokens: 300 }), event({ id: 'image', modality: 'image', input_tokens: 50 })] }));
  assert.match(output, /Tokens \(texto\) 10 7 entrada/);
});

test('forbidden and unavailable snapshots render no financial metrics', () => {
  for (const mode of ['forbidden', 'unavailable']) {
    const output = text(snapshot({ mode, events: [event({ cost_usd: 12345 })] }));
    assert.doesNotMatch(output, /12\.345|Inversión IA conocida/);
  }
});

function serverHarness({ user = { id: 'user-a' }, membership = { organization_id: 'org-a', role: 'finance' }, usage = [], count = usage.length, usageError = null, membershipError = null, budgetsError = null } = {}, env = fakeEnv) {
  const calls = [];
  const db = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      const call = { table, filters: [] }; calls.push(call);
      const query = {
        select(columns, options) { call.columns = columns; call.options = options; return query; },
        eq(key, value) { call.filters.push([key, value]); return query; },
        in(key, value) { call.roles = [key, value]; return query; },
        limit(value) { call.limit = value; return query; },
        gte() { return query; }, order() { return query; },
        maybeSingle: async () => ({ data: membership, error: membershipError }),
        then(resolve) { return Promise.resolve(table === 'ai_usage_events' ? { data: usage, count, error: usageError } : { data: [], error: budgetsError }).then(resolve); },
      }; return query;
    },
  };
  const server = loadSource('app/v2/ai-usage-server.ts', {
    'next/headers': { cookies: async () => ({ getAll: () => [] }) },
    '@supabase/ssr': { createServerClient: () => db },
    './ai-usage-data': loadSource('app/v2/ai-usage-data.ts'),
  }, env);
  return { ...server, calls };
}

for (const [returned, total, expected] of [[1000, 1500, 'partial'], [2000, 2500, 'partial'], [2000, 2000, 'complete'], [1, null, 'unknown'], [1, 0, 'unknown'], [0, 0, 'complete']]) {
  test(`coverage handles ${returned} returned / ${total} exact count as ${expected}`, async () => {
    const db = serverHarness({ usage: Array.from({ length: returned }, (_, i) => event({ id: `event-${i}` })), count: total });
    const result = await db.getAiUsageSnapshot();
    assert.equal(result.coverage.status, expected);
    assert.deepEqual(db.calls.find((c) => c.table === 'ai_usage_events').options, { count: 'exact' });
    if (expected !== 'complete') assert.match(result.note, /parcial|sin verificar/);
  });
}

test('authorized reads keep explicit organization filters and privileged roles', async () => {
  const db = serverHarness(); await db.getAiUsageSnapshot();
  assert.deepEqual(db.calls[0].roles, ['role', ['admin', 'finance']]);
  for (const call of db.calls.slice(1)) assert.ok(call.filters.some(([key, value]) => key === 'organization_id' && value === 'org-a'));
});

test('anonymous or missing privileged membership stops before financial queries', async () => {
  for (const options of [{ user: null }, { membership: null }]) {
    const db = serverHarness(options); const result = await db.getAiUsageSnapshot();
    assert.equal(result.mode, 'forbidden'); assert.equal(result.events.length, 0);
    assert.ok(db.calls.every((call) => call.table === 'organization_members'));
  }
});

test('database or permission lookup error never falls back to demo', async () => {
  for (const field of ['usageError', 'membershipError', 'budgetsError']) {
    const result = await serverHarness({ [field]: { message: 'synthetic error' } }).getAiUsageSnapshot();
    assert.equal(result.mode, 'unavailable'); assert.equal(result.events.length, 0);
  }
});

test('missing configuration returns explicit demo with exact coverage', async () => {
  const result = await serverHarness({}, {}).getAiUsageSnapshot();
  assert.equal(result.mode, 'demo'); assert.equal(result.coverage.status, 'complete');
  assert.equal(result.coverage.total_events, result.events.length);
  assert.match(text(result), /DATOS ILUSTRATIVOS/);
});
