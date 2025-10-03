-- ============================================================================
-- Dynamic Attendance System Migration
-- Version: 2.0
-- Date: 2024-01-15
-- Description: Add support for dynamic attendance with shift swaps, 
--              break policies, exceptions, and work hour adjustments
-- ============================================================================

-- ============================================================================
-- 1. SHIFTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  
  -- Shift Times
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_overnight BOOLEAN DEFAULT false,
  
  -- Work Hours
  expected_work_hours DECIMAL(4,2) DEFAULT 8.0,
  
  -- Thresholds
  late_threshold_minutes INTEGER DEFAULT 15,
  early_leave_threshold_minutes INTEGER DEFAULT 15,
  
  -- Grace Periods
  clock_in_grace_minutes INTEGER DEFAULT 5,
  clock_out_grace_minutes INTEGER DEFAULT 5,
  
  -- Break Configuration
  default_break_policy_id UUID,
  
  -- Overtime Rules
  overtime_after_hours DECIMAL(4,2) DEFAULT 8.0,
  overtime_rate_weekday DECIMAL(3,2) DEFAULT 1.5,
  overtime_rate_weekend DECIMAL(3,2) DEFAULT 2.0,
  overtime_rate_holiday DECIMAL(3,2) DEFAULT 3.0,
  
  -- Work Arrangement
  allows_wfh BOOLEAN DEFAULT true,
  requires_location BOOLEAN DEFAULT true,
  requires_photo BOOLEAN DEFAULT false,
  
  -- Days Active
  active_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_code ON shifts(code);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(is_active);

-- ============================================================================
-- 2. BREAK POLICIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS break_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  
  -- Break Configuration
  total_duration_minutes INTEGER NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  
  -- Flexibility
  is_flexible BOOLEAN DEFAULT false,
  max_splits INTEGER DEFAULT 1,
  min_break_duration INTEGER DEFAULT 15,
  
  -- Paid/Unpaid Split
  paid_duration_minutes INTEGER,
  
  -- Conditions
  min_work_hours_required DECIMAL(3,1) DEFAULT 4.0,
  applies_to_shifts TEXT[],
  
  -- Timing Constraints
  earliest_break_time TIME,
  latest_break_time TIME,
  
  -- Special Types
  is_prayer_break BOOLEAN DEFAULT false,
  is_meal_break BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_break_policies_code ON break_policies(code);
CREATE INDEX IF NOT EXISTS idx_break_policies_active ON break_policies(is_active);

-- ============================================================================
-- 3. BREAK SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS break_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID,
  user_id UUID NOT NULL,
  
  -- Break Info
  break_type VARCHAR(50),
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Policy
  break_policy_id UUID REFERENCES break_policies(id),
  is_paid BOOLEAN DEFAULT true,
  
  -- Location
  location JSONB,
  
  -- Status
  status VARCHAR(20) DEFAULT 'in_progress',
  exceeded_policy BOOLEAN DEFAULT false,
  exceeded_minutes INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_break_sessions_user ON break_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_break_sessions_date ON break_sessions(break_start);

-- ============================================================================
-- 4. ATTENDANCE EXCEPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID,
  user_id UUID NOT NULL,
  
  -- Exception Type
  exception_type VARCHAR(50) NOT NULL,
  
  -- Request
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID,
  reason TEXT NOT NULL,
  supporting_document TEXT,
  
  -- Approval Workflow
  approval_status VARCHAR(20) DEFAULT 'pending',
  approver_id UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Impact & Adjustments
  time_adjustment_minutes INTEGER DEFAULT 0,
  work_hours_adjusted DECIMAL(4,2),
  affect_salary BOOLEAN DEFAULT false,
  salary_deduction_amount DECIMAL(10,2) DEFAULT 0,
  affect_performance BOOLEAN DEFAULT false,
  performance_penalty_points INTEGER DEFAULT 0,
  
  -- HR Actions
  hr_notes TEXT,
  hr_reviewed_at TIMESTAMPTZ,
  hr_reviewer_id UUID,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exceptions_user ON attendance_exceptions(user_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON attendance_exceptions(approval_status);
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON attendance_exceptions(exception_type);

-- ============================================================================
-- 5. WORK HOUR ADJUSTMENTS LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_hour_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Adjustment Details
  adjustment_type VARCHAR(50),
  original_hours DECIMAL(4,2),
  adjusted_hours DECIMAL(4,2),
  difference_hours DECIMAL(4,2),
  
  -- Reason
  reason TEXT NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- Related Exception
  exception_id UUID REFERENCES attendance_exceptions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_user ON work_hour_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_date ON work_hour_adjustments(created_at);

-- ============================================================================
-- 6. SHIFT SWAP REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_code VARCHAR(50) UNIQUE,
  
  -- Requestor
  requestor_id UUID NOT NULL,
  requestor_date DATE NOT NULL,
  requestor_shift_id UUID REFERENCES shifts(id),
  
  -- Target
  target_id UUID,
  target_date DATE,
  target_shift_id UUID REFERENCES shifts(id),
  
  -- Swap Type
  swap_type VARCHAR(50) NOT NULL,
  
  -- Request Details
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  is_emergency BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  
  -- Approval Workflow
  status VARCHAR(20) DEFAULT 'pending_target',
  
  -- Target Approval
  target_approved_at TIMESTAMPTZ,
  target_response VARCHAR(20),
  target_rejection_reason TEXT,
  
  -- Manager Approval
  manager_id UUID,
  manager_approved_at TIMESTAMPTZ,
  manager_response VARCHAR(20),
  manager_rejection_reason TEXT,
  
  -- HR Approval (cross-department)
  hr_id UUID,
  hr_approved_at TIMESTAMPTZ,
  hr_response VARCHAR(20),
  hr_rejection_reason TEXT,
  
  -- Conditions
  requires_hr_approval BOOLEAN DEFAULT false,
  is_cross_department BOOLEAN DEFAULT false,
  
  -- Compensation
  compensation_type VARCHAR(50),
  compensation_amount DECIMAL(10,2),
  
  -- Metadata
  notes TEXT,
  system_notes TEXT,
  metadata JSONB,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_swap_requestor ON shift_swap_requests(requestor_id, requestor_date);
CREATE INDEX IF NOT EXISTS idx_shift_swap_target ON shift_swap_requests(target_id, target_date);
CREATE INDEX IF NOT EXISTS idx_shift_swap_status ON shift_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_swap_code ON shift_swap_requests(swap_code);

-- ============================================================================
-- 7. SHIFT SWAP HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_swap_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_request_id UUID REFERENCES shift_swap_requests(id),
  
  -- Action
  action VARCHAR(50) NOT NULL,
  actor_id UUID,
  actor_role VARCHAR(50),
  
  -- Details
  action_details TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swap_history_request ON shift_swap_history(swap_request_id);
CREATE INDEX IF NOT EXISTS idx_swap_history_date ON shift_swap_history(created_at);

-- ============================================================================
-- 8. SEED DEFAULT DATA
-- ============================================================================

-- Insert default shifts
INSERT INTO shifts (name, code, start_time, end_time, expected_work_hours, late_threshold_minutes, is_active) VALUES
  ('Regular Shift', 'REG', '08:00:00', '17:00:00', 8.0, 15, true),
  ('Morning Shift', 'MORNING', '06:00:00', '14:00:00', 8.0, 10, true),
  ('Afternoon Shift', 'AFTERNOON', '14:00:00', '22:00:00', 8.0, 10, true),
  ('Night Shift', 'NIGHT', '22:00:00', '06:00:00', 8.0, 20, true)
ON CONFLICT (code) DO NOTHING;

-- Insert default break policies
INSERT INTO break_policies (name, code, total_duration_minutes, is_paid, is_flexible, max_splits, min_break_duration, is_active) VALUES
  ('Standard Break', 'STANDARD', 60, true, false, 1, 60, true),
  ('Flexible Break', 'FLEXIBLE', 60, true, true, 3, 15, true),
  ('Short Break', 'SHORT', 30, true, false, 1, 30, true),
  ('Extended Break', 'EXTENDED', 120, true, false, 1, 120, true),
  ('Prayer Break', 'PRAYER', 15, true, true, 5, 5, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 9. ADD TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_break_policies_updated_at BEFORE UPDATE ON break_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_break_sessions_updated_at BEFORE UPDATE ON break_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_exceptions_updated_at BEFORE UPDATE ON attendance_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_swap_requests_updated_at BEFORE UPDATE ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
