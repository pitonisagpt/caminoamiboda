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

## Suggested MVP Delivery Order

1. Auth + role-based access
2. Vehicles, owners, drivers, customers CRUD
3. Quotes + PDF generation
4. Reservation lifecycle + quote conversion
5. Timeline module + share links + driver mobile view
6. Calendar + conflict detection
7. WhatsApp/email automation
8. Billing docs + owner settlements
9. Finance and dashboard metrics

## Phase 2 (Out of MVP Scope)

- Electronic contracts
- Owner portal
- Driver portal
- Mobile app
- GPS tracking
- Deep Google Maps integration
- WhatsApp Business API full integration
- AI customer assistant
- Automated contract generation
- CRM pipeline
- Customer follow-up automation
- Vehicle profitability analytics
- BI dashboard

## Definition of MVP Success

The MVP is successful when operations can run daily events without spreadsheets or manual coordination, using:
- centralized reservations
- conflict-safe scheduling
- reliable timeline execution
- automated customer/driver comms
- automated owner/company revenue settlement
