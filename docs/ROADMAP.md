# Camino a mi Boda — Roadmap de Desarrollo

> Última actualización: junio 2026

---

## Estado actual

### ✅ Phase 1 — Fundación (COMPLETO)

| Módulo | Estado |
|---|---|
| Auth + JWT + roles (admin / operaciones) | ✅ |
| Gestión de usuarios (admin) | ✅ |
| Vehículos CRUD + fotos + drag-reorder + visibilidad | ✅ |
| Catálogo público de vehículos + slider + Pico y Placa | ✅ |
| Clientes (parejas) CRUD | ✅ |
| Conductores CRUD + alerta de licencia por vencer | ✅ |
| Propietarios de vehículos CRUD (admin) + datos bancarios | ✅ |
| Documentos de cobro — generación básica PDF | ✅ |
| Docker Compose + PostgreSQL + Alembic (migraciones 0001–0011) | ✅ |

---

### ✅ Phase 3 — Timelines de Eventos (COMPLETO)

> Implementado antes de Phase 2 para unblock operaciones reales.

| Módulo | Estado |
|---|---|
| Timeline de evento standalone (sin dependencia de reservas) | ✅ |
| Tipo de evento: boda, activación, producción, quinceañera | ✅ |
| Ubicaciones con Google Maps link, contacto, tipo | ✅ |
| Actividades con hora, descripción, duración, ubicación relacionada | ✅ |
| Reordenamiento drag-and-drop de actividades (`@dnd-kit`) | ✅ |
| 3 tokens de enlace público: conductor / cliente / operaciones | ✅ |
| Vista pública mobile-first `/evento/:token` (sin auth) | ✅ |
| WhatsApp links para contacto y conductor desde vista pública | ✅ |
| Campo `assigned_driver_phone` para enlace directo al conductor | ✅ |
| Migraciones 0008–0011 | ✅ |

---

## Próximas fases

### 🔜 Phase 2 — Cotizaciones y Reservas

**Por qué:** El núcleo operativo. Todo evento comienza como cotización y se convierte en reserva. Sin esto, la app no reemplaza las hojas de cálculo.

#### 2.1 Cotizaciones

**Modelo / migración 0012:** `quotes`
- `customer_id` FK → customers
- `event_date`, `service_duration`
- `pickup_location`, `ceremony_location`, `reception_location`
- `total_price`, `payment_instructions`
- `status`: `draft | sent | accepted | rejected | expired`
- `pdf_path`, `notes`
- Tabla join `quote_vehicles` (many-to-many con vehículos)

**Términos estándar** (cancelación, reprogramación, falla mecánica) — configurables por cotización.

**PDF:** Plantilla `backend/templates/quote.html` — reutiliza `pdf_generator.py` existente.

**Backend:** Router `/api/quotes` — CRUD + generar PDF + transiciones de estado.

**Frontend:** Páginas `QuoteList`, `QuoteForm` — selector de clientes y vehículos; chips de estado (enviar, aceptar, rechazar); botón descargar PDF; enviar por WhatsApp (`wa.me` deep-link).

**Nav:** Enlace "Cotizaciones" en `Layout.tsx`.

#### 2.2 Reservas

**Modelo / migración 0013:** `reservations`
- `reservation_number` (auto: `RES-YYYYMM-NNN`)
- `customer_id` FK, `vehicle_id` FK, `driver_id` FK (nullable)
- `event_date`, `total_amount`, `deposit_paid`
- `remaining_balance` (computado: `total_amount − deposit_paid`, nunca negativo)
- `status`: `lead | quoted | deposit_received | reserved | confirmed | completed | cancelled`
- `quote_id` FK (nullable), `timeline_id` FK (nullable — conecta con Phase 3)
- `notes`

**Flujo cotización → reserva:** Botón "Aceptar cotización" crea reserva pre-llenada.

**Adjuntos:** Upload de contratos/recibos en `/app/uploads/reservations/` (mismo patrón que fotos de vehículos).

**Backend:** Router `/api/reservations` — CRUD + transiciones de estado + rastreo de pagos.

**Frontend:** `ReservationList`, `ReservationForm`, `ReservationDetail` — stepper de estado, tracker de pagos, adjuntos.

**Nav:** Enlace "Reservas" en `Layout.tsx`.

---

### Phase 4 — Calendario y Detección de Conflictos

**Por qué:** Visibilidad sobre todos los eventos y prevención de doble-booking.

#### 4.1 Calendario

**Backend:** `GET /api/calendar?start=&end=` — devuelve reservas con vehículo + conductor + estado.

**Frontend:** `CalendarPage` — toggle mes/semana/día, color por estado, clic para abrir detalle de reserva.

Librería: `react-big-calendar` o grilla custom liviana.

#### 4.2 Detección de Conflictos

**Backend service:** `check_conflicts(vehicle_id, driver_id, event_date)` — consulta reservas activas.

Enforce en crear/actualizar reserva: retornar HTTP 409 con detalles del conflicto.

**Frontend:** Banner de alerta en `ReservationForm` cuando hay conflicto de vehículo o conductor; bloquear cambio de estado a "confirmada" hasta resolver.

---

### Phase 5 — Comunicaciones y Automatización

**Por qué:** Mensajes automatizados reemplazan la coordinación manual por WhatsApp que consume tiempo de ops diariamente.

#### 5.1 Plantillas WhatsApp (`wa.me` deep-links) — ya implementado

Plantillas pre-armadas con datos del evento auto-completados, accesibles desde reserva y timeline:
- Confirmación de reserva al cliente ✅
- Recordatorio 24h antes al cliente
- Mensaje de asignación al conductor
- Follow-up post-evento (reseña + testimonio)

---

#### 5.2 Automatización de Email (Gmail SMTP) — sin costo

**Por qué empezar aquí:** costo cero, sin aprobaciones externas, cubre el mismo flujo operativo que WhatsApp.

**Configuración:**
- Canal: Gmail SMTP con App Password (configurado en `.env` — nunca hardcodeado)
- Variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- Librería: `smtplib` + `email.mime` (stdlib) o `aiosmtplib` para async — sin dependencias externas
- Capacidad: ~500 emails/día, suficiente para el volumen actual

**Triggers transaccionales (4 eventos):**

| Evento | Destinatario | Cuándo |
|---|---|---|
| Confirmación de reserva | Cliente | Al mover estado a `deposit_received` o `confirmed` |
| Recordatorio 24h | Cliente + Conductor | Día anterior al evento (scheduler) |
| Asignación de conductor | Conductor | Al asignar `driver_id` a una reserva |
| Follow-up post-evento | Cliente | 24h después de evento `completed` (scheduler) |

**Implementación:**
- `backend/app/services/email_service.py` — función `send_email(to, subject, html, attachments=[])`
- Plantillas HTML con logo y paleta rosa; fallback texto plano
- Los triggers transaccionales se enganchan en los endpoints de cambio de estado en `reservations.py`
- Los triggers por tiempo usan el scheduler de 5.3

**Idempotencia:** tabla `reminder_log(reservation_id, event_type, channel, sent_at)` — verificar antes de enviar para evitar duplicados.

---

#### 5.3 Scheduler de Recordatorios Automáticos

**Librería:** APScheduler (sin Redis — corre dentro del proceso FastAPI, suficiente para este volumen)

**Job:** cada hora revisa reservas próximas y envía recordatorios pendientes según ventanas:
- 7 días antes → email al cliente
- 24 horas antes → email al cliente + conductor + equipo ops
- 3 horas antes → email al conductor + equipo ops

Los recordatorios se marcan en `reminder_log` para no re-enviarse.

---

#### 5.4 WhatsApp Business API (Meta Cloud API) — costo bajo, requiere aprobación

**Cuándo implementar:** cuando el volumen de eventos justifique el costo o cuando los clientes pidan confirmaciones por WhatsApp directamente (más tasa de apertura que email).

**Modelo de costos (Colombia, junio 2026):**
- Conversaciones iniciadas por el negocio (utility): ~$0.035–0.05 USD c/u
- **Conversaciones iniciadas por el cliente: las primeras 1.000/mes son GRATIS**
- A 30 eventos/mes × 4 mensajes ≈ $5–6 USD/mes total si el negocio inicia todo

**Estrategia tier gratuito — conversación iniciada por cliente:**
Después de una reserva confirmada, enviar al cliente un email (o mensaje manual) con un link `wa.me` que diga "¿Tienes alguna pregunta? Escríbenos por aquí". Cuando el cliente escribe primero, se abre una ventana de servicio de 24h que cuenta como conversación gratuita. Dentro de esa ventana se puede enviar la confirmación, el minuto a minuto y el recordatorio sin costo.

Esto no automatiza el 100% del flujo, pero puede reducir el costo a casi cero para clientes que respondan el wa.me inicial.

**Requisitos para activar la API:**
1. Cuenta Meta Business verificada (~1–2 semanas de proceso)
2. Número de teléfono dedicado para WhatsApp Business (no puede ser el número personal)
3. Plantillas de mensaje aprobadas por Meta por categoría (utility, marketing)
4. Variables de entorno: `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`

**Implementación futura:**
- `backend/app/services/whatsapp_service.py` — wrapper sobre `POST https://graph.facebook.com/v19.0/{phone_id}/messages`
- Mismos 4 triggers que email (5.2), corriendo en paralelo o como canal alternativo
- `reminder_log` ya trackea el canal (`email` / `whatsapp`) — sin cambios de esquema

---

### Phase 6 — Finanzas y Dashboard

**Por qué:** El propietario necesita saber qué pagarle a cada socio después de cada evento y ver la salud del negocio de un vistazo.

#### 6.1 Liquidación de Propietarios

**Modelo / migración 0014:** `owner_settlements`
- `reservation_id` FK, `vehicle_id` FK, `owner_id` FK
- `reservation_value`, `owner_percentage`, `owner_amount`, `company_amount`
- `status`: `pending | paid`, `paid_at`

Regla de negocio: solo para reservas `completed`. Los porcentajes vienen de `vehicles.owner_percentage`.

**PDF:** Plantilla de Liquidación — reutiliza `pdf_generator.py`.

Ejemplo: COP 1.500.000 → 70% = $1.050.000 propietario, 30% = $450.000 empresa.

**Backend:** Router `/api/settlements` — listar, detalle, generar PDF, marcar pagado.

**Frontend:** `SettlementList`, `SettlementDetail` (solo admin).

#### 6.2 Dashboard de Finanzas

**Backend:** `GET /api/finance/summary` — queries agregadas.

Métricas:
- Ingresos mensuales / anuales
- Depósitos recibidos, saldos pendientes
- Pagos pendientes a propietarios, ingresos de la empresa
- Ingresos por vehículo / por propietario / por tipo de evento

**Frontend:** `FinancePage` (solo admin) — cards de estadísticas + gráficas con `recharts`.

#### 6.3 Dashboard Principal de Operaciones

Reemplaza `BillingDocumentList` como ruta raíz (`/`).

**Backend:** `GET /api/dashboard` — endpoint agregado único.

**Frontend:** `DashboardPage` — próximos eventos (hoy/semana/mes), contadores de reservas por estado, widget de disponibilidad de vehículos, resumen financiero.

---

### Phase 7 — Hardening y Despliegue en Producción

**Por qué:** El MVP es funcionalmente completo; hacerlo seguro y estable para uso diario real.

#### 7.1 Despliegue

- Backend → **Railway** (Dockerfile ya existe)
- Frontend → **Railway** sitio estático o **Vercel**
- PostgreSQL administrado en Railway
- Variables requeridas: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `SMTP_*`, `S3_*`

#### 7.2 Almacenamiento S3

Reemplazar `/app/uploads/` local con Cloudflare R2 o AWS S3.

Actualizar `vehicle_photos.py` para subir con `boto3.put_object()` y guardar URL.

Aplicar también a adjuntos de reservas (Phase 2).

#### 7.3 Seguridad

- Flujo de cambio de contraseña para usuarios
- Rate limiting en `/api/auth/login`
- HTTPS via plataforma de hosting
- Revisar todos los endpoints públicos/sin auth para validación de inputs

---

### Phase 8 — Futuro (Post-MVP)

Diferido intencionalmente. No construir hasta que Phase 6 esté en producción y uso diario.

| Feature | Notas |
|---|---|
| Contratos electrónicos | Requiere revisión legal para Colombia |
| Portal de propietarios (self-service) | Nuevo rol acotado + vistas |
| Portal de conductores (self-service) | Mobile-first, nuevo rol |
| App nativa móvil | React Native reutilizando API existente |
| Rastreo GPS | Integración dispositivo/flota |
| WhatsApp Business API | Requiere aprobación Meta Business |
| Asistente AI para clientes | Widget de chat o bot WA |
| Generación automática de contratos | Motor de plantillas + firma electrónica |
| Pipeline CRM (embudo de leads) | Extender estados de reserva |
| Automatización de seguimiento post-evento | Secuencias programadas |
| Análisis de rentabilidad por vehículo | Ingresos vs. costo de mantenimiento |
| Dashboard BI completo | Suite de reportes ejecutivos |

---

## Orden de construcción recomendado

```
Phase 2 (Cotizaciones + Reservas)
  → Phase 4 (Calendario + Conflictos)
    → Phase 3 (ya completo — conectar timeline_id a reservas)
      → Phase 6 (Finanzas + Dashboard)
        → Phase 5 (Comunicaciones)
          → Phase 7 (Despliegue)
            → Phase 8 (Futuro)
```

> Phase 5 (comunicaciones) puede iniciarse parcialmente durante Phase 2 (wa.me links en reservas).
> Phase 6.3 (Dashboard) debe ser lo último en Phase 6, después de que los datos financieros estén poblados.

---

## Próximo paso inmediato

**Phase 2.1 — Módulo de Cotizaciones:**
- Migración 0012 + modelo `Quote` + tabla join `quote_vehicles`
- Plantilla PDF `backend/templates/quote.html`
- Router `/api/quotes`
- Frontend: páginas `QuoteList` + `QuoteForm`
