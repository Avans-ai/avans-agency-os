# Google Workspace · preparación de integración

Estado: NO CONECTADO. No se crearon credenciales, suscripciones ni recursos de Google. No se ejecutaron migraciones. Las rutas no habilitan acceso por cambiar el rol simulado de la preview ni por completar variables.

## Código implementado

`lib/google-workspace/` contiene contratos de repositorio y sesiones OAuth, adapters HTTP de Calendar, Meet, Docs, Drive y Workspace Events, OAuth con PKCE, estado aleatorio de un solo uso con vencimiento, renovación y revocación, validación criptográfica de OIDC de Pub/Sub con `jose`, parser de CloudEvents y orquestación de importación idempotente. HTTP usa orígenes fijos, timeout, no-store y rechazo de redirecciones. No se siguen URLs contenidas en una nota. Los errores excluyen tokens y contenido de respuestas.

Flujo: Pub/Sub autenticado → claim durable del evento → `conferenceRecords.smartNotes.get` → `docsDestination.document` → Google Docs (incluidos tabs y tablas) → metadatos Drive → conferencia/espacio Meet → Calendar por código y ventana de fechas → asociación determinística → fuente/reunión/propuestas o bandeja sin cliente → aprobación del PM. Ante más de un evento Calendar coincidente no se adivina. Los textos importados son datos, nunca instrucciones ejecutables. La extracción local reconoce etiquetas explícitas y permite propuestas manuales con citas; no hay un modelo de IA conectado.

Evento: `google.workspace.meet.smartNote.v2.fileGenerated`. Pub/Sub transporta atributos `ce-id`, `ce-type`, `ce-source`, `ce-time`, `ce-specversion` y el recurso Smart Note en el JSON codificado en base64. Se validan firma RS256, issuer, audiencia exacta, expiración, antigüedad y email verificado de la cuenta de servicio; después deben verificarse la suscripción Pub/Sub y el `ce-source` de Workspace guardados para esa organización. El endpoint devuelve 401 sin OIDC válido y 503 mientras el repositorio no esté habilitado: no confirma entregas no persistidas.

## Configuración necesaria (servidor de preview autorizado)

- Proyecto de Google Cloud y cuenta Workspace con permisos sobre las notas. La disponibilidad de Smart Notes depende de la edición de Workspace y de la política del administrador.
- Habilitar Calendar API, Meet REST API, Docs API, Drive API, Workspace Events API y Pub/Sub API.
- Cliente OAuth web y pantalla de consentimiento aprobada. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` con callback exacto `/api/integrations/google/oauth-callback`. No pegarlos en el repositorio ni en la conversación.
- Scopes: `meetings.space.readonly`, `calendar.events.readonly`, `documents.readonly`, `drive.metadata.readonly` bajo `https://www.googleapis.com/auth/`. Calendar no necesita escritura. Drive solo obtiene metadatos; el contenido se lee por Docs. Revisar aprobación/verificación de scopes con el administrador.
- `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_PUBSUB_TOPIC` (`projects/…/topics/…`), `GOOGLE_PUBSUB_SUBSCRIPTION` (`projects/…/subscriptions/…`). Otorgar Publisher a `meet-api-event-push@system.gserviceaccount.com` en ese topic.
- Push autenticado con cuenta de servicio dedicada. `GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_PUBSUB_AUDIENCE` deben corresponder al endpoint HTTPS exacto `/api/integrations/google/webhook`. Configurar permisos de firma OIDC de Pub/Sub, reintentos y dead-letter.
- `GOOGLE_WORKSPACE_TARGET_RESOURCE`: `//meet.googleapis.com/spaces/…` o `//cloudidentity.googleapis.com/users/…` del usuario autorizado propietario de las reuniones. No implica acceso a todo el dominio.
- `GOOGLE_WORKSPACE_EVENT_SOURCE`: nombre completo de la suscripción efectivamente creada (`//workspaceevents.googleapis.com/subscriptions/…`), validado por organización; no se deriva de datos no confiables.
- `GOOGLE_CALENDAR_ID` (por defecto `primary`). `GOOGLE_TOKEN_ENCRYPTION_KEY_ID`: referencia a una clave gestionada de cifrado, sin tokens en localStorage.

## Antes de activar rutas

Implementar y validar las interfaces `WorkspaceRepository`, `MeetingRepository` y `OAuthSessionStore` contra el esquema preparado, con identidad real de administrador/organización. El repositorio cifra tokens, verifica organización en cada operación y usa una transacción para fuente, reunión y propuestas. El claim de eventos necesita una lease recuperable: un fallo entre persistir y completar se reintenta sin duplicar. El estado OAuth debe estar vinculado a sesión, usuario y organización, consumirse atómicamente y vencer a los 10 minutos. Persistir la conexión y auditar `google.oauth.connected` tras el intercambio aprobado.

La ruta catch-all mantiene OAuth, callback, sync, disconnect, subscriptions y renew en 503 hasta conectar estos repositorios y la autenticación. No es una conexión operativa. No activar con un simple flag.

Crear la suscripción mediante el adapter y esperar la operación asíncrona; guardar el nombre y la expiración reales. Renovar con `subscriptions.patch` y `updateMask=ttl` antes del vencimiento, usando un trabajo autenticado; la renovación todavía no se agenda. En desconexión, detener trabajos, eliminar la suscripción y revocar el token; registrar errores y reintentar si Google no permite la revocación. La UI de desconexión está deshabilitada porque aún no existe una conexión.

## Retención y eliminación

La preview guarda datos locales hasta su eliminación por el usuario y no es un almacén de notas sensibles reales. Las notas de reuniones/cuestionarios se muestran solo al administrador/PM asignado en la UI. El selector de roles de una demo no reemplaza autorización de servidor. No cargar secretos en notas.

Para el backend: proponer 90 días de texto bruto y 1 año de metadatos, evidencia y auditoría, sujetos a política aprobada de Avans/cliente; no hay borrado automático activo. La eliminación debe revocar referencias, retirar texto/artefactos e invalidar propuestas pendientes sin borrar silenciosamente el historial de decisiones. Definir purga de backups y solicitudes de acceso/borrado antes de producción. No borrar el documento original en Google al eliminar una importación local.

## Referencias oficiales consultadas

- https://developers.google.com/workspace/events/guides/events-meet
- https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.smartNotes
- https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.smartNotes/get
- https://developers.google.com/workspace/meet/api/guides/artifacts
- https://developers.google.com/workspace/events
- https://developers.google.com/workspace/events/guides/create-subscription
- https://developers.google.com/workspace/events/guides/update-subscription
- https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
