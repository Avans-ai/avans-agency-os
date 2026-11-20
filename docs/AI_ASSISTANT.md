# Asistente IA de los módulos de servicio

## Arquitectura (`app/v2/os/assistant/`)

| Archivo | Rol |
| --- | --- |
| `types.ts` | Tipos y schemas zod compartidos: fuentes de contexto, pedido, salida cruda del modelo, sugerencia normalizada, estado del proveedor. JSON Schema equivalente para salida estructurada estricta. |
| `profiles.ts` | Un perfil por módulo y acción: foco del especialista, tipos de sugerencia, campos que puede completar (tomados de la colección), fuentes priorizadas, contexto mínimo, reglas y máximo de ideas. |
| `context.ts` | (cliente) Arma el contexto del cliente abierto: Discovery, ICP, segmentos, Benchmark y conclusiones, Plan y objetivos, campañas, resultados, aprendizajes, recomendaciones, reuniones, decisiones, alcance contratado y trabajo existente. Cada fuente lleva `ref`, estado (`validado`, `pendiente`, `demo`, `manual`) y `clientSlug`. Calcula el contexto faltante. |
| `engine.ts` | (puro) Valida el pedido y el aislamiento por cliente, arma el prompt, normaliza la salida: descarta campos no permitidos, opciones inválidas, referencias inexistentes, ideas sin fuentes y duplicadas; marca similitud con trabajo existente. |
| `providers.ts` | (servidor) Adaptador común: OpenAI (Chat Completions con `json_schema` estricto) y Anthropic (Messages con herramienta forzada). |
| `store.ts` | (cliente) Registro local de sugerencias y estado del proveedor. |
| `assisted-create.tsx` | Formulario asistido usado por `CollectionView` y el calendario de Contenidos. |
| `app/api/assistant/[action]/route.ts` | `GET status` y `POST generate`: control de origen, límite de pedidos por proceso, tamaño máximo, timeout de 45 s, errores tipados. |

## Configuración (variables de servidor, nunca `NEXT_PUBLIC_`)

```
AI_ASSISTANT_ENABLED=true      # activación explícita; sin esto no se llama a ningún proveedor
AI_PROVIDER=anthropic|openai   # opcional: si falta, se usa el que tenga clave
ANTHROPIC_API_KEY=… / OPENAI_API_KEY=…
AI_MODEL=…                     # obligatorio para OpenAI; opcional para Anthropic
```

Cargar `OPENAI_API_KEY` por otra razón no activa el asistente.

## Garantías

- Sin proveedor: «Asistente IA pendiente de conexión»; solo recomendaciones existentes rotuladas por origen.
- Las claves no salen del servidor; el estado expuesto no las incluye.
- Un pedido con fuentes de otro cliente se rechaza (`CLIENT_MISMATCH`). No hay caché de respuestas entre cuentas.
- Las sugerencias completan el formulario; guardar es siempre una acción del usuario. No se crea, activa ni publica nada en Meta, Google u otras plataformas.

## Limitaciones de la preview

- El contexto se arma en el navegador porque los datos viven en `localStorage`; con persistencia real debe armarse en el servidor a partir de datos autorizados por rol.
- El endpoint no tiene autenticación de usuario: el control de origen y el límite por proceso no reemplazan permisos de backend.
- No se probó con un proveedor real en esta sesión (no hay credenciales configuradas). Las pruebas de interfaz con proveedor usan respuestas simuladas del endpoint; las pruebas de dominio cubren el adaptador con `fetch` simulado.
