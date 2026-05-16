# System Architecture
## In-House Goal Setting & Tracking Portal
**AtomQuest Hackathon 1.0 | MERN + Supabase PostgreSQL | Version 1.0 | May 2026**

---

## 1. Architecture Overview

The system uses a **three-tier architecture** with a React SPA as the client layer, a Node.js/Express REST API as the application layer, and Supabase PostgreSQL as the data layer. The design is stateless, horizontally scalable, and cloud-deployable using free-tier services for the hackathon.

### High-Level Architecture

```
+------------------------------------------------------------------+
|                        CLIENT LAYER                              |
|                                                                  |
|   +------------+   +-----------------+   +------------------+   |
|   |  Employee  |   |   Manager (L1)  |   |   Admin / HR     |   |
|   |   Portal   |   |    Dashboard    |   |   Control Panel  |   |
|   +------------+   +-----------------+   +------------------+   |
|              React 18 + Vite + Tailwind CSS                      |
|              React Router, Axios, React Query                    |
+------------------------------+-----------------------------------+
                               | HTTPS / REST API
                               v
+------------------------------------------------------------------+
|                       APPLICATION LAYER                          |
|                  Node.js + Express + TypeScript                  |
|                                                                  |
|  +-------------------------------------------------------------+ |
|  |                     API Middleware Stack                    | |
|  |  Auth (JWT) -> Role Guard -> Window Guard -> Validation     | |
|  +-------------------------------------------------------------+ |
|                                                                  |
|  +--------------+  +--------------+  +----------------------+   |
|  | Goal Workflow|  |  Approval    |  |   Shared Goal        |   |
|  |   Service    |  |  Service     |  |   Propagation Svc    |   |
|  +--------------+  +--------------+  +----------------------+   |
|                                                                  |
|  +--------------+  +--------------+  +----------------------+   |
|  |   Check-in   |  |   Reporting  |  |   Audit Logging      |   |
|  |   Service    |  |   Service    |  |   Service            |   |
|  +--------------+  +--------------+  +----------------------+   |
|                                                                  |
|  +--------------+  +--------------+                             |
|  | Notification |  |  Escalation  |   (Bonus features)         |
|  |  Worker      |  |  Job (Cron)  |                             |
|  +--------------+  +--------------+                             |
+------------------------------+-----------------------------------+
                               | SQL over TLS (pg driver)
                               v
+------------------------------------------------------------------+
|                          DATA LAYER                              |
|                    Supabase (PostgreSQL 15)                      |
|                                                                  |
|  +--------------+  +--------------+  +----------------------+   |
|  |  PostgreSQL  |  |  Supabase    |  |  Supabase Storage    |   |
|  |   Database   |  |    Auth      |  |  (exports, diagrams) |   |
|  +--------------+  +--------------+  +----------------------+   |
+------------------------------------------------------------------+
```

---

## 2. Component Architecture

### 2.1 Frontend (React)

#### Technology Choices

| Package | Purpose |
|---|---|
| `react` + `vite` | UI framework and fast dev build tooling |
| `react-router-dom` | Client-side hash/history-based routing |
| `@tanstack/react-query` | Server state, caching, and refetch management |
| `axios` | HTTP client with request interceptors for JWT |
| `tailwindcss` | Utility-first styling |
| `recharts` | Progress charts and analytics dashboards |
| `papaparse` / `xlsx` | CSV/Excel download for reports |
| `react-hook-form` | Form state and client-side validation |
| `zod` | Schema validation shared between frontend and backend |

#### Folder Structure

```
src/
├── api/             # Axios API calls, one file per resource
├── components/      # Shared UI components (Button, Table, Modal, Badge)
├── features/        # Feature modules, one folder per domain
│   ├── auth/
│   ├── goals/
│   ├── approvals/
│   ├── checkins/
│   ├── reports/
│   └── admin/
├── hooks/           # Custom React Query hooks
├── layouts/         # Role-specific layout wrappers (Employee, Manager, Admin)
├── pages/           # Route-level components
├── store/           # Global state (auth context, active cycle)
├── utils/           # Formatters, date helpers, score computation
└── types/           # Shared TypeScript interfaces
```

#### Role-Based Routing

```
/login                         Public (all roles)
/employee/goals                My Goal Sheet (role: employee)
/employee/checkins/:qtr        Quarterly Update Form
/manager/team                  Team Goal Sheets (role: manager)
/manager/approve/:sheetId      Approval Review
/manager/checkins              Check-in Dashboard
/admin/cycles                  Cycle & Window Config (role: admin)
/admin/users                   Org Hierarchy Management
/admin/reports                 Achievement Reports
/admin/audit                   Audit Trail Viewer
/admin/completion              Completion Dashboard
```

---

### 2.2 Backend (Express API)

#### Technology Choices

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `typescript` | Type safety across the entire backend |
| `pg` / `postgres.js` | PostgreSQL client for Supabase |
| `jsonwebtoken` | JWT signing and verification |
| `bcryptjs` | Password hashing (if not using Supabase Auth) |
| `zod` | Input validation for all request bodies |
| `node-cron` | Scheduled jobs for window management and escalations |
| `nodemailer` / `resend` | Email notifications (bonus) |
| `csv-writer` / `exceljs` | Report export generation |
| `cors`, `helmet`, `morgan` | Security headers, CORS, request logging |

#### Folder Structure

```
src/
├── config/          # DB connection, env config, Supabase client
├── middleware/      # authMiddleware, roleGuard, windowGuard, errorHandler
├── modules/
│   ├── auth/
│   ├── users/
│   ├── departments/
│   ├── cycles/
│   ├── goalSheets/
│   ├── goals/
│   ├── sharedGoals/
│   ├── approvals/
│   ├── checkins/
│   ├── reports/
│   ├── audit/
│   ├── notifications/  (bonus)
│   └── escalations/    (bonus)
├── jobs/            # Cron jobs: windowActivation, escalationCheck
├── utils/           # scoreComputer, auditWriter, reportBuilder
└── types/           # Shared TypeScript types and Zod schemas
```

#### Middleware Chain

Every protected route runs through the following chain:

```
Request
  -> cors()
  -> helmet()
  -> express.json()
  -> authMiddleware()         // Verify JWT, attach req.user
  -> roleGuard([...roles])    // Check req.user.role against allowed roles
  -> windowGuard(windowType)  // Check cycle_windows table for active window
  -> routeHandler()           // Business logic
  -> auditMiddleware()        // Log post-lock changes (on write routes)
  -> errorHandler()           // Centralized error response formatter
```

---

### 2.3 API Endpoints Reference

#### Auth

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, return JWT |
| POST | `/api/auth/logout` | Any | Invalidate session |
| GET | `/api/auth/me` | Any | Get current user profile |

#### Cycles & Windows (Admin)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/cycles` | Admin | List all cycles |
| POST | `/api/cycles` | Admin | Create a cycle |
| PATCH | `/api/cycles/:id` | Admin | Update cycle status |
| GET | `/api/cycles/:id/windows` | Admin | List windows for a cycle |
| POST | `/api/cycles/:id/windows` | Admin | Create/update a window |

#### Goal Sheets

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/goal-sheets/me/:cycleId` | Employee | Get own goal sheet |
| POST | `/api/goal-sheets` | Employee | Create a new goal sheet |
| POST | `/api/goal-sheets/:id/submit` | Employee | Submit for manager approval |
| GET | `/api/goal-sheets/team/:cycleId` | Manager | Get all direct report sheets |
| PATCH | `/api/goal-sheets/:id/approve` | Manager | Approve and lock |
| PATCH | `/api/goal-sheets/:id/rework` | Manager | Return for rework |
| POST | `/api/goal-sheets/:id/unlock` | Admin | Unlock a locked sheet |

#### Goals

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/goals` | Employee | Add a goal to draft sheet |
| PATCH | `/api/goals/:id` | Employee / Manager | Edit goal (pre-lock or inline) |
| DELETE | `/api/goals/:id` | Employee | Remove from draft sheet |

#### Shared Goals

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/shared-goals` | Admin / Manager | Create shared goal group |
| POST | `/api/shared-goals/:id/assign` | Admin / Manager | Assign to employees |
| GET | `/api/shared-goals/:cycleId` | Manager / Admin | List shared goals for a cycle |

#### Check-ins

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/checkins/me/:cycleId/:quarter` | Employee | Get own check-in for quarter |
| PUT | `/api/checkins/me/:cycleId/:quarter` | Employee | Save/submit quarter progress |
| GET | `/api/checkins/team/:cycleId/:quarter` | Manager | View team check-ins |
| POST | `/api/checkins/:id/comment` | Manager | Add structured comment |
| PATCH | `/api/checkins/:id/complete` | Manager | Mark manager review done |

#### Reports

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/reports/achievement` | Admin / Manager | Planned vs actual report |
| GET | `/api/reports/completion` | Admin / Manager | Check-in completion dashboard |
| GET | `/api/reports/achievement/export` | Admin / Manager | Download CSV/Excel |

#### Audit

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/audit` | Admin | Query audit log with filters |

---

## 3. Key Service Logic

### 3.1 Goal Submission Validation Service

On `POST /goal-sheets/:id/submit`, the backend runs in a single transaction:

```
1. Count goals in sheet -> REJECT if count > 8
2. Check each goal.weightage >= 10 -> REJECT if any fail
3. Sum all goal.weightage -> REJECT if sum != 100
4. Check active goal_setting window -> REJECT if closed
5. Set goal_sheet.status = 'submitted'
6. Insert into goal_approvals (action: 'submitted')
7. COMMIT
8. Trigger notification to manager
```

### 3.2 Approval Service

On `PATCH /goal-sheets/:id/approve`:

```
BEGIN TRANSACTION
1. Verify req.user is the direct manager of the goal sheet owner
2. Update goal_sheet.status = 'approved', approved_by, approved_at
3. UPDATE goals SET is_locked = TRUE WHERE goal_sheet_id = :id
4. Insert into goal_approvals (action: 'approved')
5. COMMIT
6. Trigger notification to employee
```

### 3.3 Shared Goal Progress Sync

On `PUT /checkins/me/:cycleId/:quarter` where goal is shared:

```
1. Save progress entry for the primary owner
2. Compute progress_score based on uom_type
3. SELECT all shared_goal_assignments WHERE shared_goal_group_id = :groupId
4. FOR EACH linked assignee:
   a. Find their quarterly_checkin for same cycle + quarter
   b. UPSERT goal_progress_entries with same actual_value, is_synced = TRUE
5. COMMIT all as one transaction
```

### 3.4 Progress Score Computation

Runs as a pure TypeScript utility before every `goal_progress_entries` insert:

```typescript
function computeScore(uomType, target, actual, deadline, completionDate) {
  switch (uomType) {
    case 'min_numeric':  return actual / target;
    case 'max_numeric':  return target / actual;
    case 'zero_based':   return actual === 0 ? 1.0 : 0.0;
    case 'timeline':     return computeTimelineScore(deadline, completionDate);
  }
}

function computeTimelineScore(deadline, completionDate) {
  if (!completionDate) return 0;
  const daysEarly = differenceInDays(deadline, completionDate);
  if (daysEarly >= 0)   return 1.0;   // On time or early
  if (daysEarly >= -7)  return 0.75;  // Up to 1 week late
  if (daysEarly >= -14) return 0.5;   // Up to 2 weeks late
  return 0.25;                         // More than 2 weeks late
}
```

### 3.5 Audit Logging Service

Triggered by Express middleware on any PATCH/DELETE to a locked entity:

```typescript
async function writeAuditLog({ entityType, entityId, fieldName,
                                oldValue, newValue, changedBy, reason }) {
  await db.query(
    `INSERT INTO audit_logs
     (entity_type, entity_id, field_name, old_value, new_value, changed_by, change_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [entityType, entityId, fieldName,
     JSON.stringify(oldValue), JSON.stringify(newValue), changedBy, reason ?? null]
  );
}
```

---

## 4. Deployment Architecture

### 4.1 Hackathon Deployment (Free Tier)

```
Internet
   |
   +---> Vercel (React Frontend)
   |       └── Static build served via Vercel CDN
   |
   +---> Render / Railway (Express Backend)
   |       └── Node.js web service (free tier)
   |       └── Environment variables: DATABASE_URL, JWT_SECRET, etc.
   |
   └---> Supabase (PostgreSQL)
           └── Managed PostgreSQL (free tier)
           └── Supabase Auth
           └── Supabase Storage (optional, for exports)
```

### 4.2 Environment Variables

```env
# Backend (.env)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service_role_key]
JWT_SECRET=[strong_random_secret]
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://your-app.vercel.app

# Frontend (.env)
VITE_API_URL=https://your-api.onrender.com/api
VITE_APP_TITLE=Goal Tracking Portal
```

### 4.3 Production-Ready Deployment (Post-Hackathon)

```
Cloudflare (CDN + DDoS)
   |
   +---> AWS CloudFront + S3 (React Frontend)
   |
   +---> AWS ECS Fargate (Express API, Auto-scaling behind ALB)
   |       └── Secrets from AWS Secrets Manager
   |
   └---> AWS RDS PostgreSQL or Supabase Pro
           └── Multi-AZ, automated backups
           └── Read replica for analytics queries
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
User submits email + password
  -> Express calls Supabase Auth (or bcrypt compare against users table)
  -> On success: generate JWT with { userId, role, email, exp }
  -> Return JWT to client
  -> Client stores JWT in memory (not localStorage -- avoids XSS)
  -> Client sends JWT as Authorization: Bearer <token> on every request
  -> authMiddleware verifies + decodes JWT on every protected route
```

### 5.2 Authorization Model (RBAC)

| Resource | Employee | Manager | Admin |
|---|---|---|---|
| Own goal sheet | CRUD (pre-lock) | Read only | Full + unlock |
| Team goal sheets | No access | Read + approve | Full |
| All goal sheets | No access | No access | Full |
| Cycle config | No access | No access | Full |
| Audit logs | No access | No access | Read |
| Reports | Own data only | Team data | All data |
| Shared goal create | No access | Yes | Yes |

### 5.3 Security Checklist

- All inputs validated with `zod` schemas before processing
- Parameterized SQL queries via `pg` driver (no string concatenation)
- `helmet.js` sets security headers (CSP, HSTS, etc.)
- CORS restricted to the frontend origin only
- Rate limiting on login endpoint via `express-rate-limit`
- JWT expiry set to 8 hours
- Admin unlock operations require an additional confirmation flag in the request body

---

## 6. Cron Jobs & Background Processing

| Job | Schedule | Action |
|---|---|---|
| `activateWindows` | Every hour | Check `cycle_windows.opens_at`, set `is_active = TRUE` |
| `closeWindows` | Every hour | Check `cycle_windows.closes_at`, set `is_active = FALSE` |
| `checkinReminder` | Daily 9 AM | Notify employees who haven't submitted in active window |
| `escalationCheck` | Daily 10 AM | Check N-day escalation conditions, create `escalations` rows |

All jobs run inside the Express process using `node-cron`. For production these would move to a separate worker service.

---

## 7. Data Flow: End-to-End User Journeys

### 7.1 Employee - Goal Creation to Lock

```
[React] Employee opens goal sheet form
  -> GET /api/cycles/active
  -> GET /api/goal-sheets/me/:cycleId
  -> POST /api/goals (repeat up to 8)
  -> POST /api/goal-sheets/:id/submit
      [Express] Validate: count <= 8, each weightage >= 10, sum = 100
      [Express] Check goal_setting window is active
      [DB] UPDATE goal_sheet.status = 'submitted'
      [DB] INSERT goal_approvals (submitted)
      [Notification] Notify manager
  -> [React] Sheet shows "Awaiting Approval" status
```

### 7.2 Manager - Approval Flow

```
[React] Manager opens Team Dashboard
  -> GET /api/goal-sheets/team/:cycleId
  -> GET /api/goals?sheetId=:id (view employee goals)
  -> PATCH /api/goals/:goalId (optional inline edit)
  -> PATCH /api/goal-sheets/:id/approve
      [Express] Verify manager is the L1 of sheet owner
      [DB] Transaction: update sheet status + lock all goals
      [DB] INSERT goal_approvals (approved)
      [Notification] Notify employee of approval
  -> [React] Sheet shows "Approved & Locked"
```

### 7.3 Employee - Quarterly Check-in

```
[React] Employee opens Q1 Check-in form (during active q1 window)
  -> GET /api/checkins/me/:cycleId/q1
  -> For each goal: fill actual value and status
  -> PUT /api/checkins/me/:cycleId/q1
      [Express] Validate active q1 window
      [Express] computeScore() for each goal entry
      [DB] UPSERT goal_progress_entries with scores
      [DB] If shared goal: fan-out sync to all assignees
      [DB] UPDATE quarterly_checkins.employee_status = 'submitted'
      [Notification] Alert manager to review
```

### 7.4 Admin - Unlock & Audit

```
[React] Admin requests unlock for a locked goal
  -> POST /api/goal-sheets/:id/unlock { reason: "Target corrected by HR" }
      [Express] Verify req.user.role === 'admin'
      [DB] Transaction:
           UPDATE goal.is_locked = FALSE
           UPDATE goal_sheet.status = 'approved'
           INSERT goal_approvals (unlocked_by_admin)
           INSERT audit_logs (field: 'is_locked', old: true, new: false)
  -> Admin edits goal
      [Express] auditMiddleware captures before/after diff
      [DB] INSERT audit_logs for each changed field
  -> GET /api/audit?entityId=:goalId
      -> Returns full change history
```

---

## 8. Tech Stack Summary

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Vercel |
| Backend | Node.js + Express + TypeScript | Render / Railway |
| Database | Supabase PostgreSQL 15 | Supabase |
| Auth | Supabase Auth + JWT | Supabase |
| File Storage | Supabase Storage | Supabase |
| Cron Jobs | node-cron (in-process) | Same as backend |
| Email (Bonus) | Resend / Nodemailer | External SMTP |
| Teams (Bonus) | MS Bot Framework or Webhooks | External |
| CI/CD | GitHub Actions | GitHub |

---

## 9. Hackathon Build Priority Order

| Phase | Features | Est. Time |
|---|---|---|
| 1 | Supabase setup, DB schema, Supabase Auth + JWT | 2-3 hrs |
| 2 | User roles, org hierarchy, cycle + window config | 2 hrs |
| 3 | Goal sheet CRUD + validation rules (weightage, count) | 3 hrs |
| 4 | Submission + Manager approval + locking | 3 hrs |
| 5 | Quarterly check-ins + progress score computation | 3 hrs |
| 6 | Shared goals + fan-out sync | 2 hrs |
| 7 | Audit trail + admin unlock | 1-2 hrs |
| 8 | Reports (achievement + completion dashboard) + CSV export | 2 hrs |
| 9 | Polish UI: role dashboards, validation UX, status badges | 2-3 hrs |
| 10 | Bonus: Notifications / Analytics / Escalations | If time permits |

**Core MVP (Phases 1-9) is achievable in approximately 24-25 hours of focused development.**
