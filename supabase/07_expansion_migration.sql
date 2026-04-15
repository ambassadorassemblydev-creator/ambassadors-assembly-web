-- Migration 07: Platform Expansion & Cinematic Details (v3 - Safe Alter)
-- Description: Handles RLS policy dependencies before altering numeric precision.

-- 1. Drop dependent policy on donations
DROP POLICY IF EXISTS anon_create_donation ON donations;

-- 2. Increase precision for donation amount columns
ALTER TABLE donation_categories ALTER COLUMN goal_amount TYPE NUMERIC(20, 2);
ALTER TABLE donation_categories ALTER COLUMN current_amount TYPE NUMERIC(20, 2);
ALTER TABLE donations ALTER COLUMN amount TYPE NUMERIC(20, 2);

-- 3. Re-create the policy (keeping same logic: amount > 0)
CREATE POLICY anon_create_donation ON donations
  FOR INSERT 
  WITH CHECK (amount > 0);

-- 4. Add cinematic columns to donation_categories (using safety checks)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donation_categories' AND column_name='long_description') THEN
        ALTER TABLE donation_categories ADD COLUMN long_description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donation_categories' AND column_name='media_urls') THEN
        ALTER TABLE donation_categories ADD COLUMN media_urls JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donation_categories' AND column_name='quote') THEN
        ALTER TABLE donation_categories ADD COLUMN quote TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donation_categories' AND column_name='quote_author') THEN
        ALTER TABLE donation_categories ADD COLUMN quote_author TEXT;
    END IF;
END $$;

-- 5. Seed Cinematic Building Projects
-- Wipe existing building-fund slugs to ensure fresh seeding
DELETE FROM donation_categories WHERE slug LIKE 'building-fund-%';

INSERT INTO donation_categories (name, slug, description, icon, is_active, goal_amount, current_amount, show_progress, sort_order, long_description, media_urls, quote, quote_author)
VALUES 
(
    'The Great Cathedral', 
    'building-fund-cathedral', 
    'Funding the main sanctuary expansion.', 
    '🏛️', 
    true, 
    500000000, 
    125000000, 
    true, 
    1, 
    'The Great Cathedral is more than a building; it is a monument to God''s faithfulness. With a seating capacity of 10,000, specialized acoustic engineering, and a focus on global broadcasting, this structure will serve as our primary portal for kingdom advancement.',
    '["https://images.unsplash.com/photo-1548625361-1250d4d62261?q=80&w=2000", "https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=2000"]',
    'We are not building for ourselves, but for the generations that will find their purpose within these walls.',
    'Presiding Pastor'
),
(
    'Ambassadors Youth Hub', 
    'building-fund-youth-hub', 
    'A state-of-the-art center for our youth.', 
    '🎮', 
    true, 
    150000000, 
    45000000, 
    true, 
    2, 
    'The Youth Hub is designed to be a safe, creative, and spiritually charged environment for the next generation. Featuring recording studios, tech labs, and a dynamic worship space, it aims to empower young ambassadors for world impact.',
    '["https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2000", "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000"]',
    'Invest in the youth today, and you secure the kingdom legacy of tomorrow.',
    'Executive Pastor'
),
(
    'Missionary Transit Home', 
    'building-fund-transit-home', 
    'Providing rest for our global missionaries.', 
    '🏡', 
    true, 
    75000000, 
    15000000, 
    true, 
    3, 
    'This facility will provide a home away from home for our global missionaries and transiting ministers. It is a place of rest, refocusing, and rejuvenation before they return to the frontlines of the gospel.',
    '["https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2000", "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2000"]',
    'The laborer is worthy of his hire, and the servant of God is worthy of rest.',
    'Administrative Pastor'
);
