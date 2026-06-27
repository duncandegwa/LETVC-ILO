# LETVC ILO — Industrial Attachment Management System

> **Laikipia East Technical and Vocational College**
> Industrial Liaison Office — *Enhancing Competence*

A full-stack, production-ready web application for managing industrial attachment placement, trainer assignment, monitoring, and assessment.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth | Firebase Authentication |
| Database | Supabase PostgreSQL |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Deployment | Vercel |

---

## Features

### Roles
- **Administrator** — Full system access
- **Trainer** — View/assess assigned students only
- **Student** — View/submit own attachment details only

### Admin
- Create & manage student and trainer accounts with temporary passwords
- Assign trainers to students (one trainer per student)
- Monitor all attachments across counties
- Generate CSV reports (all students, attached, pending, assessed, by county, by trainer)
- View audit logs of all system actions
- Dashboard with statistics and charts

### Student
- Submit industrial attachment registration form
- View assigned trainer contact details
- Track assessment status (PENDING to ASSESSED)
- Change password

### Trainer
- View all assigned students with attachment details
- Update assessment status and add remarks
- Filter students by county, course, status

---

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd letvc-ilo
npm install
```

### 2. Set Up Supabase

1. Go to supabase.com and create a new project
2. Open the SQL Editor in your Supabase dashboard
3. Copy the contents of supabase-schema.sql and run it
4. Go to Settings > API and copy your Project URL and anon key

### 3. Set Up Firebase

1. Go to console.firebase.google.com
2. Create a new project, enable Authentication, enable Email/Password provider
3. Go to Project Settings > Your apps > Add web app
4. Copy the Firebase config values

### 4. Configure Environment Variables

Fill in .env.local with your actual values:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourproject
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 5. Create the First Admin Account

1. In Firebase Console > Authentication > Users > Add user
   - Email: admin@letvc.ac.ke
   - Password: Admin@Letvc2024 (change after first login)

2. In Supabase SQL Editor run:
```sql
INSERT INTO users (email, role) VALUES ('admin@letvc.ac.ke', 'admin');
```

### 6. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Creating Student and Trainer Accounts

Admin creates all accounts:

For Students:
1. Admin goes to Dashboard > Students > Add Student
2. Fills in all student details
3. System generates temporary password shown in the form
4. Admin creates matching Firebase user with same email + temp password
5. Admin shares credentials with student
6. Student logs in and changes password in Settings

For Trainers:
1. Admin goes to Dashboard > Trainers > Add Trainer
2. Same process as students

Note: For production, set up Firebase Admin SDK API route to auto-create Firebase users (see Advanced Setup in README).

---

## Deployment on Vercel

1. Push to GitHub
2. Go to vercel.com > New Project > Import your repo
3. Add all environment variables
4. Click Deploy
5. Add your Vercel domain to Firebase Authorized Domains

---

## Project Structure

```
src/
  app/
    login/              Login and password reset
    dashboard/
      page.tsx          Main dashboard (role-aware)
      students/         Admin: student management
      trainers/         Admin: trainer management
      assignments/      Admin: trainer-student assignments
      attachments/      Admin: attachment monitoring
      reports/          Admin: CSV report downloads
      audit-logs/       Admin: system audit trail
      my-students/      Trainer: assigned students + assessments
      my-attachment/    Student: submit/edit attachment
      my-trainer/       Student: view assigned trainer
      my-assessment/    Student: view assessment status
      settings/         All roles: change password
  components/
    layout/             DashboardLayout with sidebar + topbar
    ui/                 Button, Input, Card, Table, Modal, Badge
  contexts/             Auth and Theme contexts
  lib/                  Firebase and Supabase clients
  services/             All data access functions
  types/                TypeScript interfaces
  utils/                Helpers, Kenya counties, courses list
```

---

## Color Palette

- LETVC Green: #4a7c2f (primary, buttons, active nav)
- LETVC Amber: #d4a017 (secondary, accents)
- Success green: Assessed status badges
- Warning amber: Pending status badges

---

## Security

- Firebase Authentication secures all login flows
- Supabase RLS controls database access
- Role-based routing prevents unauthorized access
- Zod validation on all forms
- Audit logs record every important system action
- Temporary passwords force change on first login

---

(c) 2024 Laikipia East Technical and Vocational College. All rights reserved.
