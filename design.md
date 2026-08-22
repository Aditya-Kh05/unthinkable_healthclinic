# Design Document — Healthcare Appointment & Follow-up Manager

## 1. Design Philosophy

- **Clean & Clinical**: A professional healthcare feel — trustworthy, accessible, and calming
- **Role-First Navigation**: Each portal (Patient, Doctor, Admin) has its own dedicated layout and navigation
- **Mobile-Responsive**: Patients primarily use mobile; doctors and admins use desktop
- **Accessibility**: WCAG 2.1 AA compliance — proper contrast, focus states, screen reader support

---

## 2. Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#2563EB` | Buttons, links, active states (Blue-600) |
| `--primary-dark` | `#1D4ED8` | Hover states (Blue-700) |
| `--primary-light` | `#DBEAFE` | Backgrounds, badges (Blue-100) |
| `--secondary` | `#10B981` | Success states, confirmations (Emerald-500) |
| `--warning` | `#F59E0B` | Medium urgency, pending states (Amber-500) |
| `--danger` | `#EF4444` | High urgency, errors, cancellations (Red-500) |
| `--neutral-50` | `#F8FAFC` | Page backgrounds |
| `--neutral-100` | `#F1F5F9` | Card backgrounds |
| `--neutral-200` | `#E2E8F0` | Borders, dividers |
| `--neutral-500` | `#64748B` | Secondary text |
| `--neutral-800` | `#1E293B` | Primary text |
| `--neutral-900` | `#0F172A` | Headings |

### Urgency Colors
| Level | Color | Badge Style |
|-------|-------|-------------|
| Low | `#10B981` (green) | Green background, dark green text |
| Medium | `#F59E0B` (amber) | Amber background, dark amber text |
| High | `#EF4444` (red) | Red background, dark red text |

---

## 3. Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings (H1) | Inter | 700 (Bold) | 30px / 1.875rem |
| Headings (H2) | Inter | 600 (Semibold) | 24px / 1.5rem |
| Headings (H3) | Inter | 600 (Semibold) | 20px / 1.25rem |
| Body | Inter | 400 (Regular) | 16px / 1rem |
| Small / Caption | Inter | 400 (Regular) | 14px / 0.875rem |
| Label | Inter | 500 (Medium) | 14px / 0.875rem |
| Button | Inter | 600 (Semibold) | 14px / 0.875rem |

---

## 4. Component Library (ShadCN UI based)

### Core Components
| Component | Usage |
|-----------|-------|
| `Button` | Primary, Secondary, Outline, Ghost, Destructive variants |
| `Card` | Appointment cards, doctor cards, summary cards |
| `Dialog / Modal` | Confirmation dialogs, symptom form, post-visit notes |
| `Form` | All input forms with validation |
| `Table` | Admin doctor list, appointment lists |
| `Badge` | Status indicators, urgency levels |
| `Calendar` | Date picker for booking |
| `Select` | Specialisation filter, time slot picker |
| `Tabs` | Portal section switching |
| `Toast` | Success/error notifications |
| `Skeleton` | Loading states |
| `Avatar` | Doctor profile pictures |

### Custom Components
| Component | Description |
|-----------|-------------|
| `DoctorCard` | Doctor photo, name, specialisation, rating, available slots count |
| `SlotPicker` | Visual time slot grid for a selected date |
| `SymptomForm` | Multi-field form for patient symptoms |
| `SummaryCard` | Formatted AI summary display (pre-visit and post-visit) |
| `AppointmentTimeline` | Chronological view of appointment lifecycle |
| `UrgencyBadge` | Color-coded urgency level indicator |
| `MedicationCard` | Prescription display with reminder schedule |
| `StatusStepper` | Visual progress of appointment status |

---

## 5. Page Layouts

### Shared Layout
```
┌─────────────────────────────────────────────────┐
│  Navbar: Logo | Portal Name | Notifications | ☰ │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌────────┐  ┌────────────────────────────────┐  │
│  │Sidebar │  │        Main Content            │  │
│  │(Desktop│  │                                │  │
│  │ only)  │  │                                │  │
│  │        │  │                                │  │
│  └────────┘  └────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Patient Portal Pages

#### Home / Doctor Search
```
┌──────────────────────────────────────────┐
│  Search Bar: [Search by specialisation ▼] │
│  Filters: Specialisation | Availability  │
├──────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Dr. Name │  │ Dr. Name │  │Dr. Name│ │
│  │ Spec     │  │ Spec     │  │ Spec   │ │
│  │ ★ 4.5   │  │ ★ 4.8   │  │ ★ 4.2 │ │
│  │[Book Now]│  │[Book Now]│  │[Book]  │ │
│  └──────────┘  └──────────┘  └────────┘ │
└──────────────────────────────────────────┘
```

#### Booking Flow
```
Step 1: Select Date  →  Step 2: Select Slot  →  Step 3: Symptom Form  →  Step 4: Confirm
```

#### My Appointments
```
┌──────────────────────────────────────────┐
│  Tabs: [Upcoming] [Past] [Cancelled]     │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │ 📅 Aug 25, 2026 · 10:00 AM       │  │
│  │ Dr. Smith · Cardiology            │  │
│  │ Status: ● Confirmed               │  │
│  │ [View Summary] [Reschedule] [Cancel]│ │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Doctor Portal Pages

#### Dashboard
```
┌──────────────────────────────────────────┐
│  Today's Overview                        │
│  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │  8   │  │  3   │  │  2   │           │
│  │Total │  │Seen  │  │Left  │           │
│  └──────┘  └──────┘  └──────┘           │
├──────────────────────────────────────────┤
│  Next Appointment                        │
│  ┌────────────────────────────────────┐  │
│  │ Patient: John Doe                  │  │
│  │ Time: 10:30 AM                     │  │
│  │ Urgency: 🔴 HIGH                  │  │
│  │ Chief Complaint: Chest pain...     │  │
│  │ [View Full Summary] [Start Visit]  │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  Upcoming Appointments (List)            │
└──────────────────────────────────────────┘
```

#### Post-Visit Notes Form
```
┌──────────────────────────────────────────┐
│  Patient: John Doe · Aug 25, 2026        │
├──────────────────────────────────────────┤
│  Clinical Notes:                         │
│  ┌────────────────────────────────────┐  │
│  │ [Rich text area]                   │  │
│  └────────────────────────────────────┘  │
│  Prescription:                           │
│  ┌────────────────────────────────────┐  │
│  │ Med Name | Dosage | Freq | Duration│  │
│  │ [+ Add Medication]                 │  │
│  └────────────────────────────────────┘  │
│  Follow-up Date: [Date Picker]           │
│                                          │
│  [Generate AI Summary & Save]            │
└──────────────────────────────────────────┘
```

### Admin Portal Pages

#### Doctor Management
```
┌──────────────────────────────────────────┐
│  [+ Add Doctor]                   [Search]│
├──────────────────────────────────────────┤
│  Name    │ Spec    │ Slots │ Status │ Act │
│  Dr.Smith│ Cardio  │ 30min │ Active │ ✎🗑 │
│  Dr.Jones│ Neuro   │ 20min │ Active │ ✎🗑 │
│  Dr.Lee  │ Ortho   │ 30min │ Leave  │ ✎🗑 │
└──────────────────────────────────────────┘
```

---

## 6. State & Interaction Design

### Appointment Status Flow
```
SLOT_HELD → CONFIRMED → COMPLETED
    │           │
    ▼           ▼
 EXPIRED    CANCELLED
            CANCELLED_BY_LEAVE
```

### Loading States
- Skeleton screens for lists and cards (never blank white pages)
- Spinner for form submissions
- Progress bar for multi-step booking flow

### Error States
- Inline validation errors below form fields
- Toast notifications for API errors
- Full-page error with retry button for critical failures
- "Slot no longer available" modal for booking conflicts

### Empty States
- Illustration + message for no appointments, no doctors found
- Clear call-to-action buttons to guide the user

---

## 7. Email Templates

| Email | Trigger | Content |
|-------|---------|---------|
| **Booking Confirmation** | Appointment created | Doctor name, date, time, location |
| **Appointment Reminder** | 24 hours before appointment | Same as above + symptom summary link |
| **Cancellation Notice** | Patient or system cancels | Reason, rebooking link |
| **Leave Notification** | Doctor marked on leave | Apology, cancelled appointment details, rebooking link |
| **Post-Visit Summary** | Doctor completes visit | AI summary, medication schedule, follow-up date |
| **Medication Reminder** | Based on prescription frequency | Medication name, dosage, time |

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav, cards stacked |
| Tablet | 640px – 1024px | Two column where appropriate |
| Desktop | > 1024px | Sidebar + main content, tables, full dashboard |

---

## 9. Accessibility

- All interactive elements focusable via keyboard
- ARIA labels on icons, badges, and status indicators
- Color is never the sole indicator (always paired with text/icon)
- Minimum contrast ratio 4.5:1 for text
- Focus visible outlines on all interactive elements
- Screen reader announcements for toast notifications
