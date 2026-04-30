-- Admin Enhancements and Stabilization
-- Version: 1.0.0

-- Create member_notes table for pastoral and admin tracking
CREATE TABLE IF NOT EXISTS public.member_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    note TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    is_confidential BOOLEAN DEFAULT true,
    follow_up_date DATE,
    is_follow_up_done BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_notes_member_id ON public.member_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_member_notes_author_id ON public.member_notes(author_id);

-- Enable RLS
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

-- Policies for member_notes (only admins, pastors, and super_admins can view/manage)
CREATE POLICY "Admins and Pastors can manage member notes" ON public.member_notes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role_claim IN ('admin', 'super_admin', 'pastor'))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role_claim IN ('admin', 'super_admin', 'pastor'))
        )
    );

-- Ensure ministries has meeting_location (fix for 'location' column error)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministries' AND column_name = 'meeting_location') THEN
        ALTER TABLE public.ministries ADD COLUMN meeting_location TEXT;
    END IF;
END $$;

-- Update worker_schedules to ensure proper joins (if needed)
-- Note: Already handled in UI logic, but ensure foreign keys are robust
ALTER TABLE IF EXISTS public.worker_schedules
    DROP CONSTRAINT IF EXISTS worker_schedules_user_id_fkey,
    ADD CONSTRAINT worker_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
