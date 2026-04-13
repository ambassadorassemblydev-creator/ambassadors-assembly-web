-- ============================================================
-- PART 1: CORE SETUP + AUTH & MEMBERS
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- ============================================================
-- CUSTOM TYPES / ENUMS
-- ============================================================
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'prefer_not_to_say');
CREATE TYPE marital_status_type AS ENUM ('single', 'married', 'widowed', 'divorced', 'prefer_not_to_say');
CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE donation_frequency AS ENUM ('one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE prayer_status AS ENUM ('pending', 'praying', 'answered', 'closed');
CREATE TYPE prayer_category AS ENUM ('health', 'family', 'finance', 'salvation', 'marriage', 'career', 'spiritual_growth', 'grief', 'thanksgiving', 'other');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived', 'scheduled');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled', 'postponed');
CREATE TYPE event_type AS ENUM ('service', 'conference', 'retreat', 'workshop', 'outreach', 'fellowship', 'youth', 'prayer_meeting', 'other');
CREATE TYPE stream_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');
CREATE TYPE visitor_source AS ENUM ('website', 'social_media', 'friend', 'family', 'flyer', 'walk_in', 'google', 'other');
CREATE TYPE notification_type AS ENUM ('info', 'reminder', 'prayer', 'event', 'donation', 'announcement', 'system');
CREATE TYPE email_status AS ENUM ('queued', 'sending', 'sent', 'failed', 'bounced');
CREATE TYPE milestone_type AS ENUM ('salvation', 'baptism', 'membership', 'marriage', 'child_dedication', 'ordination', 'anniversary', 'other');
CREATE TYPE attendance_type AS ENUM ('in_person', 'online', 'absent');
CREATE TYPE member_title AS ENUM ('Mr', 'Mrs', 'Ms', 'Dr', 'Pastor', 'Deacon', 'Deaconess', 'Elder', 'Minister', 'Bishop', 'Evangelist', 'Apostle', 'Prophet');

-- ============================================================
-- HELPER: auto-update updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: generate unique member ID like "AA-2026-00001"
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
  year_str TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(member_id FROM 9) AS INT)
  ), 0) + 1 INTO next_num
  FROM public.profiles
  WHERE member_id LIKE 'AA-' || year_str || '-%';
  RETURN 'AA-' || year_str || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id TEXT UNIQUE, -- e.g. "AA-2026-00001"
  email TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,

  -- Personal info
  title member_title,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  preferred_name TEXT, -- What they want to be called
  gender gender_type,
  date_of_birth DATE,
  marital_status marital_status_type,
  wedding_anniversary DATE,
  occupation TEXT,
  employer TEXT,

  -- Contact
  phone TEXT,
  alt_phone TEXT,
  whatsapp_number TEXT,

  -- Address
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  county TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'United Kingdom',

  -- Church info
  member_since DATE,
  is_member BOOLEAN DEFAULT FALSE, -- Only true after admin approval
  is_baptized BOOLEAN DEFAULT FALSE,
  baptism_date DATE,
  salvation_date DATE,
  previous_church TEXT,
  how_did_you_hear visitor_source,
  how_did_you_hear_other TEXT,
  spiritual_gifts TEXT[], -- e.g. {'teaching', 'worship', 'hospitality'}
  interests TEXT[], -- e.g. {'youth ministry', 'choir', 'ushering'}

  -- Profile
  avatar_url TEXT, -- Cloudinary URL
  bio TEXT,

  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,

  -- Login tracking
  last_login_at TIMESTAMPTZ,
  login_count INT DEFAULT 0,

  -- Communication preferences
  receive_email_newsletter BOOLEAN DEFAULT TRUE,
  receive_email_events BOOLEAN DEFAULT TRUE,
  receive_email_devotionals BOOLEAN DEFAULT FALSE,
  receive_sms_notifications BOOLEAN DEFAULT FALSE,
  receive_birthday_greeting BOOLEAN DEFAULT TRUE,

  -- Status
  status user_status DEFAULT 'active',
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}', -- Flexible permissions object
  is_system_role BOOLEAN DEFAULT FALSE, -- Prevent deletion
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default roles
INSERT INTO roles (name, description, is_system_role, permissions) VALUES
  ('super_admin', 'Full system access — all permissions', TRUE,
    '{"all": true}'::jsonb),
  ('admin', 'Administrative access — manage content, users, donations', TRUE,
    '{"manage_users": true, "manage_content": true, "manage_donations": true, "manage_events": true, "manage_sermons": true}'::jsonb),
  ('pastor', 'Pastoral access — sermons, prayer, members, counselling', TRUE,
    '{"manage_sermons": true, "view_prayers": true, "view_members": true, "manage_devotionals": true}'::jsonb),
  ('leader', 'Ministry/group leader — manage their ministry or group', FALSE,
    '{"manage_own_group": true, "view_members": true}'::jsonb),
  ('member', 'Verified church member — full member features', TRUE,
    '{"view_directory": true, "join_groups": true, "submit_prayers": true}'::jsonb),
  ('guest', 'Website visitor with an account — limited access', TRUE,
    '{"submit_prayers": true, "view_sermons": true}'::jsonb);


-- ============================================================
-- USER ROLES (many-to-many)
-- ============================================================
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional role expiry
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- FAMILY GROUPS (link family members together)
-- ============================================================
CREATE TABLE family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name TEXT NOT NULL, -- e.g. "The Johnsons"
  head_of_family_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER family_groups_updated_at
  BEFORE UPDATE ON family_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- 'head', 'spouse', 'child', 'parent', 'sibling'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);


-- ============================================================
-- MEMBER MILESTONES
-- ============================================================
CREATE TABLE member_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone milestone_type NOT NULL,
  title TEXT, -- Custom label e.g. "Water Baptism"
  description TEXT,
  milestone_date DATE NOT NULL,
  photo_url TEXT, -- Cloudinary
  certificate_url TEXT, -- PDF on Cloudinary
  officiated_by TEXT, -- Who performed it
  witnesses TEXT[], -- Names
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER member_milestones_updated_at
  BEFORE UPDATE ON member_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MEMBER NOTES (for pastoral/admin use)
-- ============================================================
CREATE TABLE member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_confidential BOOLEAN DEFAULT TRUE,
  category TEXT, -- 'counselling', 'follow_up', 'general', 'pastoral_visit'
  follow_up_date DATE,
  is_follow_up_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER member_notes_updated_at
  BEFORE UPDATE ON member_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, member_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    public.generate_member_id()
  );

  -- Assign default 'guest' role
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (
    NEW.id,
    (SELECT id FROM public.roles WHERE name = 'guest')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- UPDATE LOGIN TRACKING (call from your app on login)
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_user_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = NOW(),
      login_count = COALESCE(login_count, 0) + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
