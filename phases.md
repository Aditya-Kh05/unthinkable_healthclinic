# Development Phases — Healthcare Appointment & Follow-up Manager

## Overview

The project is compressed into a **3-day sprint**. We build in parallel where possible and prioritize working functionality over polish.

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| 1 | Foundation + Core Backend | Day 1 (8–10 hrs) | Project setup, DB, auth, full booking API, admin API |
| 2 | AI + Notifications + Frontend | Day 2 (8–10 hrs) | LLM integration, email, Google Calendar, all frontend pages |
| 3 | Polish + Deploy + Docs | Day 3 (6–8 hrs) | UI polish, deployment, README, system design write-up |

**Total: 2–3 days**

---

## Phase 1: Foundation + Core Backend (Day 1)
**Goal**: Full backend API working — auth, admin doctor management, patient booking with concurrency handling, doctor endpoints.

### Morning (4–5 hrs) — Setup & Auth & DB
- [ ] Initialize monorepo structure (`client/` + `server/`)
- [ ] Set up Next.js 14 with TypeScript and Tailwind CSS
- [ ] Set up Express.js with TypeScript
- [ ] Configure Prisma ORM with PostgreSQL
- [ ] Create **complete** database schema (all tables in one go)
- [ ] Run initial migration
- [ ] Implement auth endpoints (register, login, refresh, logout)
- [ ] Build auth middleware (JWT verify + role check)
- [ ] Create admin seeder script
- [ ] Set up centralized error handler + Zod validation middleware

### Afternoon (4–5 hrs) — Core API Endpoints
- [ ] **Admin endpoints**: Doctor CRUD, schedule setup, leave management
- [ ] **Leave handling**: Auto-cancel appointments + queue notification
- [ ] **Patient endpoints**: Search doctors, get available slots, hold slot, book appointment, cancel, reschedule, list appointments
- [ ] **Slot hold**: 5-min TTL with background expiry
- [ ] **Double-booking prevention**: UNIQUE constraint + serializable transaction
- [ ] **Doctor endpoints**: List appointments, view pre-visit summary, submit post-visit notes + prescription, mark complete
- [ ] Set up BullMQ + Redis for job queues (email, slot-expiry, reminders)

### Day 1 Deliverables
- ✅ All API endpoints functional and testable via Postman/Thunder Client
- ✅ Database fully migrated with all tables
- ✅ Auth working for all 3 roles
- ✅ Booking flow works end-to-end (hold → book → cancel)
- ✅ Double-booking prevented at DB level
- ✅ Background job infrastructure ready

---

## Phase 2: AI + Notifications + Frontend (Day 2)
**Goal**: LLM integration working, emails sending, Google Calendar syncing, all frontend pages built.

### Morning (4–5 hrs) — Integrations
- [ ] **LLM Service**: OpenAI API client with retry + graceful failure
- [ ] **Pre-visit prompt**: Symptoms → urgency, chief complaint, suggested questions
- [ ] **Post-visit prompt**: Clinical notes → patient-friendly summary
- [ ] Store all LLM outputs in DB, handle `llm_pending` state
- [ ] **Email Service**: Nodemailer + SendGrid setup
- [ ] Email templates: confirmation, reminder, cancellation, leave notification
- [ ] BullMQ email queue with exponential backoff retry (max 3)
- [ ] **Google Calendar**: OAuth 2.0 flow, create/update/delete events
- [ ] Store calendar event IDs, handle token refresh
- [ ] **Medication reminders**: Parse prescription → schedule reminder jobs

### Afternoon (4–5 hrs) — Frontend Pages
- [ ] **Shared**: Layout (navbar, sidebar), auth pages (login, register)
- [ ] **Patient Portal**:
  - [ ] Doctor search page (filter by specialisation)
  - [ ] Slot booking page (date picker + slot grid + symptom form)
  - [ ] My appointments page (upcoming / past / cancelled tabs)
  - [ ] Appointment detail page (pre-visit & post-visit summaries)
- [ ] **Doctor Portal**:
  - [ ] Dashboard (today's appointments, next patient summary)
  - [ ] Appointment detail (pre-visit summary view)
  - [ ] Post-visit form (clinical notes + prescription entry)
- [ ] **Admin Portal**:
  - [ ] Doctor management page (table with CRUD)
  - [ ] Add/edit doctor form (profile + schedule + leave)
- [ ] Wire up all API calls with TanStack Query
- [ ] Add basic loading states and error toasts

### Day 2 Deliverables
- ✅ LLM generates pre-visit and post-visit summaries
- ✅ Emails send on booking, cancellation, and leave
- ✅ Google Calendar events created/updated/deleted
- ✅ All frontend pages functional with real data
- ✅ End-to-end flow works: register → book → symptom → AI summary → visit → notes → patient summary

---

## Phase 3: Polish + Deploy + Docs (Day 3)
**Goal**: Production-ready app with polished UI, hosted URL, and complete documentation.

### Morning (3–4 hrs) — UI Polish & Edge Cases
- [ ] Apply design system (colors, typography, spacing)
- [ ] Add skeleton loaders for all data-fetching pages
- [ ] Add confirmation dialogs for destructive actions
- [ ] Handle 409 conflicts gracefully in booking UI
- [ ] Add empty states with illustrations
- [ ] Responsive fixes (mobile + tablet)
- [ ] Toast notifications for all user actions
- [ ] Error boundaries for each portal section
- [ ] Test and fix: concurrent booking, leave notification, LLM failure recovery

### Afternoon (3–4 hrs) — Deployment & Documentation
- [ ] **Deploy**:
  - [ ] Frontend → Vercel
  - [ ] Backend → Render or Railway
  - [ ] PostgreSQL → Render or Supabase
  - [ ] Redis → Upstash
  - [ ] Configure env vars on all platforms
  - [ ] Verify all integrations in production
- [ ] **README.md**:
  - [ ] Project overview + tech stack
  - [ ] Local setup guide (step-by-step)
  - [ ] `.env.example` with all variables
  - [ ] API documentation (all endpoints)
  - [ ] Database schema diagram
  - [ ] LLM prompts used
  - [ ] Google Calendar setup steps
- [ ] **System Design Write-Up** (800 words max):
  - [ ] Double-booking prevention strategy
  - [ ] Doctor leave conflict handling
  - [ ] Slot hold mechanism
  - [ ] Notification failure handling
- [ ] Final end-to-end smoke test
- [ ] Push to GitHub with clean commit history

### Day 3 Deliverables
- ✅ Polished, responsive UI
- ✅ Hosted application URL working
- ✅ GitHub repo with README and all documentation
- ✅ System design write-up complete

---

## Priority Tiers (If Running Out of Time)

If time gets tight, here's what to cut vs. protect:

### 🔴 Must Ship (P0)
- Auth (all 3 roles)
- Doctor CRUD + schedule management
- Slot booking with double-booking prevention
- Pre-visit & post-visit LLM summaries
- Basic email notifications (confirmation + cancellation)
- All 3 portal UIs functional
- Deployment + README

### 🟡 Should Ship (P1)
- Google Calendar integration
- Medication reminders
- Slot hold mechanism (5-min TTL)
- Leave auto-cancellation with patient notification
- Email retry mechanism
- Responsive design

### 🟢 Nice to Have (P2)
- Appointment rescheduling
- Skeleton loaders & micro-animations
- Empty state illustrations
- Husky pre-commit hooks
- API rate limiting

---

## Time-Saving Strategies

| Strategy | Impact |
|----------|--------|
| Build all DB tables in one migration (not incrementally) | Saves 1+ hr |
| Use ShadCN CLI to scaffold components (`npx shadcn-ui add`) | Saves 2+ hrs on UI |
| Use a single LLM service module for both prompts | Keeps AI code DRY |
| Template emails with simple HTML (skip fancy designs) | Saves 1 hr |
| Test with Postman during backend dev, wire up frontend after | Parallel workstreams |
| Deploy early on Day 2 evening, fix production bugs on Day 3 | Avoids last-minute deploy panic |
