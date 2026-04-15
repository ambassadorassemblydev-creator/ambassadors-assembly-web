-- Migration 08: Seed Staff Members for Departments
-- Description: Inserts 10 dummy staff members for each active department in the database.

DO $$
DECLARE
    dept RECORD;
    i INTEGER;
    new_user_id UUID;
    new_pos_id UUID;
    email TEXT;
BEGIN
    FOR dept IN
        SELECT * FROM church_departments
        -- if you truly only want active departments, uncomment:
        -- WHERE is_active = true
    LOOP
        FOR i IN 1..10 LOOP
            new_user_id := gen_random_uuid();

            -- generate email once, and reuse for auth.users + profiles
            email := 'staff_' || floor(extract(epoch from now())) || '_' || dept.id || '_' || i || '@ambassadors.test';

            -- Insert into auth.users
            INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
            VALUES (
                new_user_id,
                email,
                '{"provider": "email", "providers": ["email"]}',
                '{}',
                now(),
                now()
            )
            ON CONFLICT (id) DO NOTHING;

            -- Insert into profiles (idempotent)
            INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, updated_at)
            VALUES (
                new_user_id,
                email,
                'Staff',
                dept.name || ' ' || i,
                'https://ui-avatars.com/api/?name=Staff+' || replace(dept.name, ' ', '+') || '+' || i || '&background=random&color=fff',
                now()
            )
            ON CONFLICT (id) DO UPDATE
            SET
                email = EXCLUDED.email,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = now();

            -- Find or create a church_position for this department
            SELECT id INTO new_pos_id
            FROM church_positions
            WHERE department_id = dept.id
              AND title = 'Ministry Worker'
            LIMIT 1;

            IF new_pos_id IS NULL THEN
                new_pos_id := gen_random_uuid();
                INSERT INTO church_positions (id, title, department_id)
                VALUES (new_pos_id, 'Ministry Worker', dept.id);
            END IF;

            -- Assign the user to the position
            INSERT INTO church_workers (user_id, position_id, department_id, worker_id)
            VALUES (
                new_user_id,
                new_pos_id,
                dept.id,
                'worker_' || new_user_id::text
            )
            ON CONFLICT DO NOTHING;

        END LOOP;
    END LOOP;
END $$;