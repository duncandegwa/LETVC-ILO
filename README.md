# LETVC ILO — Industrial Attachment Management System

**Laikipia East Technical and Vocational College**
Industrial Liaison Office — *Enhancing Competence*

---

## Table of Contents

1. [What this system does](#what-this-system-does)
2. [Technology stack](#technology-stack)
3. [Running locally (step by step)](#running-locally)
4. [Deploying to Vercel (step by step)](#deploying-to-vercel)
5. [Creating accounts](#creating-accounts)
6. [Role guide](#role-guide)
7. [Troubleshooting](#troubleshooting)

---

## What this system does

LETVC ILO manages the full lifecycle of industrial attachment for students:

- **Admin** creates student and trainer accounts, assigns trainers to students, monitors all attachments across Kenya, downloads reports, and views audit logs
- **Students** submit their attachment details (industry, location, supervisor), view their assigned trainer, track their assessment status, and chat privately with their trainer
- **Trainers** view all their assigned students with full attachment details and specific areas, conduct assessments, and chat privately with each student

Every student-trainer chat is completely private — no other student or trainer can see it.

---

## Technology Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Authentication | Firebase Authentication |
| Database | Supabase PostgreSQL |
| Realtime chat | Supabase Realtime |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Hosting | Vercel |

---

## Running Locally

Follow every step in order. Do not skip any step.

### Step 1 — Install Node.js

Go to **nodejs.org** and download the LTS version (version 18 or newer).

After installing, open your terminal and check it worked:

```
node --version
```

You should see something like `v20.11.0`. If you see a number, Node.js is installed correctly.

---

### Step 2 — Extract the project

Download `letvc-ilo-source.tar.gz` from this chat.

**On Windows:**
Right-click the file → Extract All. You will get a folder called `letvc-ilo`.

**On Mac or Linux:**
Open Terminal and run:
```
tar -xzf letvc-ilo-source.tar.gz
```

Open the `letvc-ilo` folder in VS Code (download VS Code free from code.visualstudio.com).

---

### Step 3 — Set up Supabase

Supabase is the free database that stores all your data.

**Create your project:**

1. Go to **supabase.com** and sign up for a free account
2. Click **New Project**
3. Name: `letvc-ilo`
4. Choose a strong database password and save it somewhere
5. Region: choose the closest to Kenya (e.g. Europe West)
6. Click **Create New Project** and wait 2 minutes

**Run the main database schema:**

1. In your Supabase project, click **SQL Editor** in the left menu
2. Click **New Query**
3. Open the file `supabase-schema.sql` from your project folder
4. Select all the text (Ctrl+A on Windows, Cmd+A on Mac)
5. Copy it (Ctrl+C)
6. Paste it into the Supabase SQL editor
7. Click the green **Run** button
8. You should see: `Success. No rows returned`

**Run the chat schema:**

1. Click **New Query** again
2. Open `chat-schema.sql` from your project folder
3. Copy all the text and paste into Supabase SQL editor
4. Click **Run**

**Enable Realtime for chat:**

1. In Supabase, click **Database** in the left menu
2. Click **Replication**
3. Find `chat_messages` in the table list and toggle it ON
4. Find `chat_conversations` and toggle it ON

**Get your Supabase keys:**

1. Click **Settings** (gear icon) in the left menu
2. Click **API**
3. Copy these three values and save them in a text file:
   - **Project URL** — looks like `https://abcxyz.supabase.co`
   - **anon public** key — long string starting with `eyJ`
   - **service_role** key — another long string (keep this private)

---

### Step 4 — Set up Firebase

Firebase handles all login and password functions.

**Create your project:**

1. Go to **console.firebase.google.com**
2. Sign in with a Google account
3. Click **Add Project**
4. Name it `letvc-ilo`
5. Disable Google Analytics (not needed)
6. Click **Create Project** and wait

**Enable Email/Password login:**

1. In the left menu click **Authentication**
2. Click **Get Started**
3. Click **Email/Password**
4. Switch the first toggle ON
5. Click **Save**

**Get your Firebase config:**

1. Click the gear icon next to **Project Overview** → **Project Settings**
2. Scroll down to **Your apps**
3. Click the `</>` web icon
4. App nickname: `letvc-ilo-web`
5. Do NOT check Firebase Hosting
6. Click **Register app**
7. You will see a block of code with your config values. Copy them.

**Create the first Admin user in Firebase:**

1. Click **Authentication** in the left menu
2. Click the **Users** tab
3. Click **Add user**
4. Email: `admin@letvc.ac.ke`
5. Password: `Admin@Letvc2024`
6. Click **Add User**

---

### Step 5 — Register admin in Supabase

Go back to Supabase → SQL Editor → New Query and run this:

```sql
INSERT INTO users (email, role)
VALUES ('admin@letvc.ac.ke', 'admin');
```

Click **Run**.

---

### Step 6 — Fill in environment variables

In your `letvc-ilo` project folder, find the file called `.env.local`. Open it in VS Code and replace all the placeholder values with your real ones:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD-your-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=letvc-ilo.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=letvc-ilo
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=letvc-ilo.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

Rules for the env file:
- No quotes around values
- No spaces around the = sign
- No blank lines between values

Save the file.

---

### Step 7 — Install packages and run

Open a terminal inside the `letvc-ilo` folder. In VS Code go to **Terminal → New Terminal**.

Install all packages (do this once only):
```
npm install
```

Wait for it to finish (takes 1 to 3 minutes).

Start the development server:
```
npm run dev
```

You will see:
```
▲ Next.js
- Local: http://localhost:3000
✓ Ready
```

Open your browser and go to **http://localhost:3000**

You will see the LETVC ILO login page with the school logo.

Login with:
- Email: `admin@letvc.ac.ke`
- Password: `Admin@Letvc2024`

**Change the admin password immediately** after first login by going to Settings.

---

## Deploying to Vercel

Vercel hosts your app online so anyone can access it. It is free.

### Step 1 — Push code to GitHub

1. Create a free account at **github.com**
2. Click **New repository**
3. Name it `letvc-ilo`
4. Set it to Private
5. Click **Create repository**

In your terminal inside the project folder, run these commands one by one:

```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/letvc-ilo.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

---

### Step 2 — Deploy on Vercel

1. Go to **vercel.com** and create a free account (sign in with GitHub)
2. Click **Add New → Project**
3. Find your `letvc-ilo` repository and click **Import**
4. Framework Preset will auto-detect as **Next.js** — leave it as is
5. Click **Environment Variables** to expand it
6. Add each of the following one at a time by clicking **Add**:

| Name | Value |
|------|-------|
| NEXT_PUBLIC_SUPABASE_URL | your Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | your Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | your Supabase service role key |
| NEXT_PUBLIC_FIREBASE_API_KEY | your Firebase API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | your Firebase auth domain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | your Firebase project ID |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | your Firebase storage bucket |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | your sender ID |
| NEXT_PUBLIC_FIREBASE_APP_ID | your Firebase app ID |

7. Click **Deploy**
8. Wait 2 to 3 minutes
9. Vercel gives you a URL like `https://letvc-ilo.vercel.app`

---

### Step 3 — Allow your Vercel domain in Firebase

This is required or login will fail.

1. Go to Firebase Console → **Authentication** → **Settings** tab
2. Under **Authorized domains**, click **Add domain**
3. Type your Vercel URL: `letvc-ilo.vercel.app` (without https://)
4. Click **Add**

---

### Step 4 — Test the live site

Go to your Vercel URL and login with your admin credentials. Everything should work the same as locally.

Any time you make changes to the code and push to GitHub, Vercel will automatically redeploy within 2 minutes.

---

## Creating Accounts

The administrator creates all accounts. Students and trainers cannot register themselves.

### Creating a student account

**In LETVC ILO (admin dashboard):**
1. Go to **Students → Add Student**
2. Fill in all the student details
3. The form shows a generated temporary password like `Letvc@Ab3Xy7` — copy it
4. Click **Create Student**

**In Firebase Console:**
1. Go to **Authentication → Users → Add user**
2. Email: the same email you entered for the student
3. Password: the same temporary password shown in the form
4. Click **Add User**

Share the email and temporary password with the student securely.

The student logs in, then goes to **Settings** to change their password.

### Creating a trainer account

Same process as creating a student, but use the **Trainers** section instead.

### Assigning a trainer to a student

1. In admin dashboard, go to **Assignments**
2. Find the student in the table
3. Click **Assign** next to their name
4. Select the trainer from the dropdown
5. Click **Assign Trainer**

The student will immediately see their trainer when they go to **My Trainer**.
The trainer will see the student in their **My Students** list.

---

## Role Guide

### Administrator sees

- Dashboard with statistics and charts
- Students — create, edit, delete, search
- Trainers — create, edit, delete, activate/deactivate
- Assignments — assign or remove trainer per student
- Attachments — monitor all student attachments
- Reports — download CSV files
- Audit Logs — full activity history
- Settings — change password

### Student sees

- Dashboard welcome screen
- My Attachment — submit or edit attachment details
- My Trainer — view assigned trainer name, phone, email, and own attachment summary
- My Assessment — view assessment status (PENDING or ASSESSED) and trainer remarks
- Chat — private chat with assigned trainer
- Settings — change password

### Trainer sees

- Dashboard welcome screen
- My Students — all assigned students with full attachment details (industry, specific area, county, supervisor, dates)
- Assess students — update status to PENDING or ASSESSED, add remarks
- Chat — chat list with all assigned students, open individual chats
- Settings — change password

---

## Troubleshooting

**Login fails saying invalid credential**
The Firebase user must exist. Go to Firebase Console → Authentication → Users and check the email is there with the correct password.

**Student cannot see their trainer after assignment**
The assignment was saved but the student page was using the wrong lookup method. This has been fixed in the latest version. Make sure you are using the updated code.

**Trainer cannot see their students**
Same cause as above — fixed in the latest version. The trainer lookup now uses email instead of Firebase UID.

**Assignment shows as Unassigned after assigning**
This was a Supabase join parsing bug. The assignments page now uses two separate queries instead of a join. Pull the latest code.

**Chat messages not appearing in real time**
Make sure you enabled Replication for `chat_messages` and `chat_conversations` in Supabase → Database → Replication.

**Environment variable not working**
Stop the server with Ctrl+C, check `.env.local` has no quotes and no spaces around =, then run `npm run dev` again.

**Build error on Vercel**
Check all 9 environment variables are added in the Vercel project settings. Missing even one will cause the build to fail.

---

## Support

For technical issues contact the LETVC ICT Department.

© 2024 Laikipia East Technical and Vocational College. All rights reserved.
