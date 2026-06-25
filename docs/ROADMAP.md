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

#### 5.1 Plantillas WhatsApp (`wa.me` deep-links)

Plantillas pre-armadas con datos del evento auto-completados, accesibles desde reserva y timeline:
- Confirmación de reserva al cliente
- Recordatorio 24h antes al cliente
- Mensaje de asignación al conductor
- Follow-up post-evento (reseña + testimonio)

#### 5.2 Notificaciones Email

- Confirmación al cliente (adjunto PDF)
- Liquidación al propietario (adjunto PDF)
- Config SMTP en `.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
- Backend: `email_service.py` con `smtplib` o `fastapi-mail`

#### 5.3 Recordatorios automáticos

Tabla `reminder_log` — registra qué se envió (7d / 24h / 3h antes del evento), a quién, por qué canal.

APScheduler en FastAPI verifica próximas reservas y genera URLs de WhatsApp.

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
