-- ==========================================
-- Ambassadors Assembly Admin Hub Seed Script
-- ==========================================

-- 1. EXTEND EXISTING TABLES
-- -------------------------

-- Add category and deadline to donation_categories for Giving Goals
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donation_categories' AND column_name='category') THEN
        ALTER TABLE public.donation_categories ADD COLUMN category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donation_categories' AND column_name='deadline') THEN
        ALTER TABLE public.donation_categories ADD COLUMN deadline DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donation_categories' AND column_name='donor_count') THEN
        ALTER TABLE public.donation_categories ADD COLUMN donor_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. CREATE MISSING TABLES
-- ------------------------

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo', -- todo, in-progress, review, done
    priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Urgent
    assignee TEXT, -- Simplified to TEXT to match mock names for now
    due_date DATE,
    category TEXT,
    subtasks JSONB DEFAULT '[]',
    comments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Resources Table
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT, -- PDF, Video, Doc, Link
    size TEXT,
    category TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'completed',
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SEED DATA
-- ------------

-- Seed Donation Categories (Giving Goals)
INSERT INTO public.donation_categories (name, goal_amount, current_amount, category, deadline, donor_count, is_active)
VALUES 
('New Auditorium Sound System', 25000, 18450, 'Infrastructure', '2026-06-30', 156, true),
('Youth Summer Camp 2026', 12000, 9200, 'Ministry', '2026-05-15', 84, true),
('Community Food Bank Drive', 5000, 4850, 'Outreach', '2026-04-30', 210, true),
('Mission Trip: East Africa', 45000, 12000, 'Missions', '2026-08-20', 42, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Tasks
INSERT INTO public.tasks (title, description, status, priority, assignee, due_date, category, subtasks, comments)
VALUES 
('Prepare Sunday Sermon Slides', 'Create visual aids for the upcoming sermon on "Faith and Perseverance". Include key scriptures and high-quality images.', 'todo', 'High', 'Pastor John', '2026-04-19', 'Ministry', '[{"id": "s1", "title": "Gather scriptures", "completed": true}, {"id": "s2", "title": "Find background images", "completed": false}, {"id": "s3", "title": "Review with Media Team", "completed": false}]'::jsonb, '[{"id": "c1", "user": "Sarah M.", "text": "I have some high-res photos from the last outreach if you need them.", "date": "2026-04-14"}]'::jsonb),
('Update Media Gallery', 'Upload photos from the Easter service to the website and social media platforms.', 'in-progress', 'Medium', 'Sarah M.', '2026-04-16', 'Media', '[{"id": "s4", "title": "Select best photos", "completed": true}, {"id": "s5", "title": "Edit and resize", "completed": true}, {"id": "s6", "title": "Upload to website", "completed": false}]'::jsonb, '[]'::jsonb),
('Coordinate Youth Outreach', 'Plan the logistics for the Saturday community outreach program. Need to confirm transportation and food.', 'review', 'High', 'David K.', '2026-04-20', 'Outreach', '[]'::jsonb, '[]'::jsonb),
('Financial Report Q1', 'Compile all departmental expenses and income for the first quarter of 2026.', 'done', 'Medium', 'Admin', '2026-04-10', 'Finance', '[{"id": "s7", "title": "Gather receipts", "completed": true}, {"id": "s8", "title": "Reconcile bank statements", "completed": true}, {"id": "s9", "title": "Generate PDF report", "completed": true}]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed Resources
INSERT INTO public.resources (title, type, size, category, url)
VALUES 
('Church Leadership Handbook 2026', 'PDF', '2.4 MB', 'Governance', '#'),
('Easter Service Highlights', 'Video', '450 MB', 'Media', '#'),
('Annual Financial Report', 'PDF', '1.8 MB', 'Finance', '#'),
('Ministry Outreach Templates', 'Doc', '120 KB', 'Templates', '#')
ON CONFLICT (id) DO NOTHING;

-- Seed Reports
INSERT INTO public.reports (title, type, date, status, url)
VALUES 
('Monthly Attendance Summary - March', 'Attendance', '2026-03-31', 'completed', '#'),
('Q1 Revenue & Expenses', 'Financial', '2026-04-05', 'completed', '#'),
('Volunteer Engagement Report', 'Ministry', '2026-04-10', 'completed', '#'),
('System Uptime Analytics', 'System', '2026-04-15', 'completed', '#')
ON CONFLICT (id) DO NOTHING;
