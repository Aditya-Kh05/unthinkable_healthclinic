# Product Requirements Document (PRD)
## Healthcare Appointment & Follow-up Manager

---

## 1. Executive Summary

Build a full-stack healthcare appointment platform with dedicated portals for **Patients**, **Doctors**, and **Admins**. The system enables appointment booking with AI-powered symptom analysis, automated email notifications, Google Calendar integration, and medication reminders. The goal is to streamline the clinic workflow from booking to post-visit follow-up.

---

## 2. Problem Statement

Clinics currently rely on fragmented tools — manual booking, phone calls for reminders, and no structured symptom intake. This leads to:
- Double-booked appointment slots
- Doctors lacking context before patient visits
- Patients not understanding post-visit instructions
- Missed medication schedules
- No calendar integration, causing scheduling conflicts

---

## 3. Goals & Success Criteria

| Goal | Success Criteria |
|------|-----------------|
| Seamless appointment booking | Patient can search, select slot, and book in < 3 minutes |
| Zero double-bookings | DB-level constraints prevent any concurrent booking conflicts |
| AI-assisted clinical workflow | Pre-visit summary available to doctor before every appointment |
| Patient understanding | Post-visit summary is in plain language with clear medication schedule |
| Reliable notifications | > 99% email delivery rate with retry mechanism |
| Calendar sync | Google Calendar events created/updated/deleted within 30s of booking action |
| Leave handling | All affected patients notified within 5 minutes of leave being marked |

---

## 4. User Personas

### 4.1 Patient — Priya (28, Software Engineer)
- **Goal**: Book a doctor appointment quickly, share symptoms beforehand, get clear post-visit instructions
- **Pain points**: Forgetting medication schedules, unclear doctor notes, no calendar reminders
- **Needs**: Mobile-friendly booking, AI summary in simple language, medication reminders

### 4.2 Doctor — Dr. Sharma (45, Cardiologist)
- **Goal**: Know patient symptoms before the visit, document visit efficiently
- **Pain points**: No pre-visit context, manual note-taking, schedule conflicts during leave
- **Needs**: Pre-visit symptom summary with urgency level, quick post-visit notes form

### 4.3 Admin — Rajesh (35, Clinic Manager)
- **Goal**: Manage doctor profiles, schedules, and handle leave disruptions
- **Pain points**: Manual slot management, notifying patients of cancellations
- **Needs**: Doctor CRUD, schedule management, automated leave handling

---

## 5. Functional Requirements

### 5.1 Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-1 | Patient registration with email and password | P0 |
| AUTH-2 | Login for all roles (patient, doctor, admin) with JWT | P0 |
| AUTH-3 | Role-based access control — each portal restricted by role | P0 |
| AUTH-4 | Access token (15-min) + Refresh token (7-day) mechanism | P0 |
| AUTH-5 | Admin account pre-seeded, not self-registerable | P0 |
| AUTH-6 | Doctor accounts created by admin, not self-registerable | P0 |

### 5.2 Admin — Doctor Management

| ID | Requirement | Priority |
|----|-------------|----------|
| ADM-1 | Create doctor profile (name, email, specialisation, slot duration) | P0 |
| ADM-2 | Set working hours per day of week for each doctor | P0 |
| ADM-3 | Edit doctor profile and schedule | P0 |
| ADM-4 | Deactivate/reactivate doctor profile | P1 |
| ADM-5 | Mark doctor on leave for specific date(s) | P0 |
| ADM-6 | On leave marking: auto-cancel affected appointments | P0 |
| ADM-7 | On leave marking: auto-notify affected patients via email | P0 |
| ADM-8 | View all doctors with status overview | P0 |

### 5.3 Patient — Booking Flow

| ID | Requirement | Priority |
|----|-------------|----------|
| PAT-1 | Search doctors by specialisation | P0 |
| PAT-2 | View doctor profile with available dates | P0 |
| PAT-3 | View available time slots for a selected date | P0 |
| PAT-4 | Temporarily hold a slot while filling symptom form (5-min TTL) | P0 |
| PAT-5 | Fill symptom form (chief complaint, duration, severity, notes) | P0 |
| PAT-6 | Confirm booking and receive confirmation | P0 |
| PAT-7 | View list of upcoming appointments | P0 |
| PAT-8 | View list of past appointments | P0 |
| PAT-9 | Cancel an appointment | P0 |
| PAT-10 | Reschedule an appointment | P1 |
| PAT-11 | View post-visit summary and prescription | P0 |

### 5.4 Doctor — Visit Management

| ID | Requirement | Priority |
|----|-------------|----------|
| DOC-1 | View today's appointments with patient details | P0 |
| DOC-2 | View AI-generated pre-visit summary (urgency, complaint, questions) | P0 |
| DOC-3 | Submit post-visit clinical notes | P0 |
| DOC-4 | Enter prescription (medication, dosage, frequency, duration) | P0 |
| DOC-5 | Trigger AI generation of patient-friendly post-visit summary | P0 |
| DOC-6 | View upcoming schedule | P0 |
| DOC-7 | Mark appointment as completed | P0 |

### 5.5 AI / LLM Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| LLM-1 | Pre-visit: Analyse symptoms → urgency (Low/Medium/High), chief complaint, 3 suggested questions | P0 |
| LLM-2 | Post-visit: Clinical notes → patient-friendly summary with medication schedule and follow-up steps | P0 |
| LLM-3 | Store all LLM inputs and outputs in DB with timestamps | P0 |
| LLM-4 | Retry LLM call once on failure (2s delay) | P0 |
| LLM-5 | On persistent failure: flag as `llm_pending`, store raw input, do not crash | P0 |
| LLM-6 | Show user-friendly "generating..." state in UI during LLM processing | P1 |

### 5.6 Email Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| EMAIL-1 | Booking confirmation email to patient and doctor | P0 |
| EMAIL-2 | Appointment reminder email 24 hours before appointment | P0 |
| EMAIL-3 | Cancellation email on appointment cancellation | P0 |
| EMAIL-4 | Leave notification email to affected patients | P0 |
| EMAIL-5 | Post-visit summary email to patient | P1 |
| EMAIL-6 | Medication reminder email based on prescription frequency | P1 |
| EMAIL-7 | Email retry with exponential backoff (max 3 retries) | P0 |
| EMAIL-8 | Log all email send attempts with status | P0 |

### 5.7 Google Calendar Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| CAL-1 | OAuth 2.0 flow for patient and doctor calendar authorization | P0 |
| CAL-2 | Create Google Calendar event for both on booking | P0 |
| CAL-3 | Update Google Calendar event on reschedule | P0 |
| CAL-4 | Delete Google Calendar event on cancellation | P0 |
| CAL-5 | Handle token refresh automatically | P0 |
| CAL-6 | Store calendar event IDs for sync tracking | P0 |

### 5.8 Concurrency & Conflict Handling

| ID | Requirement | Priority |
|----|-------------|----------|
| CON-1 | UNIQUE constraint on (doctor_id, date, start_time) in appointments | P0 |
| CON-2 | Slot hold with UNIQUE constraint on (doctor_id, date, start_time) | P0 |
| CON-3 | Booking executed inside SERIALIZABLE transaction | P0 |
| CON-4 | Return 409 Conflict on double-booking attempt | P0 |
| CON-5 | Slot hold expires after 5 minutes via background job | P0 |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | API response time < 500ms for standard operations |
| **Availability** | System should handle graceful degradation (LLM down → booking still works) |
| **Security** | Passwords bcrypt hashed, JWT auth, role-based access, input sanitization |
| **Scalability** | Background jobs decouple heavy operations from API response |
| **Reliability** | Email and calendar operations are idempotent and retryable |
| **Data Integrity** | All booking operations are transactional |
| **Observability** | Structured logging for all critical operations |

---

## 7. LLM Prompts

### Pre-Visit Summary Prompt
```
Analyse these symptoms and return:
- Urgency level (Low / Medium / High)
- Chief complaint (one line)
- Three suggested questions for the doctor

Symptoms: <symptoms>
```

### Post-Visit Summary Prompt
```
Convert these clinical notes into a patient-friendly summary with:
- Diagnosis in simple terms
- Medication schedule (table format: medication, dosage, frequency, duration)
- Follow-up steps and date

Clinical Notes: <notes>
```

---

## 8. API Overview

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register patient | Public |
| POST | `/api/v1/auth/login` | Login (all roles) | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| POST | `/api/v1/auth/logout` | Logout | Auth |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/admin/doctors` | Create doctor profile | Admin |
| GET | `/api/v1/admin/doctors` | List all doctors | Admin |
| PUT | `/api/v1/admin/doctors/:id` | Update doctor profile | Admin |
| DELETE | `/api/v1/admin/doctors/:id` | Deactivate doctor | Admin |
| POST | `/api/v1/admin/doctors/:id/schedule` | Set working hours | Admin |
| POST | `/api/v1/admin/doctors/:id/leave` | Mark doctor on leave | Admin |

### Patient
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/doctors` | Search doctors by specialisation | Patient |
| GET | `/api/v1/doctors/:id/slots` | Get available slots for a date | Patient |
| POST | `/api/v1/appointments/hold` | Hold a slot (5-min TTL) | Patient |
| POST | `/api/v1/appointments` | Confirm booking with symptoms | Patient |
| GET | `/api/v1/appointments` | List my appointments | Patient |
| PUT | `/api/v1/appointments/:id/cancel` | Cancel appointment | Patient |
| PUT | `/api/v1/appointments/:id/reschedule` | Reschedule appointment | Patient |

### Doctor
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/doctor/appointments` | List my appointments | Doctor |
| GET | `/api/v1/doctor/appointments/:id/summary` | View pre-visit summary | Doctor |
| POST | `/api/v1/doctor/appointments/:id/complete` | Submit notes & prescription | Doctor |

### Calendar
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/calendar/auth` | Start Google OAuth flow | Auth |
| GET | `/api/v1/calendar/callback` | OAuth callback | Public |

---

## 9. Database Schema (Key Tables)

```sql
-- Users table (shared auth)
users (id, email, password_hash, role, name, phone, created_at, updated_at)

-- Doctor profile
doctors (id, user_id FK, specialisation, slot_duration_mins, is_active, created_at)

-- Doctor working hours
doctor_schedules (id, doctor_id FK, day_of_week, start_time, end_time)

-- Doctor leave
doctor_leaves (id, doctor_id FK, leave_date, reason, created_at)

-- Appointments
appointments (id, patient_id FK, doctor_id FK, date, start_time, end_time, status, created_at, updated_at)
-- status: slot_held | confirmed | completed | cancelled | cancelled_by_leave

-- Slot holds (temporary)
slot_holds (id, doctor_id FK, patient_id FK, date, start_time, held_at, expires_at)

-- Pre-visit summaries
pre_visit_summaries (id, appointment_id FK, symptoms_raw, urgency, chief_complaint, suggested_questions, llm_status, created_at)

-- Post-visit summaries
post_visit_summaries (id, appointment_id FK, clinical_notes, patient_summary, llm_status, created_at)

-- Prescriptions
prescriptions (id, appointment_id FK, medication_name, dosage, frequency, duration_days, created_at)

-- Medication reminders
medication_reminders (id, prescription_id FK, patient_id FK, scheduled_at, sent_at, status)

-- Notifications log
notifications (id, user_id FK, type, channel, status, retry_count, sent_at, created_at)

-- Calendar events
calendar_events (id, appointment_id FK, user_id FK, google_event_id, status, created_at)
```

---

## 10. Deliverables

1. **GitHub Repository** with clean commit history and organized code
2. **README.md** with:
   - Setup guide (step-by-step local development)
   - `.env.example` with all required variables
   - API documentation
   - Database schema
   - LLM prompts used
   - Google Calendar setup steps
3. **Hosted Application URL** (deployed on Vercel + Render/Railway)
4. **System Design Write-Up** (800 words max) covering:
   - Double-booking prevention
   - Doctor leave conflict handling
   - Slot hold mechanism
   - Notification failure handling

---

## 11. Evaluation Criteria

| Area | Weight | Focus |
|------|--------|-------|
| **Problem Solving** | High | Slot conflicts, leave management, notification reliability |
| **LLM Integration** | High | Prompt quality, failure handling, output storage |
| **Database Design** | High | Schema normalization, indexing, constraints |
| **API Design** | Medium | RESTful conventions, status codes, validation |
| **Code Quality** | Medium | Structure, readability, separation of concerns |
| **Email & Calendar** | Medium | Integration completeness, error handling |
| **Documentation** | Medium | Clarity, completeness, setup ease |

---

## 12. Out of Scope (v1)

- Real-time chat between patient and doctor
- Video consultation
- Payment processing
- Multi-clinic / multi-tenant support
- Mobile native app (React Native)
- SMS notifications (email only for v1)
- Doctor self-registration
- Patient reviews and ratings
