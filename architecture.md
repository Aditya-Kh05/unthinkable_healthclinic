# Architecture — Healthcare Appointment & Follow-up Manager

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js 14)                       │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │ Patient   │   │ Doctor       │   │ Admin Portal             │ │
│  │ Portal    │   │ Portal       │   │ (Doctor CRUD, Leave Mgmt)│ │
│  └─────┬────┘   └──────┬───────┘   └────────────┬─────────────┘ │
│        └───────────────┬┘────────────────────────┘               │
│                        │ REST API Calls                          │
└────────────────────────┼─────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┼─────────────────────────────────────────┐
│                  API GATEWAY (Express.js)                         │
│  ┌─────────────────────┴──────────────────────────────────────┐  │
│  │  Middleware: Auth (JWT) → Rate Limit → Validation (Zod)    │  │
│  └─────────────────────┬──────────────────────────────────────┘  │
│                        │                                          │
│  ┌──────────┬──────────┼──────────┬───────────────┐              │
│  │ Auth     │ Appt     │ Doctor   │ Patient       │              │
│  │ Routes   │ Routes   │ Routes   │ Routes        │              │
│  └────┬─────┴────┬─────┴────┬─────┴─────┬─────────┘              │
│       └──────────┴──────────┴───────────┘                        │
│                        │                                          │
│  ┌─────────────────────┴──────────────────────────────────────┐  │
│  │                  SERVICE LAYER                              │  │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │  │
│  │  │ Booking    │ │ LLM      │ │ Email    │ │ Calendar    │ │  │
│  │  │ Service    │ │ Service  │ │ Service  │ │ Service     │ │  │
│  │  └────────────┘ └──────────┘ └──────────┘ └─────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────────┐
          │                │                    │
  ┌───────▼──────┐  ┌──────▼──────┐   ┌────────▼────────┐
  │ PostgreSQL   │  │ Redis       │   │ External APIs   │
  │ (Prisma ORM) │  │ (BullMQ)    │   │ • OpenAI API    │
  │              │  │             │   │ • SendGrid      │
  │ • Users      │  │ • Job Queue │   │ • Google Cal    │
  │ • Doctors    │  │ • Slot Hold │   │                 │
  │ • Appts      │  │ • Retries   │   └─────────────────┘
  │ • Summaries  │  └─────────────┘
  └──────────────┘
```

---

## System Components

### 1. Frontend — Next.js 14 (App Router)

| Portal  | Key Pages |
|---------|-----------|
| **Patient** | Registration, Login, Doctor Search, Slot Booking, Symptom Form, My Appointments, Post-Visit Summary View |
| **Doctor** | Dashboard, Today's Appointments, Pre-Visit Summary View, Post-Visit Notes Form, Schedule Overview |
| **Admin** | Doctor Management (CRUD), Leave Management, System Overview Dashboard |

**Key Design Decisions:**
- Server Components for initial data fetching (SEO, performance)
- Client Components for interactive forms and real-time UI updates
- TanStack Query for server state caching and refetching
- Optimistic UI updates for booking actions

### 2. Backend — Express.js API Server

#### Layered Architecture
```
Routes → Controllers → Services → Data Access (Prisma)
```

- **Routes**: Define HTTP endpoints, attach middleware
- **Controllers**: Parse request, call service, format response
- **Services**: Core business logic, orchestrate multiple data sources
- **Data Access**: Prisma ORM queries and transactions

#### Key Middleware
| Middleware | Purpose |
|------------|---------|
| `authenticate` | Verify JWT, attach user to request |
| `authorize(roles)` | Check user role against allowed roles |
| `validate(schema)` | Validate request body/params/query with Zod |
| `rateLimiter` | Prevent abuse (especially on booking endpoints) |
| `errorHandler` | Catch all errors, return standardized response |

### 3. Database — PostgreSQL (via Prisma)

#### Entity Relationship Overview
```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  Users   │───1:1─│  Patients    │───1:N─│ Appointments │
│          │       └──────────────┘       │              │
│          │       ┌──────────────┐       │              │
│          │───1:1─│  Doctors     │───1:N─│              │
└──────────┘       │              │       └──────┬───────┘
                   │              │              │
                   │              │       ┌──────▼───────┐
                   │              │       │  Summaries   │
                   │              │       │ (Pre & Post) │
                   └──────┬───────┘       └──────────────┘
                          │
                   ┌──────▼───────┐       ┌──────────────┐
                   │  Schedules   │       │ Prescriptions│
                   │  (Slots)     │       │ & Reminders  │
                   └──────────────┘       └──────────────┘
```

#### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | Auth credentials + role (patient / doctor / admin) |
| `patients` | Patient profile (linked to users) |
| `doctors` | Doctor profile, specialisation, slot duration |
| `doctor_schedules` | Working hours per day of week |
| `doctor_leaves` | Leave dates |
| `appointments` | Booked appointments with status |
| `slot_holds` | Temporary slot reservations (5-min TTL) |
| `pre_visit_summaries` | LLM-generated symptom analysis |
| `post_visit_summaries` | LLM-generated visit summary |
| `prescriptions` | Medications with dosage and frequency |
| `medication_reminders` | Scheduled reminder entries |
| `notifications` | Email notification log with status |
| `calendar_events` | Google Calendar event IDs for sync |

### 4. Background Job System — BullMQ + Redis

| Queue | Jobs |
|-------|------|
| `email` | Send booking confirmation, reminders, cancellation emails |
| `email-retry` | Retry failed email sends (exponential backoff, max 3 retries) |
| `medication-reminder` | Send medication reminders based on prescription schedule |
| `slot-hold-expiry` | Release expired slot holds after 5-minute TTL |
| `leave-notification` | Notify affected patients when doctor marks leave |
| `calendar-sync` | Create/update/delete Google Calendar events |

### 5. External Service Integrations

#### OpenAI API (LLM)
- **Pre-visit**: Symptom analysis → urgency level, chief complaint, suggested questions
- **Post-visit**: Clinical notes → patient-friendly summary with medication schedule
- **Failure handling**: Retry once, then store raw input and flag for manual review
- **Outputs stored** in DB with timestamps for audit

#### Google Calendar API
- **OAuth 2.0 flow**: Patient and Doctor authorize calendar access on first use
- **On booking**: Create events for both patient and doctor
- **On reschedule**: Update existing events
- **On cancellation**: Delete events
- **Token refresh**: Handle expired tokens automatically

#### Email Service (SendGrid via Nodemailer)
- Templated emails for: confirmation, reminder, cancellation, leave notification
- All sends go through BullMQ queue (never blocking the API response)
- Failed sends retried with exponential backoff

---

## Critical Flows

### Appointment Booking Flow
```
Patient selects doctor & slot
        │
        ▼
  Slot available? ──No──▶ Return 409 Conflict
        │ Yes
        ▼
  Create slot_hold (5-min TTL)
        │
        ▼
  Patient fills symptom form
        │
        ▼
  Submit booking request
        │
        ▼
  DB Transaction:
    1. Verify slot_hold still valid
    2. Check no conflicting appointment exists
    3. Create appointment record
    4. Delete slot_hold
    5. Queue LLM job (pre-visit summary)
    6. Queue email job (confirmation)
    7. Queue calendar job (create event)
        │
        ▼
  Return 201 Created
```

### Double-Booking Prevention
```
Strategy: Optimistic Locking + DB Unique Constraint

1. UNIQUE constraint on (doctor_id, date, start_time) in appointments table
2. Slot hold table with UNIQUE constraint on (doctor_id, date, start_time)
3. Booking runs inside a SERIALIZABLE transaction
4. If constraint violation → return 409 Conflict to the later request
```

### Doctor Leave Handling
```
Admin marks doctor on leave for a date
        │
        ▼
  Query all appointments for that doctor on that date
        │
        ▼
  For each appointment:
    1. Update status to "cancelled_by_leave"
    2. Queue email notification to patient
    3. Queue Google Calendar event deletion
        │
        ▼
  Create doctor_leave record
```

---

## Deployment Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   Render /   │     │   Supabase / │
│  (Frontend)  │────▶│   Railway    │────▶│   Render     │
│   Next.js    │     │  (Backend)   │     │  (Postgres)  │
└──────────────┘     │  Express.js  │     └──────────────┘
                     │  + BullMQ    │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  Upstash /   │
                     │  Redis Labs  │
                     │  (Redis)     │
                     └──────────────┘
```

---

## Security Considerations
- Passwords hashed with bcrypt (12 salt rounds)
- JWT access tokens (15-min expiry) + refresh tokens (7-day expiry)
- Role-based route protection at middleware level
- Input sanitization and validation on every endpoint
- Rate limiting on auth and booking endpoints
- CORS configured for frontend origin only
- Environment secrets never committed (`.env` in `.gitignore`)
- Google OAuth tokens encrypted at rest in DB
