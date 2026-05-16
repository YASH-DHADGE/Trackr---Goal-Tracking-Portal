# Software Requirements Specification (SRS)
## In-House Goal Setting & Tracking Portal
**AtomQuest Hackathon 1.0 | Version 1.0 | May 2026**

---

## 1. Introduction

### 1.1 Purpose
This document defines the software requirements for an In-House Goal Setting & Tracking Portal. It serves as the authoritative reference for the development team, covering all functional and non-functional requirements derived from the hackathon problem statement.

### 1.2 Scope
The system is a web-based portal that enables employees to set, submit, and track annual performance goals. Managers review and approve goals and conduct quarterly check-ins. Administrators configure cycles, manage exceptions, and monitor organizational completion rates. The portal replaces spreadsheets, emails, and offline review processes with a structured, audit-ready digital workflow.

### 1.3 Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth + JWT |
| Deployment | Vercel (frontend), Render (backend) |
| Version Control | GitHub |

### 1.4 Definitions & Acronyms
| Term | Definition |
|---|---|
| **Goal Sheet** | A collection of goals created by one employee for one review cycle |
| **Thrust Area** | A strategic category under which a goal is classified |
| **UoM** | Unit of Measurement — defines how goal progress is computed |
| **L1 Manager** | Direct reporting manager of an employee |
| **Cycle** | One annual review period (e.g., FY2026) |
| **Quarter** | Q1 (July), Q2 (October), Q3 (January), Q4 (March/April) |
| **Lock** | A state where a goal sheet becomes read-only after approval |
| **Audit Trail** | System log of all changes made to locked goals |

---

## 2. Overall Description

### 2.1 Product Perspective
The portal is a standalone web application integrated with Supabase as the managed PostgreSQL database. It exposes a RESTful API from a Node/Express backend consumed by a React single-page application.

### 2.2 Product Functions (Summary)
- Employee goal creation, validation, and submission
- Manager review, inline editing, approval, and rework workflow
- Shared/departmental goal assignment and propagation
- Quarterly achievement tracking with progress score computation
- Manager-led quarterly check-ins with structured comments
- Cycle window enforcement (goal setting and quarterly periods)
- Achievement report export (CSV/Excel)
- Completion dashboard for monitoring check-in status
- Full post-lock audit trail
- Admin controls: cycle config, org hierarchy, goal unlock

### 2.3 User Classes
| Role | Description |
|---|---|
| **Employee** | Individual contributor who creates, submits, and tracks personal goals |
| **Manager (L1)** | Reviews and approves employee goals; leads quarterly check-ins |
| **Admin / HR** | Configures the system, manages exceptions, monitors all data |

### 2.4 Constraints
- The portal must be accessible via a standard web browser (no desktop-only app)
- Must demonstrate complete user journeys for all three roles in a live demo
- Source code must be version-controlled and submitted via GitHub
- Architecture diagram must be included as a submission artifact

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

**FR-AUTH-01:** The system shall support login with email and password via Supabase Auth or JWT-based authentication.

**FR-AUTH-02:** The system shall enforce role-based access control (RBAC) for all API endpoints. Roles are `employee`, `manager`, and `admin`.

**FR-AUTH-03:** Employees shall not access other employees' goal sheets. Managers shall access only their direct reports' goal sheets.

**FR-AUTH-04 (Bonus):** The system may support Microsoft Entra ID (Azure AD) SSO with automatic org hierarchy sync and role mapping from AD groups.

---

### 3.2 Cycle & Window Management (Admin)

**FR-CYCLE-01:** An admin shall be able to create a review cycle with a name (e.g., FY2026), start date, and end date.

**FR-CYCLE-02:** An admin shall be able to configure cycle windows with a type, open date, and close date for each of the following: `goal_setting`, `q1`, `q2`, `q3`, `q4`.

**FR-CYCLE-03:** The system shall enforce that goal-related actions (creation, submission, achievement updates) are only permitted during the corresponding active window.

**Default Schedule:**
| Window | Opens |
|---|---|
| Goal Setting | 1st May |
| Q1 Check-in | July |
| Q2 Check-in | October |
| Q3 Check-in | January |
| Q4 / Annual | March / April |

---

### 3.3 Goal Creation (Employee)

**FR-GOAL-01:** An employee shall be able to create a goal sheet for the active review cycle.

**FR-GOAL-02:** For each goal, the employee shall provide:
- Thrust Area (selected from a configured list)
- Goal Title
- Goal Description
- Unit of Measurement (UoM): `Min Numeric`, `Max Numeric`, `Timeline`, or `Zero-Based`
- Target Value (numeric, text, or date depending on UoM)
- Weightage (integer, minimum 10%)

**FR-GOAL-03:** The system shall enforce the following validation rules server-side on submission:
- Total weightage across all goals in the sheet must equal exactly **100%**
- Each goal must have a minimum weightage of **10%**
- A maximum of **8 goals** are allowed per employee per cycle

**FR-GOAL-04:** Employees shall be able to add, edit, or delete goals while the sheet is in `draft` or `rework_requested` status.

**FR-GOAL-05:** Employees shall not be able to edit goals once the sheet status is `approved` or `locked`.

---

### 3.4 Goal Submission & Approval Workflow

**FR-APPR-01:** An employee shall be able to submit a goal sheet to their L1 manager for review.

**FR-APPR-02:** On submission, the system shall validate FR-GOAL-03 rules and reject the submission if any rule is violated.

**FR-APPR-03:** A manager shall be able to:
- View all goal sheets submitted by direct reports
- Edit goal targets and weightages inline during review
- Approve a goal sheet
- Return a goal sheet for rework with comments

**FR-APPR-04:** On manager approval:
- Goal sheet status shall change to `approved`
- All goals in the sheet shall be marked `is_locked = true`
- An approval event shall be recorded in `goal_approvals`
- The employee shall be notified

**FR-APPR-05:** On rejection (rework requested):
- Goal sheet status shall change to `rework_requested`
- The employee is notified with the manager's comments
- The employee may edit and resubmit

**FR-APPR-06:** An admin shall be able to unlock a locked goal sheet and specific goals for exception handling. All such unlock events must be recorded in the audit log.

---

### 3.5 Shared Goals

**FR-SHARED-01:** An admin or manager shall be able to create a shared/departmental KPI and push it to multiple employees.

**FR-SHARED-02:** Shared goals shall have a primary owner whose achievement updates propagate to all linked assignees.

**FR-SHARED-03:** Recipients of shared goals shall only be allowed to modify the weightage. The goal title and target value shall be read-only for recipients.

**FR-SHARED-04:** When the primary owner updates achievement for a shared goal, the system shall automatically sync that achievement to all linked assignee progress entries for the same quarter.

---

### 3.6 Quarterly Achievement Tracking (Employee)

**FR-TRACK-01:** During an active quarterly window, employees shall be able to enter actual achievement for each goal.

**FR-TRACK-02:** For each goal per quarter, the employee shall provide:
- Actual achievement value (numeric, text, or completion date depending on UoM)
- Status: `Not Started`, `On Track`, or `Completed`
- Optional remarks

**FR-TRACK-03:** The system shall compute a progress score for each goal entry based on UoM type:

| UoM Type | Formula | Description |
|---|---|---|
| Min (Numeric / %) | Achievement ÷ Target | Higher is better — e.g., Sales Revenue |
| Max (Numeric / %) | Target ÷ Achievement | Lower is better — e.g., TAT, Cost |
| Timeline | Completion Date vs. Deadline | Date-based completion scoring |
| Zero-Based | If actual = 0 → 100%, else 0% | Zero = success — e.g., Safety incidents |

**FR-TRACK-04:** Progress scores are for tracking visibility only and are not formal performance ratings.

---

### 3.7 Manager Check-In Module

**FR-CHECKIN-01:** During an active quarterly window, a manager shall be able to view planned vs. actual achievement data for all direct reports.

**FR-CHECKIN-02:** A manager shall be able to log a structured check-in comment per employee per quarter to document the discussion.

**FR-CHECKIN-03:** The system shall track check-in completion status per employee and per manager for each quarter.

---

### 3.8 Reporting & Governance

**FR-REPORT-01:** An admin or manager shall be able to export an achievement report in CSV/Excel format showing planned target vs. actual achievement for all employees.

**FR-REPORT-02:** A completion dashboard shall show real-time status of which employees and managers have completed each quarterly check-in.

**FR-REPORT-03:** The audit trail shall log all changes to goals made after the lock date. Each log entry must capture:
- Entity type and ID
- Field changed
- Old value
- New value
- Actor (who made the change)
- Timestamp

---

### 3.9 Notifications (Bonus)

**FR-NOTIF-01 (Bonus):** The system shall send automated email notifications for: goal submission, manager approval, manager rejection, and quarterly check-in reminders.

**FR-NOTIF-02 (Bonus):** Microsoft Teams bot or adaptive card notifications shall alert managers when a team member submits or updates a goal sheet.

**FR-NOTIF-03 (Bonus):** Notifications shall include deep links directly to the relevant goal sheet or check-in view.

---

### 3.10 Escalation Module (Bonus)

**FR-ESC-01 (Bonus):** Configurable escalation rules shall trigger notifications based on: employee not submitting goals within N days of cycle open; manager not approving within N days of submission; check-in not completed within the active window.

**FR-ESC-02 (Bonus):** Escalation chain: employee → manager → skip-level/HR after defined intervals.

**FR-ESC-03 (Bonus):** All escalation events shall be visible in an escalation log accessible to Admin/HR.

---

### 3.11 Analytics Module (Bonus)

**FR-ANALYTICS-01 (Bonus):** Quarter-on-Quarter goal achievement trends shall be available at individual, team, and department levels.

**FR-ANALYTICS-02 (Bonus):** Heatmaps or progress charts shall show completion rates across the organization.

**FR-ANALYTICS-03 (Bonus):** Goal distribution analysis shall break down goals by Thrust Area, UoM type, and status.

**FR-ANALYTICS-04 (Bonus):** A manager effectiveness dashboard shall compare check-in completion rates across all L1 managers.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- API response time for standard CRUD operations: < 500ms
- Dashboard summary queries: < 1s
- Report CSV generation for up to 500 employees: < 5s

### 4.2 Security
- All API endpoints protected by JWT middleware
- Role-based access enforced server-side — never only in the React client
- Passwords hashed via Supabase Auth (bcrypt)
- Sensitive operations (unlock, shared-goal sync) wrapped in PostgreSQL transactions

### 4.3 Scalability
- Stateless Express API — horizontally scalable
- Supabase PostgreSQL with connection pooling via PgBouncer (built into Supabase)
- Indexes on `employee_id`, `cycle_id`, `manager_id`, `quarter`, and `status` columns

### 4.4 Reliability
- Use database transactions for multi-step operations (approve, unlock, shared-goal fan-out)
- Input validation enforced both client-side (UX) and server-side (authority)
- Graceful error messages for all failed operations

### 4.5 Usability
- Role-aware navigation — employees see employee views, managers see team dashboards
- Helpful inline validation error messages (not generic "Error 400")
- Responsive layout usable on desktop (1280px+) and tablet

### 4.6 Cost Optimisation
- Supabase free tier supports the hackathon deployment
- Render free tier hosts the Express backend
- Vercel free tier hosts the React frontend
- Minimize unnecessary API calls — use server-side aggregated summaries for dashboards

---

## 5. System Interfaces

### 5.1 User Interface
- React SPA with role-specific views and routes
- Employee portal: goal sheet, goal form, quarterly update form
- Manager portal: team goal review, approval workflow, check-in dashboard
- Admin portal: cycle config, org hierarchy, completion monitor, audit log

### 5.2 External Interfaces
- **Supabase**: PostgreSQL database, Auth, optional Storage
- **Email service** (Bonus): Resend or Nodemailer via SMTP
- **Microsoft Teams** (Bonus): Bot Framework or Webhooks
- **Microsoft Entra ID** (Bonus): OAuth 2.0 / MSAL for SSO

---

## 6. Submission Deliverables
1. Live hosted demo URL
2. GitHub repository link
3. Architecture diagram (PDF or image)
4. Login credentials for all three roles (Employee, Manager, Admin)
