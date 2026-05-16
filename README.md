# Trackr - Goal Tracking Portal

Trackr is an In-House Goal Setting & Tracking Portal built for an enterprise environment. It replaces spreadsheets and offline reviews with a structured, audit-ready digital workflow.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, TypeScript, PostgreSQL (pg)
- **Database**: Supabase (PostgreSQL)

## Project Structure
- `/frontend` - The React application
- `/backend` - The Node.js/Express API
- `/backend/supabase/migrations` - The SQL schema to set up the database

## Setup Instructions

### 1. Database Setup
1. Create a free project on [Supabase](https://supabase.com).
2. Go to the SQL Editor in Supabase and run the script found at `backend/supabase/migrations/001_initial_schema.sql`.
3. Copy your database connection string and add it to `backend/.env`.

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
npm run build
node dist/server.js
\`\`\`
*(Or run `npx ts-node src/server.ts` for development)*

### 3. Frontend Setup
In a separate terminal:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## Features
- **Role-Based Access Control**: Different dashboards for Employees, Managers, and Admins.
- **Goal Setting Validation**: Automatic weightage sum checks.
- **Quarterly Check-ins**: Dynamic progress score calculations based on Unit of Measurement (UoM).
- **Approval Workflow**: Managers can approve or request rework on team goal sheets.
