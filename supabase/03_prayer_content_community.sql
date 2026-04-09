-- ============================================================
-- PART 3: PRAYER, CONTENT, COMMUNITY, CHURCH INFO
-- Run this THIRD in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- PRAYER REQUESTS
-- ============================================================
CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Requester info (non-members too)
  requester_name TEXT,
  requester_email TEXT,
  requester_phone TEXT,

  -- Prayer details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category prayer_category DEFAULT 'other',
  scripture_reference TEXT, -- Related scripture

  -- Settings
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE, -- Show on prayer wall
  is_urgent BOOLEAN DEFAULT FALSE,

  -- Engagement
  prayer_count INT DEFAULT 0, -- "I prayed" counter
  share_count INT DEFAULT 0,

  -- Status
  status prayer_status DEFAULT 'pending',
  answered_at TIMESTAMPTZ,
  answer_testimony TEXT, -- How God answered

  -- Admin
  is_approved BOOLEAN DEFAULT FALSE, -- Admin must approve for prayer wall
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,

  -- Email
  confirmation_email_sent BOOLEAN DEFAULT FALSE,
  answered_email_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER prayer_requests_updated_at
  BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PRAYER UPDATES (follow-ups)
-- ============================================================
CREATE TABLE prayer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER prayer_updates_updated_at
  BEFORE UPDATE ON prayer_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PRAYER INTERCESSORS ("I prayed for this" tracking)
-- ============================================================
CREATE TABLE prayer_intercessors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prayed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prayer_request_id, user_id)
);

-- Auto-increment prayer_count when someone prays
CREATE OR REPLACE FUNCTION increment_prayer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prayer_requests
  SET prayer_count = prayer_count + 1
  WHERE id = NEW.prayer_request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_prayer_intercessor_added
  AFTER INSERT ON prayer_intercessors
  FOR EACH ROW EXECUTE FUNCTION increment_prayer_count();


-- ============================================================
-- BLOG CATEGORIES
-- ============================================================
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT, -- Hex color for UI
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO blog_categories (name, slug, sort_order) VALUES
  ('Devotionals', 'devotionals', 1),
  ('Church News', 'church-news', 2),
  ('Testimonies', 'testimonies', 3),
  ('Leadership', 'leadership', 4),
  ('Community', 'community', 5),
  ('Youth', 'youth', 6),
  ('Missions Update', 'missions-update', 7);


-- ============================================================
-- BLOG POSTS
-- ============================================================
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT, -- Cached for display

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,

  -- Engagement
  status content_status DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT TRUE,
  read_time_minutes INT,
  view_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  tags TEXT[],

  -- Schedule
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- Email
  send_to_newsletter BOOLEAN DEFAULT FALSE,
  newsletter_sent BOOLEAN DEFAULT FALSE,
  newsletter_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INT DEFAULT 0,
  image_url TEXT,
  link_url TEXT,
  link_text TEXT,
  display_location TEXT DEFAULT 'all', -- 'all', 'homepage', 'dashboard'
  is_pinned BOOLEAN DEFAULT FALSE,
  is_banner BOOLEAN DEFAULT FALSE, -- Show as top banner
  banner_color TEXT, -- Hex color for banner
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status content_status DEFAULT 'published',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TESTIMONIES
-- ============================================================
CREATE TABLE testimonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_photo_url TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  short_quote TEXT, -- Pull quote for cards
  photo_url TEXT,
  video_url TEXT,
  category TEXT, -- 'healing', 'provision', 'salvation', 'deliverance', 'general'
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  status content_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER testimonies_updated_at
  BEFORE UPDATE ON testimonies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- DEVOTIONALS (daily/weekly)
-- ============================================================
CREATE TABLE devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scripture_reference TEXT NOT NULL,
  scripture_text TEXT,
  reflection TEXT NOT NULL,
  prayer TEXT,
  confession TEXT, -- Daily confession/declaration
  action_point TEXT, -- Practical application
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  devotional_date DATE NOT NULL UNIQUE,
  cover_image_url TEXT,
  audio_url TEXT, -- Audio version
  status content_status DEFAULT 'published',
  view_count INT DEFAULT 0,

  -- Email
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER devotionals_updated_at
  BEFORE UPDATE ON devotionals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MINISTRIES
-- ============================================================
CREATE TABLE ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  vision TEXT,
  cover_image_url TEXT,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  co_leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  meeting_day TEXT,
  meeting_time TEXT,
  meeting_location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  member_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_accepting_members BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  requirements TEXT, -- Who can join
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER ministries_updated_at
  BEFORE UPDATE ON ministries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MINISTRY MEMBERS
-- ============================================================
CREATE TABLE ministry_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'leader', 'co-leader', 'secretary', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ministry_id, user_id)
);

CREATE TRIGGER ministry_members_updated_at
  BEFORE UPDATE ON ministry_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SMALL GROUPS / CELL GROUPS
-- ============================================================
CREATE TABLE small_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  co_leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_type TEXT DEFAULT 'general', -- general, youth, women, men, couples, young_adults
  meeting_day TEXT,
  meeting_time TEXT,
  meeting_location TEXT,
  area TEXT, -- Geographic area
  is_online BOOLEAN DEFAULT FALSE,
  meeting_link TEXT,
  max_members INT DEFAULT 12,
  current_members INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_accepting_members BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER small_groups_updated_at
  BEFORE UPDATE ON small_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SMALL GROUP MEMBERS
-- ============================================================
CREATE TABLE small_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES small_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TRIGGER small_group_members_updated_at
  BEFORE UPDATE ON small_group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SERVICE TIMES
-- ============================================================
CREATE TABLE service_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  description TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  stream_link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER service_times_updated_at
  BEFORE UPDATE ON service_times
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO service_times (name, day_of_week, start_time, end_time, sort_order) VALUES
  ('Sunday Morning Service', 'Sunday', '10:00', '12:00', 1),
  ('Wednesday Bible Study', 'Wednesday', '19:00', '20:30', 2),
  ('Friday Prayer Meeting', 'Friday', '19:00', '21:00', 3);


-- ============================================================
-- LEADERSHIP TEAM
-- ============================================================
CREATE TABLE leadership_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  role_description TEXT,
  bio TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  social_facebook TEXT,
  social_instagram TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  show_on_website BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER leadership_team_updated_at
  BEFORE UPDATE ON leadership_team
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- CONTACT SUBMISSIONS
-- ============================================================
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  department TEXT DEFAULT 'general', -- 'general', 'pastoral', 'youth', 'admin'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_replied BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reply_notes TEXT,
  is_spam BOOLEAN DEFAULT FALSE,
  ip_address INET,

  -- Auto-reply
  auto_reply_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'website',
  ip_address INET,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,
  bounce_count INT DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  last_email_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER newsletter_subscribers_updated_at
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- LIVE STREAMS
-- ============================================================
CREATE TABLE live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  stream_url TEXT,
  embed_url TEXT,
  platform TEXT DEFAULT 'youtube', -- youtube, facebook, custom
  thumbnail_url TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status stream_status DEFAULT 'scheduled',
  viewer_count INT DEFAULT 0,
  peak_viewers INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  chat_enabled BOOLEAN DEFAULT TRUE,
  recording_url TEXT, -- After stream ends
  notify_subscribers BOOLEAN DEFAULT TRUE,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER live_streams_updated_at
  BEFORE UPDATE ON live_streams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- VISITOR CARDS (first-time visitors)
-- ============================================================
CREATE TABLE visitor_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  date_of_birth DATE,
  how_did_you_hear visitor_source DEFAULT 'other',
  how_did_you_hear_other TEXT,
  prayer_request TEXT,
  want_more_info BOOLEAN DEFAULT FALSE,
  want_to_join_group BOOLEAN DEFAULT FALSE,
  want_to_volunteer BOOLEAN DEFAULT FALSE,
  want_newsletter BOOLEAN DEFAULT FALSE,
  visited_service TEXT, -- Which service they attended
  visit_date DATE DEFAULT CURRENT_DATE,

  -- Follow-up tracking
  is_contacted BOOLEAN DEFAULT FALSE,
  contacted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contacted_at TIMESTAMPTZ,
  contact_method TEXT, -- 'phone', 'email', 'visit', 'text'
  follow_up_notes TEXT,
  second_visit BOOLEAN DEFAULT FALSE,
  converted_to_member BOOLEAN DEFAULT FALSE,
  converted_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Welcome email
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  welcome_email_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER visitor_cards_updated_at
  BEFORE UPDATE ON visitor_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- CHURCH SETTINGS (key-value config)
-- ============================================================
CREATE TABLE church_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  value_type TEXT DEFAULT 'string', -- 'string', 'boolean', 'number', 'json'
  category TEXT DEFAULT 'general', -- 'general', 'social', 'email', 'features', 'branding'
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE, -- Visible to frontend?
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER church_settings_updated_at
  BEFORE UPDATE ON church_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO church_settings (key, value, category, description) VALUES
  -- General
  ('church_name', 'Ambassadors Assembly', 'general', 'Church display name'),
  ('church_tagline', 'Ambassadors for Christ', 'general', 'Church tagline/motto'),
  ('church_description', '', 'general', 'About the church (for SEO)'),
  ('church_email', '', 'general', 'Main contact email'),
  ('church_phone', '', 'general', 'Main contact phone'),
  ('church_address', '', 'general', 'Physical address'),
  ('church_city', '', 'general', 'City'),
  ('church_postcode', '', 'general', 'Postal code'),
  ('church_country', 'United Kingdom', 'general', 'Country'),
  ('church_latitude', '', 'general', 'Map latitude'),
  ('church_longitude', '', 'general', 'Map longitude'),

  -- Branding
  ('logo_url', '', 'branding', 'Church logo (Cloudinary)'),
  ('favicon_url', '', 'branding', 'Favicon URL'),
  ('primary_color', '#1a1a2e', 'branding', 'Primary brand color'),
  ('secondary_color', '#e94560', 'branding', 'Secondary brand color'),

  -- Social
  ('social_facebook', '', 'social', 'Facebook page URL'),
  ('social_instagram', '', 'social', 'Instagram profile URL'),
  ('social_youtube', '', 'social', 'YouTube channel URL'),
  ('social_twitter', '', 'social', 'Twitter/X profile URL'),
  ('social_tiktok', '', 'social', 'TikTok profile URL'),
  ('social_whatsapp', '', 'social', 'WhatsApp group/number'),

  -- Features toggles
  ('donations_enabled', 'true', 'features', 'Enable/disable donations'),
  ('prayer_wall_enabled', 'true', 'features', 'Enable public prayer wall'),
  ('live_stream_enabled', 'false', 'features', 'Show live stream banner'),
  ('blog_enabled', 'true', 'features', 'Enable blog section'),
  ('testimonies_enabled', 'true', 'features', 'Enable testimonies page'),
  ('member_registration_enabled', 'true', 'features', 'Allow new member signups'),
  ('event_registration_enabled', 'true', 'features', 'Allow event registration'),
  ('maintenance_mode', 'false', 'features', 'Put site in maintenance mode'),
  ('maintenance_message', 'We are currently updating our website. Please check back soon.', 'features', 'Maintenance mode message'),

  -- Email
  ('email_from_name', 'Ambassadors Assembly', 'email', 'Email sender name'),
  ('email_from_address', '', 'email', 'Email sender address'),
  ('email_reply_to', '', 'email', 'Email reply-to address');
