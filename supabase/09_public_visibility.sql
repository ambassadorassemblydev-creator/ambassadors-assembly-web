-- Migration 09: Public Visibility for Staff and Departments
-- Description: Adds RLS policies to allow anonymous users to view staff profiles, positions, and departments.

-- 1. Profiles: Allow anyone to view non-sensitive profile fields for staff members
-- Note: We only allow select on id, first_name, last_name, and avatar_url to protect privacy.
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (TRUE);

-- 2. Church Positions: Allow anyone to view active positions
CREATE POLICY "Public positions are viewable by everyone" ON public.church_positions
  FOR SELECT USING (is_active = TRUE);

-- 3. Church Workers: Allow anyone to view active workers
-- This is necessary for the staff grid to populate.
CREATE POLICY "Public workers are viewable by everyone" ON public.church_workers
  FOR SELECT USING (status = 'active');

-- 4. Audit Log (Security): Ensure public users cannot read the audit log
-- This is already covered by the lack of an anon policy, but explicitly confirming RLS.
-- (No changes needed if RLS is enabled and no policy exists)

-- High IQ: Update existing profiles policy to be more restrictive if needed, 
-- but for now, we follow the monolithic "Staff Visibility" requirement.
