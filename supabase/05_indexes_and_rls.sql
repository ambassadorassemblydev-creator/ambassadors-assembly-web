-- ============================================================
-- PART 5: ALL INDEXES + ALL RLS POLICIES
-- Run this LAST in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- === Part 1: Auth & Members ===
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_last_name ON profiles(last_name);
CREATE INDEX idx_profiles_last_name_trgm ON profiles USING gin(last_name gin_trgm_ops);
CREATE INDEX idx_profiles_member_id ON profiles(member_id);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_is_member ON profiles(is_member) WHERE is_member = TRUE;
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_dob ON profiles(date_of_birth);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);

CREATE INDEX idx_member_milestones_user ON member_milestones(user_id);
CREATE INDEX idx_member_milestones_type ON member_milestones(milestone);
CREATE INDEX idx_member_milestones_date ON member_milestones(milestone_date);

CREATE INDEX idx_member_notes_member ON member_notes(member_id);
CREATE INDEX idx_member_notes_author ON member_notes(author_id);
CREATE INDEX idx_member_notes_followup ON member_notes(follow_up_date) WHERE is_follow_up_done = FALSE;

-- === Part 2: Sermons ===
CREATE INDEX idx_sermons_date ON sermons(sermon_date DESC);
CREATE INDEX idx_sermons_status ON sermons(status);
CREATE INDEX idx_sermons_speaker ON sermons(speaker_id);
CREATE INDEX idx_sermons_series ON sermons(series_id);
CREATE INDEX idx_sermons_slug ON sermons(slug);
CREATE INDEX idx_sermons_featured ON sermons(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_sermons_tags ON sermons USING gin(tags);

CREATE INDEX idx_sermon_series_slug ON sermon_series(slug);
CREATE INDEX idx_sermon_series_status ON sermon_series(status);

CREATE INDEX idx_sermon_bookmarks_user ON sermon_bookmarks(user_id);
CREATE INDEX idx_sermon_bookmarks_sermon ON sermon_bookmarks(sermon_id);

CREATE INDEX idx_sermon_comments_sermon ON sermon_comments(sermon_id);
CREATE INDEX idx_sermon_comments_user ON sermon_comments(user_id);
CREATE INDEX idx_sermon_comments_parent ON sermon_comments(parent_id);

CREATE INDEX idx_media_gallery_album ON media_gallery(album);
CREATE INDEX idx_media_gallery_event ON media_gallery(event_id);
CREATE INDEX idx_media_gallery_type ON media_gallery(media_type);

-- === Part 2: Events ===
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_events_homepage ON events(show_on_homepage) WHERE show_on_homepage = TRUE;

CREATE INDEX idx_event_regs_event ON event_registrations(event_id);
CREATE INDEX idx_event_regs_user ON event_registrations(user_id);
CREATE INDEX idx_event_regs_code ON event_registrations(confirmation_code);
CREATE INDEX idx_event_regs_email ON event_registrations(guest_email);

-- === Part 2: Donations ===
CREATE INDEX idx_donations_user ON donations(user_id);
CREATE INDEX idx_donations_category ON donations(category_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_paid_at ON donations(paid_at DESC);
CREATE INDEX idx_donations_stripe_pi ON donations(stripe_payment_intent_id);
CREATE INDEX idx_donations_receipt ON donations(receipt_number);
CREATE INDEX idx_donations_donor_email ON donations(donor_email);

CREATE INDEX idx_recurring_donations_user ON recurring_donations(user_id);
CREATE INDEX idx_recurring_donations_active ON recurring_donations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_donations_stripe ON recurring_donations(stripe_subscription_id);
CREATE INDEX idx_recurring_donations_next ON recurring_donations(next_payment_date);

CREATE INDEX idx_giving_statements_user ON giving_statements(user_id);
CREATE INDEX idx_giving_statements_year ON giving_statements(statement_year);

-- === Part 3: Prayer ===
CREATE INDEX idx_prayer_requests_user ON prayer_requests(user_id);
CREATE INDEX idx_prayer_requests_status ON prayer_requests(status);
CREATE INDEX idx_prayer_requests_category ON prayer_requests(category);
CREATE INDEX idx_prayer_requests_public ON prayer_requests(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_prayer_requests_approved ON prayer_requests(is_approved) WHERE is_approved = TRUE;
CREATE INDEX idx_prayer_requests_urgent ON prayer_requests(is_urgent) WHERE is_urgent = TRUE;

CREATE INDEX idx_prayer_updates_request ON prayer_updates(prayer_request_id);
CREATE INDEX idx_prayer_intercessors_request ON prayer_intercessors(prayer_request_id);
CREATE INDEX idx_prayer_intercessors_user ON prayer_intercessors(user_id);

-- === Part 3: Content ===
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_featured ON blog_posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_blog_posts_tags ON blog_posts USING gin(tags);

CREATE INDEX idx_announcements_active ON announcements(starts_at, expires_at) WHERE status = 'published';
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned) WHERE is_pinned = TRUE;

CREATE INDEX idx_testimonies_status ON testimonies(status);
CREATE INDEX idx_testimonies_approved ON testimonies(is_approved) WHERE is_approved = TRUE;
CREATE INDEX idx_testimonies_featured ON testimonies(is_featured) WHERE is_featured = TRUE;

CREATE INDEX idx_devotionals_date ON devotionals(devotional_date DESC);
CREATE INDEX idx_devotionals_status ON devotionals(status);

-- === Part 3: Community ===
CREATE INDEX idx_ministries_slug ON ministries(slug);
CREATE INDEX idx_ministries_active ON ministries(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ministries_leader ON ministries(leader_id);

CREATE INDEX idx_ministry_members_ministry ON ministry_members(ministry_id);
CREATE INDEX idx_ministry_members_user ON ministry_members(user_id);

CREATE INDEX idx_small_groups_type ON small_groups(group_type);
CREATE INDEX idx_small_groups_active ON small_groups(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_small_groups_leader ON small_groups(leader_id);

CREATE INDEX idx_small_group_members_group ON small_group_members(group_id);
CREATE INDEX idx_small_group_members_user ON small_group_members(user_id);

-- === Part 3: Church Info ===
CREATE INDEX idx_contact_unread ON contact_submissions(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_contact_department ON contact_submissions(department);

CREATE INDEX idx_newsletter_active ON newsletter_subscribers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);

CREATE INDEX idx_live_streams_scheduled ON live_streams(scheduled_start);
CREATE INDEX idx_live_streams_status ON live_streams(status);

CREATE INDEX idx_visitor_cards_date ON visitor_cards(visit_date DESC);
CREATE INDEX idx_visitor_cards_uncontacted ON visitor_cards(is_contacted) WHERE is_contacted = FALSE;
CREATE INDEX idx_visitor_cards_email ON visitor_cards(email);
CREATE INDEX idx_visitor_cards_surname ON visitor_cards(last_name);

CREATE INDEX idx_church_settings_key ON church_settings(key);
CREATE INDEX idx_church_settings_category ON church_settings(category);

CREATE INDEX idx_leadership_active ON leadership_team(is_active) WHERE is_active = TRUE;

-- === Part 4: Workers ===
CREATE INDEX idx_church_departments_slug ON church_departments(slug);
CREATE INDEX idx_church_positions_dept ON church_positions(department_id);
CREATE INDEX idx_church_positions_active ON church_positions(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_church_workers_user ON church_workers(user_id);
CREATE INDEX idx_church_workers_position ON church_workers(position_id);
CREATE INDEX idx_church_workers_dept ON church_workers(department_id);
CREATE INDEX idx_church_workers_status ON church_workers(status);
CREATE INDEX idx_church_workers_worker_id ON church_workers(worker_id);
CREATE INDEX idx_church_workers_dbs_expiry ON church_workers(dbs_expiry_date);

CREATE INDEX idx_worker_schedules_worker ON worker_schedules(worker_id);
CREATE INDEX idx_worker_schedules_date ON worker_schedules(schedule_date);
CREATE INDEX idx_worker_schedules_dept ON worker_schedules(department_id);

CREATE INDEX idx_volunteer_apps_user ON volunteer_applications(user_id);
CREATE INDEX idx_volunteer_apps_position ON volunteer_applications(position_id);
CREATE INDEX idx_volunteer_apps_status ON volunteer_applications(status);

CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_date ON attendance_records(service_date DESC);
CREATE INDEX idx_attendance_service ON attendance_records(service_name);

-- === Part 4: System ===
CREATE INDEX idx_family_matches_user1 ON potential_family_matches(user_id_1);
CREATE INDEX idx_family_matches_user2 ON potential_family_matches(user_id_2);
CREATE INDEX idx_family_matches_surname ON potential_family_matches(shared_surname);
CREATE INDEX idx_family_matches_status ON potential_family_matches(status);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX idx_email_log_recipient ON email_log(recipient_email);
CREATE INDEX idx_email_log_user ON email_log(recipient_user_id);
CREATE INDEX idx_email_log_template ON email_log(template_name);
CREATE INDEX idx_email_log_status ON email_log(status);
CREATE INDEX idx_email_log_related ON email_log(related_type, related_id);
CREATE INDEX idx_email_log_resend ON email_log(resend_email_id);
CREATE INDEX idx_email_log_retry ON email_log(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

CREATE INDEX idx_scheduled_jobs_name ON scheduled_jobs(job_name);
CREATE INDEX idx_scheduled_jobs_active ON scheduled_jobs(is_active) WHERE is_active = TRUE;


-- ============================================================
-- ROW LEVEL SECURITY — ENABLE ON ALL TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE giving_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_intercessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE small_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE small_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadership_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE potential_family_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS HELPER: Check if user has a specific role
-- ============================================================
CREATE OR REPLACE FUNCTION user_has_role(p_role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = p_role_name
      AND ur.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role('super_admin') OR user_has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is pastor or above
CREATE OR REPLACE FUNCTION is_pastor_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin() OR user_has_role('pastor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is a worker
CREATE OR REPLACE FUNCTION is_worker()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM church_workers
    WHERE user_id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================
-- RLS POLICIES: PUBLIC READ (anyone, even anonymous)
-- ============================================================

-- Published sermons
CREATE POLICY "anon_read_sermons" ON sermons
  FOR SELECT USING (status = 'published');

CREATE POLICY "anon_read_sermon_series" ON sermon_series
  FOR SELECT USING (status = 'published');

CREATE POLICY "anon_read_speakers" ON sermon_speakers
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "anon_read_media" ON media_gallery
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "anon_read_events" ON events
  FOR SELECT USING (status != 'cancelled');

CREATE POLICY "anon_read_donation_cats" ON donation_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "anon_read_public_prayers" ON prayer_requests
  FOR SELECT USING (is_public = TRUE AND is_approved = TRUE AND status != 'closed');

CREATE POLICY "anon_read_blog_cats" ON blog_categories
  FOR SELECT USING (TRUE);

CREATE POLICY "anon_read_blog_posts" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "anon_read_announcements" ON announcements
  FOR SELECT USING (
    status = 'published'
    AND starts_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "anon_read_testimonies" ON testimonies
  FOR SELECT USING (is_approved = TRUE AND status = 'published');

CREATE POLICY "anon_read_devotionals" ON devotionals
  FOR SELECT USING (status = 'published');

CREATE POLICY "anon_read_ministries" ON ministries
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "anon_read_small_groups" ON small_groups
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "anon_read_service_times" ON service_times
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "anon_read_leadership" ON leadership_team
  FOR SELECT USING (is_active = TRUE AND show_on_website = TRUE);

CREATE POLICY "anon_read_live_streams" ON live_streams
  FOR SELECT USING (TRUE);

CREATE POLICY "anon_read_settings" ON church_settings
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "anon_read_departments" ON church_departments
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "anon_read_positions" ON church_positions
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "anon_read_roles" ON roles
  FOR SELECT USING (TRUE);

CREATE POLICY "anon_read_sermon_comments" ON sermon_comments
  FOR SELECT USING (is_approved = TRUE);


-- ============================================================
-- RLS POLICIES: PUBLIC INSERT (anyone can submit)
-- ============================================================

CREATE POLICY "anon_submit_contact" ON contact_submissions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "anon_subscribe_newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "anon_submit_visitor_card" ON visitor_cards
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "anon_submit_prayer" ON prayer_requests
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "anon_register_event" ON event_registrations
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "anon_create_donation" ON donations
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "anon_submit_testimony" ON testimonies
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "anon_apply_volunteer" ON volunteer_applications
  FOR INSERT WITH CHECK (TRUE);


-- ============================================================
-- RLS POLICIES: AUTHENTICATED USER — OWN DATA
-- ============================================================

-- Profile: view and update own
CREATE POLICY "user_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- User roles: view own
CREATE POLICY "user_read_own_roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Donations: view own
CREATE POLICY "user_read_own_donations" ON donations
  FOR SELECT USING (auth.uid() = user_id);

-- Recurring donations: view and update own
CREATE POLICY "user_read_own_recurring" ON recurring_donations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_update_own_recurring" ON recurring_donations
  FOR UPDATE USING (auth.uid() = user_id);

-- Giving statements: view own
CREATE POLICY "user_read_own_statements" ON giving_statements
  FOR SELECT USING (auth.uid() = user_id);

-- Prayer: update own requests
CREATE POLICY "user_read_own_prayers" ON prayer_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_update_own_prayers" ON prayer_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- Sermon bookmarks: full CRUD on own
CREATE POLICY "user_read_own_bookmarks" ON sermon_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_insert_bookmarks" ON sermon_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_delete_own_bookmarks" ON sermon_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Sermon comments: insert own, update own
CREATE POLICY "user_insert_comments" ON sermon_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_comments" ON sermon_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_delete_own_comments" ON sermon_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Prayer intercessors: insert own
CREATE POLICY "user_insert_intercessor" ON prayer_intercessors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_read_own_intercessor" ON prayer_intercessors
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications: own only
CREATE POLICY "user_read_own_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_update_own_notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Event registrations: view own
CREATE POLICY "user_read_own_event_regs" ON event_registrations
  FOR SELECT USING (auth.uid() = user_id);

-- Family matches: view own
CREATE POLICY "user_read_own_family_matches" ON potential_family_matches
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "user_update_own_family_matches" ON potential_family_matches
  FOR UPDATE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Family groups: view own
CREATE POLICY "user_read_own_family_groups" ON family_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm WHERE fm.family_id = id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "user_read_own_family_members" ON family_members
  FOR SELECT USING (auth.uid() = user_id);

-- Small group memberships: view own
CREATE POLICY "user_read_own_group_memberships" ON small_group_members
  FOR SELECT USING (auth.uid() = user_id);

-- Ministry memberships: view own
CREATE POLICY "user_read_own_ministry_memberships" ON ministry_members
  FOR SELECT USING (auth.uid() = user_id);

-- Member milestones: view own
CREATE POLICY "user_read_own_milestones" ON member_milestones
  FOR SELECT USING (auth.uid() = user_id);

-- Attendance: view own
CREATE POLICY "user_read_own_attendance" ON attendance_records
  FOR SELECT USING (auth.uid() = user_id);

-- Worker data: view own
CREATE POLICY "worker_read_own_data" ON church_workers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "worker_read_own_schedule" ON worker_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "worker_update_own_schedule" ON worker_schedules
  FOR UPDATE USING (auth.uid() = user_id);

-- Volunteer applications: view own
CREATE POLICY "user_read_own_applications" ON volunteer_applications
  FOR SELECT USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: ADMIN — FULL ACCESS
-- ============================================================

CREATE POLICY "admin_all_profiles" ON profiles FOR ALL USING (is_admin());
CREATE POLICY "admin_all_user_roles" ON user_roles FOR ALL USING (is_admin());
CREATE POLICY "admin_all_roles" ON roles FOR ALL USING (is_admin());
CREATE POLICY "admin_all_family_groups" ON family_groups FOR ALL USING (is_admin());
CREATE POLICY "admin_all_family_members" ON family_members FOR ALL USING (is_admin());
CREATE POLICY "admin_all_milestones" ON member_milestones FOR ALL USING (is_admin());
CREATE POLICY "admin_all_member_notes" ON member_notes FOR ALL USING (is_pastor_or_above());
CREATE POLICY "admin_all_sermons" ON sermons FOR ALL USING (is_admin());
CREATE POLICY "admin_all_sermon_series" ON sermon_series FOR ALL USING (is_admin());
CREATE POLICY "admin_all_speakers" ON sermon_speakers FOR ALL USING (is_admin());
CREATE POLICY "admin_all_sermon_comments" ON sermon_comments FOR ALL USING (is_admin());
CREATE POLICY "admin_all_media" ON media_gallery FOR ALL USING (is_admin());
CREATE POLICY "admin_all_events" ON events FOR ALL USING (is_admin());
CREATE POLICY "admin_all_event_regs" ON event_registrations FOR ALL USING (is_admin());
CREATE POLICY "admin_all_donation_cats" ON donation_categories FOR ALL USING (is_admin());
CREATE POLICY "admin_all_donations" ON donations FOR ALL USING (is_admin());
CREATE POLICY "admin_all_recurring" ON recurring_donations FOR ALL USING (is_admin());
CREATE POLICY "admin_all_statements" ON giving_statements FOR ALL USING (is_admin());
CREATE POLICY "admin_all_prayers" ON prayer_requests FOR ALL USING (is_pastor_or_above());
CREATE POLICY "admin_all_prayer_updates" ON prayer_updates FOR ALL USING (is_pastor_or_above());
CREATE POLICY "admin_all_intercessors" ON prayer_intercessors FOR ALL USING (is_admin());
CREATE POLICY "admin_all_blog_cats" ON blog_categories FOR ALL USING (is_admin());
CREATE POLICY "admin_all_blog_posts" ON blog_posts FOR ALL USING (is_admin());
CREATE POLICY "admin_all_announcements" ON announcements FOR ALL USING (is_admin());
CREATE POLICY "admin_all_testimonies" ON testimonies FOR ALL USING (is_admin());
CREATE POLICY "admin_all_devotionals" ON devotionals FOR ALL USING (is_pastor_or_above());
CREATE POLICY "admin_all_ministries" ON ministries FOR ALL USING (is_admin());
CREATE POLICY "admin_all_ministry_members" ON ministry_members FOR ALL USING (is_admin());
CREATE POLICY "admin_all_small_groups" ON small_groups FOR ALL USING (is_admin());
CREATE POLICY "admin_all_small_group_members" ON small_group_members FOR ALL USING (is_admin());
CREATE POLICY "admin_all_service_times" ON service_times FOR ALL USING (is_admin());
CREATE POLICY "admin_all_leadership" ON leadership_team FOR ALL USING (is_admin());
CREATE POLICY "admin_all_contacts" ON contact_submissions FOR ALL USING (is_admin());
CREATE POLICY "admin_all_newsletter" ON newsletter_subscribers FOR ALL USING (is_admin());
CREATE POLICY "admin_all_streams" ON live_streams FOR ALL USING (is_admin());
CREATE POLICY "admin_all_visitors" ON visitor_cards FOR ALL USING (is_admin());
CREATE POLICY "admin_all_settings" ON church_settings FOR ALL USING (is_admin());
CREATE POLICY "admin_all_departments" ON church_departments FOR ALL USING (is_admin());
CREATE POLICY "admin_all_positions" ON church_positions FOR ALL USING (is_admin());
CREATE POLICY "admin_all_workers" ON church_workers FOR ALL USING (is_admin());
CREATE POLICY "admin_all_schedules" ON worker_schedules FOR ALL USING (is_admin());
CREATE POLICY "admin_all_vol_apps" ON volunteer_applications FOR ALL USING (is_admin());
CREATE POLICY "admin_all_attendance" ON attendance_records FOR ALL USING (is_admin());
CREATE POLICY "admin_all_family_matches" ON potential_family_matches FOR ALL USING (is_admin());
CREATE POLICY "admin_all_notifications" ON notifications FOR ALL USING (is_admin());
CREATE POLICY "admin_all_email_log" ON email_log FOR ALL USING (is_admin());
CREATE POLICY "admin_all_scheduled_jobs" ON scheduled_jobs FOR ALL USING (is_admin());
CREATE POLICY "admin_all_audit_log" ON audit_log FOR ALL USING (is_admin());


-- ============================================================
-- ADD 'worker' ROLE TO ROLES TABLE (if not already seeded)
-- ============================================================
INSERT INTO roles (name, description, is_system_role, permissions) VALUES
  ('worker', 'Church worker/volunteer — department access and rota', FALSE,
    '{"view_own_schedule": true, "view_own_department": true, "check_in_attendance": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- DONE! All indexes and RLS policies applied. 🎉
-- ============================================================
