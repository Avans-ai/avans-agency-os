# Avans Agency OS

MVP interno para construir una plataforma modular que automatice la operación de una agencia de marketing con agentes de IA y supervisión humana.

## Visión

Avans Agency OS no es un chatbot ni un CRM genérico. Es un sistema operativo interno para una agencia, pensado para automatizar procesos comerciales, administrativos, creativos, de reporting y project management.

El recorrido principal del MVP es:

```txt
Lead → Discovery → Propuesta → Alta de cliente → Proyecto → Contenido → Reporte → Aprobaciones → Tareas
```

La IA prepara, interpreta, resume, genera borradores y sugiere próximos pasos. El equipo humano supervisa, aprueba y decide.

## Stack objetivo

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Row Level Security
- OpenAI API
- Vercel

## Supabase

Proyecto creado:

- Nombre: `avans-agency-os`
- Project ref: `rwjrqrwspddckvxeansc`
- URL: `https://rwjrqrwspddckvxeansc.supabase.co`
- Región: `sa-east-1`

## Identidad visual

El sistema debe usar la identidad visual de Avans Agency como base, tomando referencias de:

- Sitio: https://avans.agency/
- Mensaje de marca: “Marketing que funciona”
- Estilo: moderno, fuerte, minimalista, con contraste, gradientes y acentos naranja/lila/magenta.

Codex debe revisar `docs/VISUAL_IDENTITY.md` antes de implementar UI.

## Documentación principal

- `docs/CODEX_PROMPT.md`: prompt maestro para Codex.
- `docs/ARCHITECTURE.md`: arquitectura funcional y técnica.
- `docs/VISUAL_IDENTITY.md`: guía visual inicial basada en Avans.
- `supabase/migrations/20260814012500_initial_schema.sql`: schema inicial propuesto.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar claves reales.

```bash
cp .env.example .env.local
```

Nunca commitear `.env.local`, service role keys ni claves de OpenAI.

## Principios de producto

1. No enviar mensajes automáticamente al cliente.
2. Todo output de IA debe quedar como borrador.
3. Las decisiones sensibles requieren aprobación humana.
4. No inventar precios cerrados.
5. Registrar cada ejecución de IA en `agent_runs`.
6. Registrar errores y eventos en `automation_logs`.
7. Preparar arquitectura para n8n/webhooks futuros, sin implementarlos todavía.
8. Mantener multi-tenant desde el inicio mediante `organization_id`.
