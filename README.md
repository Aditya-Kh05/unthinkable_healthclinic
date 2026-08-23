# HealthClinic: AI-Powered Appointment Manager

HealthClinic is a full-stack, AI-driven healthcare appointment management system designed to streamline the patient-doctor experience. 

It features three distinct portals (Patient, Doctor, Admin) and utilizes advanced capabilities like Google Gemini AI for pre-visit and post-visit medical summaries, BullMQ for background job processing, and Google Calendar OAuth integration for seamless scheduling.

## 🌐 Live Deployments
- **Frontend (Vercel):** [https://unthinkable-healthclinic.vercel.app](https://unthinkable-healthclinic.vercel.app)
- **Backend API (Render):** [https://unthinkable-healthclinic.onrender.com](https://unthinkable-healthclinic.onrender.com)
- **Database:** Neon Serverless PostgreSQL
- **Redis Queue:** Upstash Redis
## 🚀 Key Features

### 👤 Patient Portal
- **Smart Doctor Search:** Filter doctors by specialisation.
- **Real-time Slot Booking:** Secure 5-minute slot holds to prevent double-booking conflicts.
- **Pre-visit Symptom Capture:** Submit symptoms during booking. An AI (Gemini) analyzes the symptoms and extracts the chief complaint, urgency level, and suggests questions to ask the doctor.
- **Email Notifications:** Automated emails for booking confirmations, cancellations, and doctor leaves.

### 🩺 Doctor Portal
- **Intelligent Dashboard:** View today's appointments highlighted with AI-determined urgency badges (e.g., High Urgency).
- **AI Consultation Assist:** Read the AI-generated pre-visit summary before the patient walks in.
- **Post-visit Automation:** Doctors submit raw clinical notes and prescriptions. The AI automatically rewrites them into a warm, patient-friendly summary and emails it to the patient.
- **Medication Reminders:** Prescriptions automatically schedule delayed background jobs (BullMQ) to send daily medication reminder emails to the patient.

### ⚙️ Admin Portal
- **Doctor Management:** Full CRUD interface for adding, editing, and deleting doctor profiles.
- **Schedule Management:** Set working hours and days for doctors.
- **Leave Management:** Mark doctor leave days. The system automatically cancels affected appointments and emails the patients.

## 🛠️ Technology Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, TanStack Query, Zustand, React Hook Form, Zod.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, BullMQ.
- **Database:** PostgreSQL (Neon.tech), Redis (Upstash).
- **Integrations:**
  - Google Gemini AI (1.5 Flash) for intelligent text summarization.
  - SendGrid / Nodemailer for email delivery.
  - Google Calendar OAuth 2.0 API for syncing appointments.

## 📦 Local Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- A free [Neon.tech](https://neon.tech/) PostgreSQL database
- A free [Upstash](https://upstash.com/) Redis database
- A free [Google AI Studio](https://aistudio.google.com/) Gemini API Key

### 2. Clone the Repository
\`\`\`bash
git clone <your-repo-url>
cd healthclinic
\`\`\`

### 3. Backend Setup
\`\`\`bash
cd server
npm install
\`\`\`

Create a \`.env\` file in the \`server\` directory based on \`.env.example\`:
\`\`\`env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require"
JWT_ACCESS_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
REDIS_URL="rediss://default:password@endpoint.upstash.io:6379"
GEMINI_API_KEY="your-gemini-key"
EMAIL_FROM="noreply@healthclinic.com"
\`\`\`

Run database migrations and seed the admin user:
\`\`\`bash
npx prisma db push
npm run seed
\`\`\`

Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 4. Frontend Setup
Open a new terminal window:
\`\`\`bash
cd client
npm install
\`\`\`

Create a \`.env.local\` file in the \`client\` directory:
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
\`\`\`

Start the frontend server:
\`\`\`bash
npm run dev
\`\`\`

The application will be available at [http://localhost:3000](http://localhost:3000).

## 🔒 Default Login Credentials
After running the seed script, you can log in as an admin to create doctors:
- **Admin Email:** \`admin@healthclinic.com\`
- **Password:** \`Admin@123\`

## 🏗️ Architecture Note on Background Jobs
This project utilizes **BullMQ** and **Redis** to ensure reliability. Email notifications and medication reminders are pushed to a background queue. This prevents the main API thread from blocking, and provides robust exponential backoff retries in case an external API (like SendGrid) temporarily fails.
