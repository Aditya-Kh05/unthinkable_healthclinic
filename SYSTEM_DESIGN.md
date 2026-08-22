# System Design & Architecture: HealthClinic

This document outlines the core architectural decisions and problem-solving approaches implemented in the HealthClinic system. The system was designed with a heavy emphasis on data integrity, concurrency control, and resilience against third-party failures.

## 1. Concurrency Control: Slot Holds & Double-Booking Prevention

One of the most critical challenges in an appointment booking system is handling concurrent users attempting to book the same time slot. Without proper concurrency control, a double-booking conflict occurs.

### The Problem
If Patient A and Patient B both see a 10:00 AM slot available and click "Book" simultaneously, a naive system might read the database state as "available" for both, allowing two inserts for the same slot.

### The Solution: The Slot Hold Mechanism
To solve this, we implemented a **2-Phase Booking Protocol** utilizing database-level transaction locking.

**Phase 1: The Hold (Optimistic Concurrency & Expiration)**
When a patient selects a time slot, the frontend sends a request to "hold" the slot. The backend inserts a record into a dedicated `SlotHold` table with an expiration timestamp set to 5 minutes in the future. 
Crucially, before inserting the hold, the database queries for any existing valid holds or confirmed appointments for that specific doctor and time. Because PostgreSQL handles this within a transaction, it guarantees that only the first request successfully creates the `SlotHold`. Subsequent requests immediately return an error to the user stating the slot is currently reserved.

**Phase 2: The Booking (Atomic Verification)**
The patient has 5 minutes to fill out their pre-visit symptoms and submit the final booking. When the booking request hits the server, the backend verifies the `holdId`. 
If the hold is valid and hasn't expired, a database transaction is initiated. The transaction atomically:
1. Creates the `Appointment` record.
2. Deletes the `SlotHold` record.

If the 5 minutes expire before the patient finishes, the hold naturally invalidates, and a periodic cleanup job purges expired holds, returning the slot to the global pool. This prevents malicious users from hoarding slots while ensuring genuine users have a stress-free checkout experience.

## 2. Dynamic Schedule Overrides: Doctor Leave Conflict Handling

Doctors have dynamic lives, and emergency leaves are inevitable. The system must gracefully handle scenarios where a doctor marks themselves as unavailable on a date where patients have already booked appointments.

### The Problem
If a doctor submits a leave request for tomorrow, all appointments scheduled for tomorrow must be automatically cancelled, and the patients must be promptly notified to reschedule.

### The Solution: Event-Driven Leave Resolution
When an admin or doctor inserts a record into the `DoctorLeave` table, an event-driven workflow is triggered:
1. **Query Affected State:** The system immediately queries the `Appointment` table for any records where `doctorId` matches and the date falls on the leave date, filtering for `status = 'CONFIRMED'`.
2. **Atomic Status Update:** Using a Prisma bulk update transaction, all affected appointments are transitioned from `CONFIRMED` to `CANCELLED` in a single atomic operation. This ensures data consistency.
3. **Queue Notifications:** Rather than sending emails synchronously (which would block the HTTP response and potentially time out if there are dozens of appointments), the system pushes a cancellation notification job to a BullMQ message queue for each affected patient.
4. **Google Calendar Sync:** If the doctor has connected their Google Calendar, a background worker uses the stored OAuth tokens to issue delete requests to the Google Calendar API, removing the cancelled events from the doctor's schedule.

## 3. Resilience: Handling Notification Failures

Healthcare systems rely heavily on communication. If a patient is not notified of a cancellation or a medication reminder fails to send, the consequences can be severe.

### The Problem
Sending emails via third-party providers (like SendGrid or AWS SES) involves network calls. These external APIs can experience rate-limiting, temporary outages, or network timeouts. A naive inline `await sendEmail()` approach will fail permanently if the API hiccups, silently dropping the notification.

### The Solution: Robust Queuing with BullMQ
To guarantee delivery, we decoupled the notification logic from the main application thread using **BullMQ** backed by **Redis**.

**Exponential Backoff Strategy:**
When an event requires an email (e.g., booking confirmation, AI summary generation, or a daily medication reminder), the backend does not send the email directly. Instead, it pushes a JSON payload containing the email parameters to the Redis-backed BullMQ queue.

A dedicated background worker continuously polls this queue. When it processes a job, it attempts to call the SendGrid API. If the SendGrid API returns a 5xx error or times out, the worker catches the exception. 
Crucially, the job is configured with an **Exponential Backoff** retry strategy (maximum 3 attempts). 
- Attempt 1: Immediate failure.
- Attempt 2: Waits 5 seconds before retrying.
- Attempt 3: Waits 25 seconds before retrying.

This handles temporary network blips gracefully. If the job fails after all retries, it is moved to a "Dead Letter Queue" (DLQ) in Redis, where an admin can manually inspect the failure logs and requeue the message once the third-party service is restored.

Furthermore, for **Medication Reminders**, we utilize BullMQ's native delayed jobs feature. When a doctor issues a 5-day prescription, the system calculates the timestamps for 9:00 AM over the next 5 days and pushes 5 separate delayed jobs into the queue. They sit quietly in Redis until their specific timestamp arrives, at which point the worker wakes up and delivers the reminder.

## Summary

By leveraging Postgres transactions for slot holds, BullMQ for guaranteed asynchronous job execution, and an event-driven architecture for schedule conflicts, HealthClinic transforms from a fragile prototype into a robust, production-ready system capable of handling high concurrency and external API failures with grace.
