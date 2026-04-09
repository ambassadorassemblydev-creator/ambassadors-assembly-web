-- ============================================================
-- PART 4: WORKERS/STAFF, SYSTEM TABLES, FAMILY MATCHING
-- Run this FOURTH in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- CHURCH DEPARTMENTS
-- ============================================================
CREATE TABLE church_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  head_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deputy_head_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER church_departments_updated_at
  BEFORE UPDATE ON church_departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO church_departments (name, slug, description, sort_order) VALUES
  ('Pastoral', 'pastoral', 'Senior and associate pastors, counselling', 1),
  ('Worship & Music', 'worship', 'Choir, praise team, musicians, worship leaders', 2),
  ('Media & Tech', 'media-tech', 'Sound, camera, projection, live stream, social media', 3),
  ('Ushering & Protocol', 'ushering', 'Ushers, greeters, protocol officers', 4),
  ('Children & Nursery', 'children', 'Sunday school, children church, nursery', 5),
  ('Youth', 'youth', 'Youth ministry, young adults', 6),
  ('Prayer', 'prayer', 'Prayer warriors, intercessors, prayer coordinators', 7),
  ('Outreach & Evangelism', 'outreach', 'Community outreach, street evangelism', 8),
  ('Finance & Admin', 'finance-admin', 'Accounting, budgeting, church admin', 9),
  ('Welfare & Benevolence', 'welfare', 'Visiting the sick, supporting the needy', 10),
  ('Facilities & Maintenance', 'facilities', 'Building, cleaning, setup, security', 11),
  ('Hospitality', 'hospitality', 'Food, refreshments, hosting guests', 12),
  ('Discipleship', 'discipleship', 'Bible study leaders, new believers follow-up', 13),
  ('Transportation', 'transportation', 'Church bus, member pickup, event transport', 14),
  ('Communications', 'communications', 'Website, newsletter, bulletins, design', 15);


-- ============================================================
-- CHURCH POSITIONS (defined roles within departments)
-- ============================================================
CREATE TABLE church_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES church_departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g. "Head Usher", "Choir Director"
  description TEXT,
  responsibilities TEXT, -- What this role does
  requirements TEXT, -- Skills or qualifications needed
  is_leadership BOOLEAN DEFAULT FALSE,
  is_volunteer BOOLEAN DEFAULT TRUE, -- vs. paid staff
  max_holders INT, -- Max people in this position (NULL = unlimited)
  current_holders INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER church_positions_updated_at
  BEFORE UPDATE ON church_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed common positions
INSERT INTO church_positions (department_id, title, description, is_leadership, sort_order) VALUES
  -- Worship
  ((SELECT id FROM church_departments WHERE slug = 'worship'), 'Worship Leader', 'Leads worship during services', TRUE, 1),
  ((SELECT id FROM church_departments WHERE slug = 'worship'), 'Choir Director', 'Directs the church choir', TRUE, 2),
  ((SELECT id FROM church_departments WHERE slug = 'worship'), 'Choir Member', 'Sings in the church choir', FALSE, 3),
  ((SELECT id FROM church_departments WHERE slug = 'worship'), 'Musician', 'Plays instruments during worship', FALSE, 4),
  ((SELECT id FROM church_departments WHERE slug = 'worship'), 'Backup Singer', 'Provides vocal support during worship', FALSE, 5),
  -- Media
  ((SELECT id FROM church_departments WHERE slug = 'media-tech'), 'Media Director', 'Oversees all media operations', TRUE, 1),
  ((SELECT id FROM church_departments WHERE slug = 'media-tech'), 'Sound Engineer', 'Manages audio during services', FALSE, 2),
  ((SELECT id FROM church_departments WHERE slug = 'media-tech'), 'Camera Operator', 'Records and live streams services', FALSE, 3),
  ((SELECT id FROM church_departments WHERE slug = 'media-tech'), 'Projection Operator', 'Manages slides and visuals', FALSE, 4),
  ((SELECT id FROM church_departments WHERE slug = 'media-tech'), 'Social Media Manager', 'Manages church social media', FALSE, 5),
  ((SELECT id FROM church_departments WHERE slug = 'media-tech'), 'Graphic Designer', 'Creates church designs and flyers', FALSE, 6),
  -- Ushering
  ((SELECT id FROM church_departments WHERE slug = 'ushering'), 'Head Usher', 'Leads the ushering team', TRUE, 1),
  ((SELECT id FROM church_departments WHERE slug = 'ushering'), 'Usher', 'Welcomes and seats members', FALSE, 2),
  ((SELECT id FROM church_departments WHERE slug = 'ushering'), 'Greeter', 'Welcomes visitors at the door', FALSE, 3),
  ((SELECT id FROM church_departments WHERE slug = 'ushering'), 'Protocol Officer', 'Manages VIP guests and events protocol', FALSE, 4),
  -- Children
  ((SELECT id FROM church_departments WHERE slug = 'children'), 'Children Ministry Director', 'Oversees all children programs', TRUE, 1),
  ((SELECT id FROM church_departments WHERE slug = 'children'), 'Sunday School Teacher', 'Teaches Sunday school classes', FALSE, 2),
  ((SELECT id FROM church_departments WHERE slug = 'children'), 'Nursery Worker', 'Cares for infants and toddlers', FALSE, 3);


-- ============================================================
-- CHURCH WORKERS (members assigned to positions)
-- ============================================================
CREATE TABLE church_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES church_positions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES church_departments(id) ON DELETE CASCADE,

  -- Worker details
  worker_id TEXT UNIQUE, -- e.g. "WRK-2026-00001"
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive', 'probation', 'suspended')),
  employment_type TEXT DEFAULT 'volunteer' CHECK (employment_type IN ('volunteer', 'part_time', 'full_time', 'contract')),

  -- Dates
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  probation_end_date DATE,

  -- Skills and qualifications
  skills TEXT[],
  certifications TEXT[], -- e.g. 'DBS checked', 'First Aid', 'Safeguarding'
  dbs_check_date DATE, -- Disclosure and Barring Service (UK)
  dbs_certificate_number TEXT,
  dbs_expiry_date DATE,

  -- Availability
  available_sunday BOOLEAN DEFAULT TRUE,
  available_wednesday BOOLEAN DEFAULT FALSE,
  available_friday BOOLEAN DEFAULT FALSE,
  available_saturday BOOLEAN DEFAULT FALSE,
  availability_notes TEXT,

  -- Performance
  is_trained BOOLEAN DEFAULT FALSE,
  training_completed_at DATE,
  trained_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,

  -- Assigned by
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, position_id)
);

CREATE TRIGGER church_workers_updated_at
  BEFORE UPDATE ON church_workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate worker ID
CREATE OR REPLACE FUNCTION generate_worker_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
  year_str TEXT;
BEGIN
  IF NEW.worker_id IS NULL THEN
    year_str := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(worker_id FROM 10) AS INT)
    ), 0) + 1 INTO next_num
    FROM church_workers
    WHERE worker_id LIKE 'WRK-' || year_str || '-%';
    NEW.worker_id := 'WRK-' || year_str || '-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER church_workers_auto_id
  BEFORE INSERT ON church_workers
  FOR EACH ROW EXECUTE FUNCTION generate_worker_id();


-- ============================================================
-- WORKER SCHEDULE / ROTA
-- ============================================================
CREATE TABLE worker_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES church_workers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES church_departments(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  service_name TEXT, -- "Sunday Morning", "Wednesday Bible Study"
  shift_start TIME,
  shift_end TIME,
  role_for_day TEXT, -- Specific role for this date
  is_confirmed BOOLEAN DEFAULT FALSE,
  is_swap_requested BOOLEAN DEFAULT FALSE,
  swap_with_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  attended BOOLEAN,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER worker_schedules_updated_at
  BEFORE UPDATE ON worker_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- VOLUNTEER APPLICATIONS (people signing up for positions)
-- ============================================================
CREATE TABLE volunteer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  position_id UUID NOT NULL REFERENCES church_positions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES church_departments(id) ON DELETE CASCADE,

  -- Applicant info (non-members can apply)
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,

  -- Application
  motivation TEXT NOT NULL, -- Why do you want to serve?
  experience TEXT, -- Relevant experience
  skills TEXT[],
  availability TEXT, -- When can they serve?
  has_dbs_check BOOLEAN DEFAULT FALSE,
  preferred_start_date DATE,
  references_provided TEXT, -- Names of references

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'waitlisted')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Interview
  interview_date TIMESTAMPTZ,
  interview_notes TEXT,
  interviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Emails
  confirmation_email_sent BOOLEAN DEFAULT FALSE,
  decision_email_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER volunteer_applications_updated_at
  BEFORE UPDATE ON volunteer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SERVICE ATTENDANCE (track who attended which service)
-- ============================================================
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_date DATE NOT NULL,
  service_name TEXT NOT NULL, -- "Sunday Morning Service"
  attendance attendance_type DEFAULT 'in_person',
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Usher who checked in
  guest_name TEXT, -- For non-member tracking
  guest_count INT DEFAULT 0, -- Guests brought by this member
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- POTENTIAL FAMILY MATCHES (surname-based auto-detection)
-- ============================================================
CREATE TABLE potential_family_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_surname TEXT NOT NULL,
  user_id_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3, 2) DEFAULT 0.50, -- 0 to 1
  match_reasons TEXT[], -- e.g. {'same_surname', 'same_address', 'same_phone_prefix'}
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'ignored')),
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  family_group_id UUID REFERENCES family_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

CREATE TRIGGER potential_family_matches_updated_at
  BEFORE UPDATE ON potential_family_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to auto-detect potential families on new profile
CREATE OR REPLACE FUNCTION detect_potential_families()
RETURNS TRIGGER AS $$
BEGIN
  -- Find other profiles with the same last name
  INSERT INTO potential_family_matches (shared_surname, user_id_1, user_id_2, match_reasons, confidence_score)
  SELECT
    NEW.last_name,
    LEAST(NEW.id, p.id),
    GREATEST(NEW.id, p.id),
    CASE
      WHEN NEW.postal_code IS NOT NULL AND NEW.postal_code = p.postal_code
        THEN ARRAY['same_surname', 'same_postcode']
      WHEN NEW.city IS NOT NULL AND NEW.city = p.city
        THEN ARRAY['same_surname', 'same_city']
      ELSE ARRAY['same_surname']
    END,
    CASE
      WHEN NEW.postal_code IS NOT NULL AND NEW.postal_code = p.postal_code THEN 0.85
      WHEN NEW.city IS NOT NULL AND NEW.city = p.city THEN 0.65
      ELSE 0.40
    END
  FROM profiles p
  WHERE p.last_name = NEW.last_name
    AND p.id != NEW.id
    AND p.last_name IS NOT NULL
    AND p.last_name != ''
    AND NOT EXISTS (
      SELECT 1 FROM potential_family_matches pfm
      WHERE (pfm.user_id_1 = LEAST(NEW.id, p.id) AND pfm.user_id_2 = GREATEST(NEW.id, p.id))
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_detect_family
  AFTER INSERT OR UPDATE OF last_name ON profiles
  FOR EACH ROW
  WHEN (NEW.last_name IS NOT NULL AND NEW.last_name != '')
  EXECUTE FUNCTION detect_potential_families();


-- ============================================================
-- NOTIFICATIONS (in-app notifications for members)
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Deep link to related content
  icon TEXT, -- Icon or emoji
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- Flexible extra data
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- EMAIL LOG (track all emails sent via Resend)
-- ============================================================
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL, -- 'welcome', 'donation_receipt', 'event_reminder', etc.
  subject TEXT NOT NULL,
  body_preview TEXT, -- First 200 chars of email body

  -- Resend tracking
  resend_email_id TEXT, -- Resend API response ID
  status email_status DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,

  -- Related entity
  related_type TEXT, -- 'donation', 'event', 'prayer', 'devotional', etc.
  related_id UUID, -- ID of the related record

  -- Retry
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER email_log_updated_at
  BEFORE UPDATE ON email_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SCHEDULED JOBS (cron job tracking)
-- ============================================================
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL UNIQUE,
  description TEXT,
  cron_expression TEXT NOT NULL, -- e.g. '0 8 * * *' (daily at 8am)
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT, -- 'success', 'failed', 'skipped'
  last_run_duration_ms INT,
  last_error TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER scheduled_jobs_updated_at
  BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed cron jobs
INSERT INTO scheduled_jobs (job_name, description, cron_expression) VALUES
  ('send_birthday_emails', 'Send birthday greeting emails to members', '0 7 * * *'),
  ('send_anniversary_emails', 'Send membership anniversary emails', '0 7 * * *'),
  ('send_event_reminders', 'Send event reminder emails (1 day before)', '0 9 * * *'),
  ('send_daily_devotional', 'Email daily devotional to subscribers', '0 6 * * *'),
  ('send_weekly_newsletter', 'Send weekly newsletter digest', '0 10 * * 1'),
  ('cleanup_expired_announcements', 'Archive expired announcements', '0 0 * * *'),
  ('generate_monthly_giving_statements', 'Generate monthly giving statements', '0 2 1 * *'),
  ('generate_annual_giving_statements', 'Generate annual giving statements (end of year)', '0 2 2 1 *'),
  ('check_recurring_donations', 'Check and process failed recurring donations', '0 3 * * *'),
  ('follow_up_new_visitors', 'Remind admins to follow up with uncontacted visitors', '0 9 * * 1'),
  ('attendance_follow_up', 'Flag members absent for 3+ consecutive weeks', '0 10 * * 1'),
  ('dbs_expiry_alerts', 'Alert workers with expiring DBS checks (30 days before)', '0 8 * * 1'),
  ('deactivate_expired_roles', 'Deactivate user roles past their expiry date', '0 1 * * *');


-- ============================================================
-- AUDIT LOG (track important admin actions)
-- ============================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'approve', 'assign_role'
  entity_type TEXT NOT NULL, -- 'profile', 'donation', 'sermon', 'worker', etc.
  entity_id UUID,
  old_values JSONB, -- Previous state
  new_values JSONB, -- New state
  ip_address INET,
  user_agent TEXT,
  description TEXT, -- Human-readable description
  created_at TIMESTAMPTZ DEFAULT NOW()
);
