-- ============================================================
-- PART 2: SERMONS, MEDIA, EVENTS, DONATIONS
-- Run this SECOND in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- SERMON SPEAKERS
-- ============================================================
CREATE TABLE sermon_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT, -- "Senior Pastor", "Guest Speaker"
  bio TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  social_instagram TEXT,
  social_twitter TEXT,
  is_guest BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER sermon_speakers_updated_at
  BEFORE UPDATE ON sermon_speakers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SERMON SERIES
-- ============================================================
CREATE TABLE sermon_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  trailer_video_url TEXT,
  start_date DATE,
  end_date DATE,
  total_sermons INT DEFAULT 0,
  status content_status DEFAULT 'published',
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER sermon_series_updated_at
  BEFORE UPDATE ON sermon_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SERMONS
-- ============================================================
CREATE TABLE sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  scripture_reference TEXT, -- "John 3:16-18"
  scripture_text TEXT, -- Actual passage
  speaker_id UUID REFERENCES sermon_speakers(id) ON DELETE SET NULL,
  series_id UUID REFERENCES sermon_series(id) ON DELETE SET NULL,
  series_order INT, -- Position within series (1, 2, 3...)

  -- Media (Cloudinary or YouTube)
  video_url TEXT,
  video_embed_url TEXT, -- YouTube/Vimeo embed
  audio_url TEXT,
  thumbnail_url TEXT,
  notes_pdf_url TEXT,
  transcript_url TEXT,

  -- Metadata
  duration_minutes INT,
  sermon_date DATE NOT NULL,
  service_type TEXT DEFAULT 'Sunday Morning', -- Which service
  status content_status DEFAULT 'published',
  view_count INT DEFAULT 0,
  play_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  allow_download BOOLEAN DEFAULT TRUE,
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER sermons_updated_at
  BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SERMON BOOKMARKS (members save/favorite sermons)
-- ============================================================
CREATE TABLE sermon_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sermon_id UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  notes TEXT, -- Personal notes about this sermon
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sermon_id)
);


-- ============================================================
-- SERMON COMMENTS
-- ============================================================
CREATE TABLE sermon_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_id UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES sermon_comments(id) ON DELETE CASCADE, -- Replies
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER sermon_comments_updated_at
  BEFORE UPDATE ON sermon_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MEDIA GALLERY
-- ============================================================
CREATE TABLE media_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INT,
  height INT,
  file_size_bytes BIGINT,
  album TEXT,
  event_id UUID, -- Link to an event (added after events table)
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER media_gallery_updated_at
  BEFORE UPDATE ON media_gallery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  cover_image_url TEXT,
  event_type event_type DEFAULT 'other',

  -- Location
  location_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  online_link TEXT, -- Zoom/Teams link
  map_url TEXT, -- Google Maps embed

  -- Schedule
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'Europe/London',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE

  -- Registration
  max_attendees INT,
  current_attendees INT DEFAULT 0,
  registration_required BOOLEAN DEFAULT FALSE,
  registration_deadline TIMESTAMPTZ,
  registration_fee DECIMAL(10, 2) DEFAULT 0,
  early_bird_fee DECIMAL(10, 2),
  early_bird_deadline TIMESTAMPTZ,

  -- Contact
  organizer_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Settings
  status event_status DEFAULT 'upcoming',
  is_featured BOOLEAN DEFAULT FALSE,
  show_on_homepage BOOLEAN DEFAULT FALSE,
  send_reminder_email BOOLEAN DEFAULT TRUE,
  reminder_days_before INT DEFAULT 1,
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK for media gallery → events
ALTER TABLE media_gallery
  ADD CONSTRAINT fk_media_event
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;


-- ============================================================
-- EVENT REGISTRATIONS
-- ============================================================
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Guest info (non-members)
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  number_of_guests INT DEFAULT 1,
  dietary_requirements TEXT,
  accessibility_needs TEXT,
  notes TEXT,

  -- Status
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_code TEXT UNIQUE,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,

  -- Payment (if event has fee)
  payment_status donation_status DEFAULT 'pending',
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  stripe_payment_id TEXT,

  -- Emails
  confirmation_email_sent BOOLEAN DEFAULT FALSE,
  reminder_email_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER event_registrations_updated_at
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_reg_confirmation_code
  BEFORE INSERT ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION generate_confirmation_code();


-- ============================================================
-- DONATION CATEGORIES
-- ============================================================
CREATE TABLE donation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Pre-select this one
  goal_amount DECIMAL(10, 2), -- Fundraising goal
  current_amount DECIMAL(10, 2) DEFAULT 0, -- Tracking
  show_progress BOOLEAN DEFAULT FALSE, -- Show progress bar
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER donation_categories_updated_at
  BEFORE UPDATE ON donation_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO donation_categories (name, slug, description, icon, sort_order) VALUES
  ('Tithe', 'tithe', 'Your faithful tithe to the church', '⛪', 1),
  ('Offering', 'offering', 'General church offering', '🙌', 2),
  ('Missions', 'missions', 'Support global and local missions', '🌍', 3),
  ('Building Fund', 'building-fund', 'Church building and infrastructure', '🏗️', 4),
  ('Youth Ministry', 'youth-ministry', 'Support youth programs and activities', '👦', 5),
  ('Benevolence', 'benevolence', 'Help those in need in our community', '❤️', 6),
  ('Special Seed', 'special-seed', 'Special thanksgiving or seed offering', '🌱', 7),
  ('First Fruit', 'first-fruit', 'First fruit offering', '🍇', 8);


-- ============================================================
-- DONATIONS
-- ============================================================
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES donation_categories(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'GBP',
  frequency donation_frequency DEFAULT 'one-time',

  -- Stripe
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  stripe_receipt_url TEXT,
  stripe_fee DECIMAL(10, 2), -- Track Stripe processing fee

  -- Donor info (anonymous/guest)
  donor_name TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_gift_aid BOOLEAN DEFAULT FALSE, -- UK tax relief
  gift_aid_declaration_date DATE,
  notes TEXT,

  -- Status
  status donation_status DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,

  -- Receipt
  receipt_number TEXT UNIQUE,
  receipt_email_sent BOOLEAN DEFAULT FALSE,
  receipt_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INT;
BEGIN
  IF NEW.receipt_number IS NULL AND NEW.status = 'completed' THEN
    year_str := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(receipt_number FROM 5) AS INT)
    ), 0) + 1 INTO next_num
    FROM donations
    WHERE receipt_number LIKE 'RCP-' || year_str || '-%';
    NEW.receipt_number := 'RCP-' || year_str || '-' || LPAD(next_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donations_receipt_number
  BEFORE INSERT OR UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();


-- ============================================================
-- RECURRING DONATIONS
-- ============================================================
CREATE TABLE recurring_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES donation_categories(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'GBP',
  frequency donation_frequency NOT NULL,
  is_gift_aid BOOLEAN DEFAULT FALSE,

  -- Stripe
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  total_donated DECIMAL(10, 2) DEFAULT 0,
  donation_count INT DEFAULT 0,
  next_payment_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  last_payment_status donation_status,
  failed_payment_count INT DEFAULT 0,

  -- Lifecycle
  started_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER recurring_donations_updated_at
  BEFORE UPDATE ON recurring_donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- GIVING STATEMENTS (annual/monthly summaries for members)
-- ============================================================
CREATE TABLE giving_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statement_year INT NOT NULL,
  statement_month INT, -- NULL = annual, 1-12 = monthly
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_gift_aid DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  donation_count INT DEFAULT 0,
  pdf_url TEXT, -- Generated PDF on Cloudinary
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, statement_year, statement_month)
);
