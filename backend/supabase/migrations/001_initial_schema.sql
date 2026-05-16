-- Initial Schema for Goal Tracking Portal

CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL UNIQUE,
  code          VARCHAR(20) UNIQUE,
  parent_dept_id UUID REFERENCES departments(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE shared_goal_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_goal_group_id  UUID NOT NULL REFERENCES shared_goal_groups(id),
  goal_id               UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES users(id),
  weightage_override    NUMERIC(5, 2),           -- employee-set weightage for this shared goal
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_shared_assignment UNIQUE (shared_goal_group_id, employee_id)
);

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
