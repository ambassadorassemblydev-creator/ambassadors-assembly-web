-- ============================================================
-- PART 6: SEED HARDCODED DATA FROM WEBSITE UI
-- Run this in Supabase SQL Editor to populate the dynamic elements
-- ============================================================

-- ------------------------------------------------------------
-- 1. SEED MINISTRIES
-- Data extracted from the Ministry cards on index.ejs
-- ------------------------------------------------------------
INSERT INTO ministries (name, slug, description, cover_image_url, sort_order) VALUES 
('Kids Ministry', 'kids-ministry', 'Helping kids discover the transforming power of Jesus.', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/unnamed-2880w.webp', 1),
('Youth Ministry', 'youth-ministry', 'Where students can experience God and grow a relationship with Him.', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/9-11-yth_photos-1-2880w.webp', 2),
('18|28 Young Adults', 'young-adults-ministry', 'Where the future generation can find Christ & community.', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/2H2A0124-2880w.webp', 3),
('Men''s Ministry', 'mens-ministry', 'To help you discover your strengths as a husband, son, father, or leader.', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/mens-conference--24_photos-8.webp', 4),
('Women''s Ministry', 'womens-ministry', 'A community of women who empower and lead one another to Christ.', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/1-30-25-womens-conference_photos-37.webp', 5)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 2. SEED RECENT SERMONS
-- Data extracted from the "In Case You Missed" section
-- NOTE: sermon_date is required, so dummy past dates are assigned.
-- ------------------------------------------------------------
INSERT INTO sermons (title, slug, thumbnail_url, sermon_date, status) VALUES 
('Walking in Purpose', 'walking-in-purpose', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/2H2A0124-2880w.webp', CURRENT_DATE - INTERVAL '7 days', 'published'),
('Faith That Speaks & Sees', 'faith-that-speaks-and-sees', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/mens-conference--24_photos-8.webp', CURRENT_DATE - INTERVAL '14 days', 'published'),
('Unwavering Faith', 'unwavering-faith', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/9-11-yth_photos-1-2880w.webp', CURRENT_DATE - INTERVAL '21 days', 'published'),
('The Power of Grace', 'the-power-of-grace', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/1-30-25-womens-conference_photos-37.webp', CURRENT_DATE - INTERVAL '28 days', 'published'),
('Love Beyond Measure', 'love-beyond-measure', 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/unnamed-2880w.webp', CURRENT_DATE - INTERVAL '35 days', 'published')
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 3. SEED UPCOMING EVENTS
-- Data extracted from the Event Cards
-- NOTE: start_date is required by the schema, so dummy upcoming dates are assigned.
-- ------------------------------------------------------------
INSERT INTO events (title, slug, cover_image_url, start_date, status, event_type) VALUES 
('Child Dedication', 'child-dedication', 'https://lirp.cdn-website.com/23c7a45a/dms3rep/multi/opt/baby-dedi-1920w-1920w.webp', CURRENT_DATE + INTERVAL '5 days', 'upcoming', 'service'),
('Newcomer''s Pizza With The Pastor', 'newcomers-pizza', 'https://lirp.cdn-website.com/23c7a45a/dms3rep/multi/opt/Newcomer-s-Pizza-With-The-Pastor-Square-1920w-1920w.webp', CURRENT_DATE + INTERVAL '10 days', 'upcoming', 'fellowship'),
('First Wednesday Service', 'first-wednesday-service', 'https://lirp.cdn-website.com/23c7a45a/dms3rep/multi/opt/first+wednesday+website+square-1920w.png', CURRENT_DATE + INTERVAL '14 days', 'upcoming', 'service'),
('Growth Track', 'growth-track', 'https://lirp.cdn-website.com/23c7a45a/dms3rep/multi/opt/growth-track-1920w-1920w.webp', CURRENT_DATE + INTERVAL '20 days', 'upcoming', 'other'),
('First Steps Class', 'first-steps-class', 'https://lirp.cdn-website.com/23c7a45a/dms3rep/multi/opt/first+steps+square-1920w.png', CURRENT_DATE + INTERVAL '25 days', 'upcoming', 'other'),
('Water Baptisms', 'water-baptisms', 'https://lirp.cdn-website.com/23c7a45a/dms3rep/multi/opt/baptisms-square-1920w-1920w.webp', CURRENT_DATE + INTERVAL '30 days', 'upcoming', 'service'),
('Lead A Group', 'lead-a-group', 'https://lirp.cdn-website.com/23c7a45a/dms3rep/multi/opt/Small-groups-Square-3c695940-1920w-1920w.webp', CURRENT_DATE + INTERVAL '35 days', 'upcoming', 'other')
ON CONFLICT (slug) DO NOTHING;
