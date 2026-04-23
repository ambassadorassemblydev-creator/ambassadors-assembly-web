-- Migration: Restructure Ministries and Outreach
-- Description: Adds 'category' to ministries and 'community_impact' to event types.

-- 1. Add category to ministries if not exists
ALTER TABLE public.ministries ADD COLUMN IF NOT EXISTS category text DEFAULT 'service' CHECK (category IN ('fellowship', 'service'));

-- 2. Update existing ministries based on client specifications
UPDATE public.ministries SET category = 'fellowship' 
WHERE name IN ('Youth Ministry', 'Men of Honor', 'Women of Grace', 'Children Ministry', 'Seniors Fellowship');

UPDATE public.ministries SET category = 'service' 
WHERE name NOT IN ('Youth Ministry', 'Men of Honor', 'Women of Grace', 'Children Ministry', 'Seniors Fellowship');

-- 3. Add community_impact to event_type enum safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'event_type' AND enumlabel = 'community_impact') THEN
        ALTER TYPE public.event_type ADD VALUE 'community_impact';
    END IF;
END $$;

-- 4. Comment on the transition from 'Departments' to 'Outreach'
-- The 'church_departments' table will remain as the source of truth for service units,
-- but the UI will present them as 'Outreach & Service' to match the new organizational structure.
