from __future__ import annotations

from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


def regex_once(path: str, pattern: str, replacement: str) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE | re.DOTALL)
    if count != 1:
        raise SystemExit(f"Expected one regex match in {path}; got {count}: {pattern}")
    target.write_text(updated, encoding="utf-8")


# Task completion metadata and real 30-day local archive behavior.
replace_once(
    "app/v2/os/os-data.ts",
    "  activity: TaskActivity[];\n  /** Approval metadata shown on Inicio / Aprobaciones. */",
    "  activity: TaskActivity[];\n  /** ISO timestamps used by the 30-day archive policy. */\n  completedAt?: string;\n  archivedAt?: string;\n  /** Approval metadata shown on Inicio / Aprobaciones. */",
)
replace_once(
    "app/v2/os/os-data.ts",
    'status: "Hecho", desc: "Presentar objetivos, cronograma y responsables del lanzamiento al comité del cliente.",',
    'status: "Hecho", completedAt: "2026-10-03T15:00:00.000Z", desc: "Presentar objetivos, cronograma y responsables del lanzamiento al comité del cliente.",',
)
replace_once(
    "app/v2/os/director-data.ts",
    'const archivedTaskIds = new Set(["T-140"]);\n',
    'export const TASK_ARCHIVE_AFTER_DAYS = 30;\n',
)
replace_once(
    "app/v2/os/director-data.ts",
    'export function isArchivedTask(task: OsTask) {\n  return archivedTaskIds.has(task.id);\n}',
    'export function isArchivedTask(task: OsTask, now = new Date()) {\n  if (task.archivedAt) return true;\n  if (task.status !== "Hecho" || !task.completedAt) return false;\n  const completedAt = new Date(task.completedAt);\n  if (Number.isNaN(completedAt.getTime())) return false;\n  return now.getTime() - completedAt.getTime() >= TASK_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;\n}',
)

# Client channels persist across reloads in the same browser.
replace_once(
    "app/v2/os/screens/client-workspace.tsx",
    'import { serviceHref } from "../service-workspace-data";\n',
    'import { serviceHref } from "../service-workspace-data";\nimport { useLocalStorageState } from "../local-persistence";\n',
)
replace_once(
    "app/v2/os/screens/client-workspace.tsx",
    '  const [channels, setChannels] = useState<ClientChannel[]>(meta?.channels ?? []);',
    '  const [channels, setChannels] = useLocalStorageState<ClientChannel[]>(`client:${client.slug}:channels`, meta?.channels ?? []);',
)
replace_once(
    "app/v2/os/screens/client-workspace.tsx",
    '    notify("Canales actualizados solo en esta sesión (simulado)", "success");',
    '    notify("Canales guardados en este navegador. La sincronización multiusuario todavía requiere Supabase.", "success");',
)
replace_once(
    "app/v2/os/screens/client-workspace.tsx",
    '<p className={s.demoNote}>La edición funciona únicamente en esta sesión. La persistencia y los permisos de PM deben implementarse en backend.</p>',
    '<p className={s.demoNote}>Los cambios quedan guardados en este navegador. Todavía no se sincronizan entre usuarios ni reemplazan los permisos de backend.</p>',
)

# Benchmark, document metadata and change approvals persist locally.
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    'import { serviceHref } from "../service-workspace-data";\n',
    'import { serviceHref } from "../service-workspace-data";\nimport { useLocalStorageState } from "../local-persistence";\n',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    '  const [competitors, setCompetitors] = useState<CompetitorSnapshot[]>(meta?.competitors ?? []);',
    '  const [competitors, setCompetitors] = useLocalStorageState<CompetitorSnapshot[]>(`client:${client.slug}:competitors`, meta?.competitors ?? []);',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    '    notify(`${clean} agregada al benchmark solo en esta sesión (simulado)`);',
    '    notify(`${clean} quedó guardada en este navegador. El escaneo automático continúa pendiente.`);',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    '<p className={s.demoNote}>No existe un escaneo automático activo en esta rama. Las marcas y fechas son datos de demostración y las altas manuales se pierden al recargar.</p>',
    '<p className={s.demoNote}>No existe un escaneo automático activo. Las altas manuales se guardan en este navegador, pero todavía no se sincronizan ni cuentan con trazabilidad de fuentes.</p>',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    '  const [documents, setDocuments] = useState(meta?.documents ?? []);',
    '  const [documents, setDocuments] = useLocalStorageState(`client:${client.slug}:documents`, meta?.documents ?? []);',
)
regex_once(
    "app/v2/os/screens/client-management-views.tsx",
    r'  const \[changes, setChanges\] = useState\(\[\n    \{ id: "CH-1", title: "Actualizar objetivo del trimestre", detail: "El último resumen de reunión menciona priorizar calidad de leads por sobre volumen\." \},\n    \{ id: "CH-2", title: "Agregar un decisor al proceso", detail: "El documento identifica a Dirección Comercial como nueva instancia de aprobación\." \},\n  \]\);',
    '  const [changes, setChanges] = useLocalStorageState(`client:${client.slug}:document-changes`, [\n    { id: "CH-1", title: "Actualizar objetivo del trimestre", detail: "El último resumen de reunión menciona priorizar calidad de leads por sobre volumen." },\n    { id: "CH-2", title: "Agregar un decisor al proceso", detail: "El documento identifica a Dirección Comercial como nueva instancia de aprobación." },\n  ]);',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    '    setDocuments((current) => [{ id: `LOCAL-${Date.now()}`, name: file.name, type: "Documento nuevo", updated: "Ahora", source: "Carga local" }, ...current]);',
    '    setDocuments((current) => [{ id: `LOCAL-${Date.now()}`, name: file.name, type: "Documento nuevo", updated: "Ahora", source: "Metadata local" }, ...current]);',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    '    notify(`${file.name} cargado solo en esta sesión (simulado)`);',
    '    notify(`${file.name}: metadata guardada en este navegador. El archivo todavía no se sube a Storage.`);',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    'notify("Cambio aprobado solo en esta sesión (simulado)", "success");',
    'notify("Cambio aprobado y guardado en este navegador. La actualización del backend continúa pendiente.", "success");',
)
replace_once(
    "app/v2/os/screens/client-management-views.tsx",
    '<p className={s.demoNote}>El análisis automático todavía no está conectado. Una implementación real deberá guardar el archivo, citar fragmentos, mostrar diferencias y aplicar únicamente cambios aprobados.</p>',
    '<p className={s.demoNote}>Se conserva la metadata y el estado de aprobación en este navegador. El archivo binario, las citas y la aplicación multiusuario requieren Storage, extracción y permisos de backend.</p>',
)

# Manual service recommendations persist locally too.
replace_once(
    "app/v2/os/screens/client-service-workspace.tsx",
    'import { useOsStore } from "../os-store";\n',
    'import { useOsStore } from "../os-store";\nimport { useLocalStorageState } from "../local-persistence";\n',
)
replace_once(
    "app/v2/os/screens/client-service-workspace.tsx",
    '  const [manual, setManual] = useState<ServiceRecommendation[]>([]);',
    '  const [manual, setManual] = useLocalStorageState<ServiceRecommendation[]>(`client:${client.slug}:service:${service.id}:recommendations`, []);',
)
replace_once(
    "app/v2/os/screens/client-service-workspace.tsx",
    '    notify("Recomendación agregada solo a esta sesión (simulado)");',
    '    notify("Recomendación guardada en este navegador. La sincronización multiusuario continúa pendiente.");',
)
replace_once(
    "app/v2/os/screens/client-service-workspace.tsx",
    'Las recomendaciones precargadas y manuales están identificadas como demostración.',
    'Las recomendaciones precargadas son demostrativas; las manuales quedan guardadas solamente en este navegador.',
)

# Environment template and continuous quality gate for the agreed branch.
replace_once(
    ".env.example",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=\nSUPABASE_SERVICE_ROLE_KEY=",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\n# Compatibilidad temporal con proyectos que todavía usan anon JWT:\nNEXT_PUBLIC_SUPABASE_ANON_KEY=\nSUPABASE_SERVICE_ROLE_KEY=",
)
replace_once(
    ".github/workflows/quality-gate.yml",
    "on:\n  pull_request:\n    branches: [main]\n  workflow_dispatch:\n",
    "on:\n  push:\n    branches: [feat/avans-os-ajustes-reunion-2026-11-03]\n  pull_request:\n    branches: [main]\n  workflow_dispatch:\n",
)

print("Persistence integration patch applied")
