# CLAUDE.md

## Project: Camino a mi Boda

Web-based operations platform for **Camino a mi Boda**, a wedding and special events transportation company in Medellin, Colombia.

This app replaces spreadsheet- and chat-based operations with a centralized system for reservations, logistics, finances, and communications.

## Product Intent

Build an MVP that optimizes day-to-day execution first:
- Reservation lifecycle management
- Event logistics and minute-by-minute operations
- Calendar and availability conflict prevention
- Automated customer/driver communication
- Revenue split and owner settlement automation

Defer advanced CRM and AI features to Phase 2.

## Core Business Model

Most vehicles are partner-owned.
Each reservation revenue must be split between:
- Vehicle Owner
- Camino a mi Boda (company)

Default split:
- Owner: 70%
- Company: 30%

Critical rule:
- Percentages are configurable per vehicle and must sum to 100%.

## User Roles and Permissions

### Administrator
Full access.
Can manage:
- Vehicles
- Reservations
- Customers
- Drivers
- Vehicle owners
- Quotes
- Billing docs
- Finance and reports

### Operations Assistant
Can:
- Create quotes
- Create reservations
- View calendar
- View customers
- Manage event logistics
Cannot:
- Modify financial settings
- View owner payouts

### Driver
Can access only:
- Assigned events
- Event timeline
- Customer contact info
- Route/location info

## MVP Modules

### 1) Vehicle Inventory

#### Vehicle
Fields:
- name
- vehicle_type: `car | motorcycle`
- category: `classic | vintage | modern`
- brand
- model
- year
- color
- license_plate
- description
- photos
- status: `available | reserved | maintenance | inactive`
- owner_id
- owner_percentage (default 70)
- company_percentage (default 30)

#### Vehicle Owner
Fields:
- full_name
- identification_number
- phone
- whatsapp
- email
- bank_name
- account_type
- account_number

### 2) Drivers
Fields:
- full_name
- identification_number
- phone
- whatsapp
- email
- driver_license_number
- license_expiration_date
- authorized_vehicles
- notes
- status: `active | inactive`

### 3) Customers (Couples)
Fields:
- bride_name
- groom_name
- main_contact_name
- phone
- whatsapp
- email
- wedding_date
- instagram
- referral_source
- notes

### 4) Quotes
Generate professional PDF quotes (replicate existing business templates).

Quote contains:
- customer info
- event date
- vehicle(s)
- service duration
- pickup location
- ceremony location
- reception location
- total price
- payment instructions
- terms and conditions

Standard terms include:
- cancellation policy
- rescheduling policy
- vehicle breakdown policy

Actions:
- download PDF
- send via WhatsApp
- send via email

Status:
- `draft | sent | accepted | rejected | expired`

### 5) Reservations
Can be created directly or from accepted quote.

Fields:
- reservation_number
- customer_id
- event_date
- vehicle_id
- driver_id
- total_amount
- deposit_paid
- remaining_balance
- status

Statuses:
- `lead | quoted | deposit_received | reserved | confirmed | completed | cancelled`

Attachments:
- contract
- payment receipts
- reference photos
- special instructions

### 6) Event Timeline (Minute by Minute)
Core operational module.
Every reservation has a detailed timeline and operational plan.

#### Event Information
- event_name
- event_type: `wedding | brand_activation | audiovisual_production | quinceanera | other`
- event_date
- main_contact_name
- main_contact_phone
- assigned_vehicle
- assigned_driver

#### Locations (one-to-many)
Each location includes:
- location_name
- location_type: `pickup | ceremony | reception | photoshoot | other`
- address
- google_maps_link
- contact_person
- contact_phone
- notes

#### Timeline Activities (one-to-many)
Each activity includes:
- time
- description
- related_location
- estimated_duration
- notes

Requirements:
- Activities are editable and reorderable.
- Timeline is the source of truth for operations.

#### Driver Mobile View
Simplified mobile-first page with:
- event summary (customer names, vehicle, driver, contacts)
- locations with "open in Google Maps"
- full chronological timeline
- special instructions

#### Sharing
Generate a public shareable link for:
- customer view
- driver view
- internal operations view

#### Automated Reminders
Send reminders at:
- 7 days before
- 24 hours before
- 3 hours before
Recipients:
- customer
- driver
- operations team

### 7) Calendar
Views:
- day
- week
- month

Show:
- reservations
- drivers
- vehicles
- color-coded statuses

Must prevent:
- double-booking vehicles
- double-booking drivers
- scheduling conflicts

Must alert before confirmation.

### 8) Automated WhatsApp Messages
Template-driven auto messages:

- Customer confirmation
- Customer reminder (24h)
- Driver assignment message
- Post-event follow-up (review/testimonial/photos)

### 9) Billing Documents
Generate PDFs automatically.

#### Customer Billing Document
Includes:
- date
- customer info
- service description
- vehicle
- total amount
- payment instructions

#### Owner Settlement Document
Generated after event completion.
Includes:
- event info
- vehicle
- reservation value
- percentage distribution
- owner payment amount
- company revenue amount

Example:
- reservation value: COP 1,500,000
- owner payment (70%): COP 1,050,000
- company revenue (30%): COP 450,000

### 10) Finance Dashboard
Metrics:
- monthly revenue
- yearly revenue
- deposits received
- outstanding balances
- pending owner payments
- company revenue
- revenue by vehicle
- revenue by owner
- revenue by event type

## Main Dashboard
Widgets:
- upcoming events (today, this week, this month)
- reservations (pending, confirmed, completed, cancelled)
- vehicles (available, reserved, maintenance)
- financial summary (revenue this month, pending collections, pending owner payments)

## Technical Requirements

### Backend
- Python (FastAPI preferred)

### Frontend
- React
- TypeScript
- Tailwind CSS

### Database
- PostgreSQL

### Infrastructure
- Docker
- Railway or Render

### Storage
- AWS S3 compatible storage

### Authentication
- Email + password
- Role-based permissions

### Integrations
- WhatsApp
- Google Maps
- PDF generation
- Email notifications

## Data Integrity and Business Rules

- Vehicle split percentages must always equal 100.
- A reservation cannot be confirmed if vehicle or driver has conflicts.
- `remaining_balance = total_amount - deposit_paid` (never negative).
- Owner settlement is computed only for completed reservations.
- Timeline activities must be ordered by event time.
- Only admins can view owner payouts and financial configuration.

## MVP Delivery Status

1. ✅ Auth + role-based access
2. ✅ Vehicles, owners, drivers, customers CRUD
3. ✅ Quotes + PDF generation
4. ✅ Reservation lifecycle + quote conversion
5. ✅ Timeline module + share links + driver mobile view
6. ✅ Calendar + conflict detection
7. ⬜ WhatsApp/email automation (partial — cobro and minuto-a-minuto done; confirmation, reminders, driver assignment, post-event pending)
8. ✅ Billing docs + owner settlements
9. ✅ Finance and dashboard metrics

## Definition of MVP Success

The MVP is successful when operations can run daily events without spreadsheets or manual coordination, using:
- centralized reservations
- conflict-safe scheduling
- reliable timeline execution
- automated customer/driver comms
- automated owner/company revenue settlement

---

## Phase 2: Communications & Automation

Highest operational value. Eliminates the remaining manual steps in daily ops.

### WhatsApp Templates (remaining)
- Customer reservation confirmation (when status moves to `deposit_received` or `confirmed`)
- Customer 24h reminder (day before event)
- Driver assignment message (when driver is set)
- Post-event follow-up (review request + photo testimonial, sent 24h after event)

### Email Notifications
- Same events as WhatsApp but via email as fallback/parallel channel
- SMTP integration (Gmail or SendGrid)

### Automated Reminder Scheduler
- Background job (APScheduler or Celery + Redis) that fires reminders at:
  - 7 days before event → customer + driver
  - 24 hours before → customer + driver + ops team
  - 3 hours before → driver + ops team
- Reminders must be idempotent (no duplicate sends)

### Electronic Contracts
- PDF contract auto-generated from reservation data
- Signature fields (printed) or link to DocuSign/Firma.co
- Contract attached to reservation and sent to customer

---

## Phase 3: Portals & Self-Service

Reduces ops team coordination overhead. Owners and drivers get read-only access to their own data.

### Owner Portal
- Owner logs in with email/password (own role)
- Sees: their vehicles, upcoming events, settlement history, payment status
- Cannot edit anything — read-only financial view
- Replaces manual WhatsApp updates to owners

### Driver Portal
- Driver logs in (own role)
- Sees: assigned events this week/month, event timeline, customer contact, locations
- Mobile-first, optimized for phone use day-of-event
- Currently covered by share links; portal adds auth and persistent history

### Customer Portal (light)
- Couple accesses via link or login
- Sees: their event details, timeline, payment history, remaining balance
- Optional: online payment via Wompi or PSE (Colombia)

### PWA / Mobile
- Progressive Web App wrapper for the existing frontend
- Service worker for offline timeline access (critical for drivers in venues with poor signal)

---

## Phase 4: Intelligence & Growth

Business optimization once daily ops run smoothly.

### CRM Pipeline
- Lead-to-booking funnel with conversion tracking
- Response time tracking (how fast quotes are sent)
- Lost deal reasons
- Automated follow-up sequences for cold leads

### Profitability BI Dashboard
- Revenue per vehicle (which cars earn the most)
- Revenue per owner (settlement totals over time)
- Revenue per event type and month
- Projected revenue based on confirmed reservations
- Owner payment aging (how long settlements stay pending)

### Customer Follow-up Automation
- Post-event NPS / review request (WhatsApp + email)
- Anniversary reminder (1 year after wedding → referral ask)
- Referral tracking (which customers refer new ones)

### Pricing Intelligence
- Suggested price ranges per vehicle based on historical data
- Peak season demand signals
- Vehicle availability heatmap

---

## Phase 5: Scale & Integrations

When the operation grows beyond single-operator, single-city.

### WhatsApp Business API
- Replace WhatsApp Web links with direct API sends (official Meta Business API)
- Two-way messaging (customer replies routed to ops inbox)
- Message delivery and read receipts
- Required once volume makes manual WhatsApp Web impractical

### GPS Tracking
- Real-time vehicle location during active events
- Customer-facing "where is my car" view
- Late-departure alert to ops team

### Mobile App (Native)
- iOS + Android apps for drivers (built on React Native or Flutter)
- Push notifications for event reminders and new assignments
- Offline-first timeline access

### Multi-City Support
- Events in other cities (Bogotá, Cartagena, Cali)
- City-scoped vehicle availability and pricing
- Local partner management

### AI Assistant
- WhatsApp bot that answers availability and pricing questions automatically
- Quote drafting from natural language ("quiero un carro clásico para boda el 14 de febrero")
- Handoff to human ops when booking intent is confirmed
