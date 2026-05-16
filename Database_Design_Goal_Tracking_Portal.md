# Database Design
## In-House Goal Setting & Tracking Portal
**AtomQuest Hackathon 1.0 | MERN + Supabase PostgreSQL | Version 1.0 | May 2026**

---

## 1. Overview

The database uses **Supabase PostgreSQL** as a fully relational store. The schema is normalized to Third Normal Form (3NF) with deliberate denormalization only for progress score snapshots (performance optimization). The design covers goal lifecycle, manager approval workflow, shared goal propagation, quarterly check-ins, audit trails, and reporting.

---

## 2. Entity Relationship Overview

```
departments
    └── users (many employees per department)
            └── user_reporting (employee → manager mapping)
            └── goal_sheets (one per employee per cycle)
                    └── goals (up to 8 per sheet)
                            └── shared_goal_assignments (optional, for shared KPIs)
                            └── goal_progress_entries (one per goal per quarter check-in)

review_cycles
    └── cycle_windows (goal_setting, q1, q2, q3, q4)
    └── quarterly_checkins (one per employee per cycle per quarter)
            └── goal_progress_entries
            └── checkin_comments

shared_goal_groups
    └── shared_goal_assignments (links shared group to individual goals)

goal_approvals (approval/rejection/unlock events on goal_sheets)
audit_logs (all post-lock field-level changes)
notifications
escalations (bonus)
```

---

## 3. Table Definitions

### 3.1 departments
Stores organizational departments for grouping users and shared goal targeting.

```sql
CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL UNIQUE,
  code          VARCHAR(20) UNIQUE,
  parent_dept_id UUID REFERENCES departments(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.2 users
Core identity table for all roles. Role determines access level across all workflows.

```sql
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code   VARCHAR(30) NOT NULL UNIQUE,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255),                  -- nullable if using Supabase Auth
  role            user_role NOT NULL DEFAULT 'employee',
  department_id   UUID REFERENCES departments(id),
  designation     VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  azure_ad_id     VARCHAR(255) UNIQUE,           -- for Entra ID bonus integration
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
```

---

### 3.3 user_reporting
Explicit employee-to-manager mapping. Supports historical tracking via effective dates.

```sql
CREATE TABLE user_reporting (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES users(id),
  manager_id     UUID NOT NULL REFERENCES users(id),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE,                           -- NULL means currently active
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_no_self_report CHECK (employee_id <> manager_id),
  CONSTRAINT uq_active_report UNIQUE (employee_id, manager_id, effective_from)
);

CREATE INDEX idx_user_reporting_employee ON user_reporting(employee_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_reporting_manager ON user_reporting(manager_id) WHERE is_active = TRUE;
```

---

### 3.4 review_cycles
One row per annual performance cycle.

```sql
CREATE TYPE cycle_status AS ENUM ('draft', 'active', 'closed');

CREATE TABLE review_cycles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,       -- e.g., 'FY2026'
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      cycle_status NOT NULL DEFAULT 'draft',
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_cycle_dates CHECK (end_date > start_date)
);
```

---

### 3.5 cycle_windows
Defines the open/close windows for each phase of a cycle. The backend checks this table before allowing any goal or check-in action.

```sql
CREATE TYPE window_type AS ENUM ('goal_setting', 'q1', 'q2', 'q3', 'q4');

CREATE TABLE cycle_windows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id     UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  window_type  window_type NOT NULL,
  opens_at     TIMESTAMPTZ NOT NULL,
  closes_at    TIMESTAMPTZ NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,  -- toggled by admin or scheduled job
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_cycle_window UNIQUE (cycle_id, window_type),
  CONSTRAINT chk_window_dates CHECK (closes_at > opens_at)
);

CREATE INDEX idx_cycle_windows_cycle ON cycle_windows(cycle_id);
```

---

### 3.6 goal_sheets
Parent record for an employee's goals in a cycle. Status drives the entire approval workflow.

```sql
CREATE TYPE sheet_status AS ENUM (
  'draft',
  'submitted',
  'rework_requested',
  'approved',
  'locked'
);

CREATE TABLE goal_sheets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES users(id),
  cycle_id      UUID NOT NULL REFERENCES review_cycles(id),
  status        sheet_status NOT NULL DEFAULT 'draft',
  submitted_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  approved_by   UUID REFERENCES users(id),
  rework_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_employee_cycle UNIQUE (employee_id, cycle_id)
);

CREATE INDEX idx_goal_sheets_employee ON goal_sheets(employee_id);
CREATE INDEX idx_goal_sheets_cycle ON goal_sheets(cycle_id);
CREATE INDEX idx_goal_sheets_status ON goal_sheets(status);
```

---

### 3.7 shared_goal_groups
Represents a departmental KPI that is pushed to multiple employees. The primary owner's achievement is the master value.

```sql
CREATE TYPE uom_type AS ENUM ('min_numeric', 'max_numeric', 'timeline', 'zero_based');

CREATE TABLE shared_goal_groups (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id              UUID NOT NULL REFERENCES review_cycles(id),
  title                 VARCHAR(200) NOT NULL,
  description           TEXT,
  thrust_area           VARCHAR(100) NOT NULL,
  uom_type              uom_type NOT NULL,
  master_target_numeric NUMERIC(15, 4),
  master_target_text    VARCHAR(500),
  master_deadline_date  DATE,
  primary_owner_id      UUID NOT NULL REFERENCES users(id),
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.8 goals
Individual goals within a goal sheet. May be independent or linked to a shared goal group.

```sql
CREATE TABLE goals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id          UUID NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
  shared_goal_group_id   UUID REFERENCES shared_goal_groups(id),
  primary_owner_id       UUID NOT NULL REFERENCES users(id),
  thrust_area            VARCHAR(100) NOT NULL,
  title                  VARCHAR(200) NOT NULL,
  description            TEXT,
  uom_type               uom_type NOT NULL,
  target_value_numeric   NUMERIC(15, 4),         -- used for min_numeric, max_numeric, zero_based
  target_value_text      VARCHAR(500),           -- used when target is descriptive
  deadline_date          DATE,                   -- used for timeline UoM
  weightage              NUMERIC(5, 2) NOT NULL,
  is_locked              BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared              BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_weightage     BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE for primary owner of shared goal
  sort_order             SMALLINT NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_weightage_min CHECK (weightage >= 10),
  CONSTRAINT chk_weightage_max CHECK (weightage <= 100)
);

CREATE INDEX idx_goals_sheet ON goals(goal_sheet_id);
CREATE INDEX idx_goals_shared_group ON goals(shared_goal_group_id) WHERE shared_goal_group_id IS NOT NULL;
CREATE INDEX idx_goals_locked ON goals(is_locked);
```

---

### 3.9 shared_goal_assignments
Links each shared goal group to individual employee goal rows. Enforces the read-only constraint on title/target for recipients.

```sql
CREATE TABLE shared_goal_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_goal_group_id  UUID NOT NULL REFERENCES shared_goal_groups(id),
  goal_id               UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES users(id),
  weightage_override    NUMERIC(5, 2),           -- employee-set weightage for this shared goal
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_shared_assignment UNIQUE (shared_goal_group_id, employee_id)
);
```

---

### 3.10 goal_approvals
Event log for the approval workflow. Every submission, approval, rejection, inline edit, and unlock is recorded here.

```sql
CREATE TYPE approval_action AS ENUM (
  'submitted',
  'manager_edited',
  'approved',
  'rework_requested',
  'unlocked_by_admin'
);

CREATE TABLE goal_approvals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id  UUID NOT NULL REFERENCES goal_sheets(id),
  action_by      UUID NOT NULL REFERENCES users(id),
  action_type    approval_action NOT NULL,
  comments       TEXT,
  action_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_approvals_sheet ON goal_approvals(goal_sheet_id);
CREATE INDEX idx_goal_approvals_actor ON goal_approvals(action_by);
```

---

### 3.11 quarterly_checkins
One row per employee per cycle per quarter. Tracks both employee submission and manager review status.

```sql
CREATE TYPE quarter_type AS ENUM ('q1', 'q2', 'q3', 'q4');
CREATE TYPE employee_checkin_status AS ENUM ('not_started', 'in_progress', 'submitted');
CREATE TYPE manager_checkin_status AS ENUM ('pending', 'completed');

CREATE TABLE quarterly_checkins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES users(id),
  cycle_id            UUID NOT NULL REFERENCES review_cycles(id),
  quarter             quarter_type NOT NULL,
  employee_status     employee_checkin_status NOT NULL DEFAULT 'not_started',
  manager_status      manager_checkin_status NOT NULL DEFAULT 'pending',
  employee_submitted_at TIMESTAMPTZ,
  manager_reviewed_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_employee_cycle_quarter UNIQUE (employee_id, cycle_id, quarter)
);

CREATE INDEX idx_checkins_employee ON quarterly_checkins(employee_id);
CREATE INDEX idx_checkins_cycle_quarter ON quarterly_checkins(cycle_id, quarter);
CREATE INDEX idx_checkins_manager_status ON quarterly_checkins(manager_status);
```

---

### 3.12 goal_progress_entries
Stores actual achievement values per goal per quarter check-in. Includes computed progress score.

```sql
CREATE TYPE goal_status AS ENUM ('not_started', 'on_track', 'completed');

CREATE TABLE goal_progress_entries (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id                  UUID NOT NULL REFERENCES quarterly_checkins(id) ON DELETE CASCADE,
  goal_id                     UUID NOT NULL REFERENCES goals(id),
  planned_target_snapshot     JSONB NOT NULL,    -- snapshot of target at time of entry
  actual_value_numeric        NUMERIC(15, 4),
  actual_value_text           VARCHAR(500),
  completion_date             DATE,              -- for timeline UoM
  status                      goal_status NOT NULL DEFAULT 'not_started',
  computed_progress_score     NUMERIC(7, 4),    -- 0 to 1+ (capped in business logic)
  remarks                     TEXT,
  is_synced_from_primary_owner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_checkin_goal UNIQUE (checkin_id, goal_id)
);

CREATE INDEX idx_progress_checkin ON goal_progress_entries(checkin_id);
CREATE INDEX idx_progress_goal ON goal_progress_entries(goal_id);
```

---

### 3.13 checkin_comments
Structured manager comments per quarterly check-in.

```sql
CREATE TABLE checkin_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id   UUID NOT NULL REFERENCES quarterly_checkins(id) ON DELETE CASCADE,
  manager_id   UUID NOT NULL REFERENCES users(id),
  comment_text TEXT NOT NULL,
  is_edited    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkin_comments_checkin ON checkin_comments(checkin_id);
```

---

### 3.14 audit_logs
Field-level audit trail for all post-lock changes. Every change to a locked goal or goal sheet is stored here.

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,            -- e.g., 'goal', 'goal_sheet'
  entity_id     UUID NOT NULL,
  field_name    VARCHAR(100) NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  changed_by    UUID NOT NULL REFERENCES users(id),
  change_reason TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(changed_by);
CREATE INDEX idx_audit_time ON audit_logs(changed_at DESC);
```

---

### 3.15 notifications
Stores notification events for email, Teams, or in-app alerts.

```sql
CREATE TYPE notification_type AS ENUM (
  'goal_submitted',
  'goal_approved',
  'goal_rework',
  'checkin_reminder',
  'escalation_alert'
);
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id      UUID NOT NULL REFERENCES users(id),
  notification_type notification_type NOT NULL,
  title             VARCHAR(200) NOT NULL,
  body              TEXT,
  deep_link         VARCHAR(500),
  status            notification_status NOT NULL DEFAULT 'pending',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, status);
```

---

### 3.16 escalations (Bonus)
Rule-based escalation tracking for bonus feature.

```sql
CREATE TYPE escalation_trigger AS ENUM (
  'goal_not_submitted',
  'approval_not_done',
  'checkin_not_completed'
);
CREATE TYPE escalation_status AS ENUM ('open', 'resolved', 'ignored');

CREATE TABLE escalations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type     escalation_trigger NOT NULL,
  target_user_id   UUID NOT NULL REFERENCES users(id),
  cycle_id         UUID NOT NULL REFERENCES review_cycles(id),
  quarter          quarter_type,
  escalation_level SMALLINT NOT NULL DEFAULT 1,  -- 1 = employee, 2 = manager, 3 = HR
  status           escalation_status NOT NULL DEFAULT 'open',
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Business Rules as Database Constraints

| Rule | Enforcement Layer | Detail |
|---|---|---|
| Max 8 goals per employee per cycle | Backend service (Express) | Checked before insert |
| Min 10% weightage per goal | DB CHECK + Backend | `chk_weightage_min` constraint |
| Total weightage = 100% | Backend service only | Sum validated on submission |
| Goals locked after approval | Backend + DB flag | `is_locked = TRUE` blocks updates |
| Shared goal title/target read-only for recipients | Backend middleware | Role + `is_shared` check |
| All post-lock changes logged | Backend audit service | Before-after diff on every update |
| One goal sheet per employee per cycle | DB UNIQUE constraint | `uq_employee_cycle` on `goal_sheets` |
| One check-in row per employee per cycle per quarter | DB UNIQUE constraint | `uq_employee_cycle_quarter` |

---

## 5. Progress Score Computation

The progress score is computed in the Express service layer and stored in `goal_progress_entries.computed_progress_score`.

| UoM Type | Formula | Notes |
|---|---|---|
| `min_numeric` | `actual ÷ target` | Higher actual = better score |
| `max_numeric` | `target ÷ actual` | Lower actual = better score |
| `timeline` | Date diff logic | Score based on early/on-time/late completion |
| `zero_based` | `actual == 0 ? 1.0 : 0.0` | Binary score |

Score is stored as a decimal (e.g., 0.85 = 85%). The frontend formats it as a percentage for display.

---

## 6. Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| `users` | `email`, `department_id`, `role` | Login lookups, dept filtering, RBAC |
| `user_reporting` | `employee_id`, `manager_id` | Hierarchy traversal |
| `goal_sheets` | `employee_id`, `cycle_id`, `status` | Dashboard queries |
| `goals` | `goal_sheet_id`, `shared_group_id`, `is_locked` | Goal fetching |
| `quarterly_checkins` | `employee_id`, `cycle_id + quarter`, `manager_status` | Completion dashboard |
| `goal_progress_entries` | `checkin_id`, `goal_id` | Progress reporting |
| `audit_logs` | `entity_type + entity_id`, `changed_by`, `changed_at DESC` | Audit trail queries |
| `notifications` | `recipient_id + status` | Notification processing |

---

## 7. Supabase-Specific Notes

- Use **Supabase Auth** for user identity management (email + password). Store the Supabase Auth `user.id` as the UUID in the `users` table.
- Use **Row Level Security (RLS)** as a defense-in-depth layer. Primary access control stays in the Express middleware.
- Use **Supabase Realtime** (optional) to push live updates to the manager's check-in dashboard without polling.
- Use **Supabase Storage** (optional) to store exported report files.
- Use **pg_cron** extension (available in Supabase) to schedule window activation and escalation jobs.
