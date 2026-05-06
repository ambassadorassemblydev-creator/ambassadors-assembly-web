import { supabase, supabaseService } from '../config/supabase.js';

/**
 * Account Repository
 * Top 1% Pattern: Centralized data access for the User Dashboard
 */
export const accountRepo = {
  // Fetch everything a user needs for their dashboard in one complex query
  getUserDashboardData: async (userId) => {
    const { data, error } = await supabaseService
      .from('profiles')
      .select(`
        *,
        ministry_members(
          role, 
          is_active,
          ministries(name, slug, cover_image_url)
        ),
        user_roles!user_id(
          is_active,
          roles(name)
        )
      `)
      .eq('id', userId)
      .maybeSingle();


    if (error) throw error;

    // Fetch church workers separately to prevent PostgREST JSON coercion limitations on ambiguous FKs
    if (data) {
      const { data: workers, error: workersErr } = await supabaseService
        .from('church_workers')
        .select(`
          status, 
          church_positions(title), 
          church_departments(id, name)
        `)
        .eq('user_id', userId);
        
      if (!workersErr) {
        data.church_workers = workers || [];
      } else {
        data.church_workers = [];
      }

      // High IQ: Self-Healing / Migration Logic
      // If user has a 'department' string in profile but NO church_workers record, auto-provision it.
      if (data.church_workers.length === 0 && data.department && data.department !== 'None' && data.department !== 'None recorded') {
        try {
          const { data: dept } = await supabaseService
            .from('church_departments')
            .select('id, name')
            .ilike('name', data.department)
            .maybeSingle();

          if (dept) {
            // Find a default 'Member' position for this department
            const { data: pos } = await supabaseService
              .from('church_positions')
              .select('id, title')
              .eq('department_id', dept.id)
              .ilike('title', 'Member')
              .maybeSingle();

            if (pos) {
              const { data: newWorker, error: insErr } = await supabaseService
                .from('church_workers')
                .insert([{
                  user_id: userId,
                  department_id: dept.id,
                  position_id: pos.id,
                  status: 'active',
                  start_date: new Date()
                }])
                .select(`
                  status, 
                  church_positions(title), 
                  church_departments(id, name)
                `)
                .single();

              if (!insErr && newWorker) {
                data.church_workers = [newWorker];
              }
            }
          }
        } catch (err) {
          console.error('Self-healing church_worker migration failed:', err);
        }
      }
    }

    return data;
  },

  // Fetch only the 5 most recent donations
  getRecentDonations: async (userId) => {
    const { data, error } = await supabase
      .from('donations')
      .select('amount, status, created_at, donation_categories(name)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data;
  },

  // Fetch all donations for historical analysis
  getFullDonationHistory: async (userId) => {
    const { data, error } = await supabase
      .from('donations')
      .select('amount, created_at, status, donation_categories(name)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Fetch all notes saved by the user
  getUserNotes: async (userId) => {
    const { data, error } = await supabase
      .from('member_notes')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Fetch user attendance for the last year
  getUserAttendance: async (userId) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data, error } = await supabase
      .from('attendance_records')
      .select('service_date, attendance, service_name')
      .eq('user_id', userId)
      .gte('service_date', oneYearAgo.toISOString().split('T')[0])
      .order('service_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Mark attendance for a user (Self-Marking via QR)
  markAttendance: async (userId, requestedService) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const hour = now.getHours();

    let activeSessions = [];

    // 1. Check for active standard services (Nigeria Time - UTC+1)
    if (day === 0) { // Sunday
      if (hour >= 6 && hour <= 14) activeSessions.push({ name: 'Sunday Service', type: 'service' });
    } else if (day === 3) { // Wednesday
      if (hour >= 16 && hour <= 21) activeSessions.push({ name: 'Midweek Service', type: 'service' });
    }

    // 2. Check for active events (Temporal lookup)
    const { data: activeEvents } = await supabase
      .from('events')
      .select('id, title, start_date, end_date')
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .eq('status', 'upcoming');

    if (activeEvents && activeEvents.length > 0) {
      activeEvents.forEach(evt => {
        activeSessions.push({ name: evt.title, type: 'event', id: evt.id });
      });
    }

    // 3. Handle selection logic
    let serviceName = requestedService;

    if (!serviceName) {
      if (activeSessions.length === 0) {
        return { 
          success: false, 
          message: 'No active service or event found for this time. Attendance can only be marked during scheduled times.' 
        };
      }

      if (activeSessions.length > 1) {
        return {
          success: false,
          needsSelection: true,
          sessions: activeSessions,
          message: 'Multiple activities are happening right now. Which one are you attending?'
        };
      }

      // Auto-pick if only one
      serviceName = activeSessions[0].name;
    }

    // Check if already marked for today's specific service
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', userId)
      .eq('service_date', today)
      .eq('service_name', serviceName)
      .maybeSingle();

    if (existing) {
      return { success: true, message: `You are already marked present for ${serviceName} today.` };
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert([{
        user_id: userId,
        service_date: today,
        service_name: serviceName,
        attendance: 'in_person',
        checked_in_at: now.toISOString()
      }])
      .select();

    if (error) throw error;
    return { success: true, message: `Welcome! You have been marked present for ${serviceName}.`, data };
  },
  
  /**
   * High IQ Self-Healing: Provision a missing profile
   * Uses service_role to bypass RLS and triggers
   */
  provisionProfile: async (userId, email, firstName, lastName) => {
    const { data: profile, error } = await supabaseService
      .from('profiles')
      .insert([{
        id: userId,
        email,
        first_name: firstName || '',
        last_name: lastName || '',
        member_id: `AA-RECOVER-${Math.floor(Math.random() * 10000)}` // Temporary recovery ID
      }])
      .select()
      .maybeSingle();

    if (error) throw error;
    
    // Also assign guest role if missing
    await supabaseService
      .from('user_roles')
      .insert([{
        user_id: userId,
        role_id: (await supabaseService.from('roles').select('id').eq('name', 'guest').single()).data.id
      }])
      .select();

    return profile;
  },

  /**
   * Fetch all active church departments for onboarding selection
   */
  getDepartments: async () => {
    const { data, error } = await supabase
      .from('church_departments')
      .select('id, name, slug, description')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all church positions for role selection in onboarding
   */
  getPositions: async () => {
    const { data, error } = await supabase
      .from('church_positions')
      .select('id, title, department_id')
      .order('title', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all active ministries for onboarding selection
   */
  getMinistries: async () => {
    const { data, error } = await supabase
      .from('ministries')
      .select('id, name, description, slug, category')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  },

  updateProfile: async (userId, updateData) => {
    // Standardize payload
    const payload = {
      updated_at: new Date()
    };

    // Mapping camelCase to snake_case if present
    if (updateData.title !== undefined) payload.title = updateData.title;
    if (updateData.firstName !== undefined) payload.first_name = updateData.firstName;
    if (updateData.lastName !== undefined) payload.last_name = updateData.lastName;
    if (updateData.phone !== undefined) payload.phone = updateData.phone;
    if (updateData.addressLine1 !== undefined) payload.address_line_1 = updateData.addressLine1;
    if (updateData.city !== undefined) payload.city = updateData.city;
    if (updateData.bio !== undefined) payload.bio = updateData.bio;
    
    // Onboarding fields
    if (updateData.gender !== undefined) payload.gender = updateData.gender;
    if (updateData.date_of_birth !== undefined) payload.date_of_birth = updateData.date_of_birth || null;
    if (updateData.marital_status !== undefined) payload.marital_status = updateData.marital_status || null;
    if (updateData.wedding_anniversary !== undefined) payload.wedding_anniversary = updateData.wedding_anniversary || null;
    if (updateData.address !== undefined) payload.address_line_1 = updateData.address;
    if (updateData.is_baptized !== undefined) payload.is_baptized = updateData.is_baptized;
    if (updateData.baptism_date !== undefined) payload.baptism_date = updateData.baptism_date || null;
    if (updateData.is_onboarded !== undefined) payload.is_onboarded = updateData.is_onboarded;
    if (updateData.department_interest !== undefined) payload.department_interest = updateData.department_interest;
    if (updateData.position_interest !== undefined) payload.position_interest = updateData.position_interest;
    if (updateData.salvation_date !== undefined) payload.salvation_date = updateData.salvation_date || null;
    if (updateData.previous_church !== undefined) payload.previous_church = updateData.previous_church;
    if (updateData.occupation !== undefined) payload.occupation = updateData.occupation;
    
    // New Journey & Identity Fields
    if (updateData.how_did_you_hear !== undefined) payload.how_did_you_hear = updateData.how_did_you_hear;
    if (updateData.spiritual_gifts !== undefined) payload.spiritual_gifts = updateData.spiritual_gifts;
    if (updateData.emergency_contact_name !== undefined) payload.emergency_contact_name = updateData.emergency_contact_name;
    if (updateData.emergency_contact_phone !== undefined) payload.emergency_contact_phone = updateData.emergency_contact_phone;
    if (updateData.avatar_url !== undefined) payload.avatar_url = updateData.avatar_url;
    
    // Membership & Approval Fields
    if (updateData.already_serving !== undefined) payload.already_serving = updateData.already_serving;
    if (updateData.role_claim !== undefined) payload.role_claim = updateData.role_claim;
    if (updateData.department_claim !== undefined) payload.department_claim = updateData.department_claim;
    if (updateData.receive_push_notifications !== undefined) payload.receive_push_notifications = updateData.receive_push_notifications;
    if (updateData.push_token !== undefined) payload.push_token = updateData.push_token;
    
    if (updateData.approval_status !== undefined) payload.approval_status = updateData.approval_status;
    if (updateData.is_member !== undefined) payload.is_member = updateData.is_member;
    if (updateData.member_since !== undefined) payload.member_since = updateData.member_since;
    if (updateData.interests !== undefined) payload.interests = updateData.interests;
    if (updateData.department !== undefined) payload.department = updateData.department;
    if (updateData.ministry !== undefined) payload.ministry = updateData.ministry;

    const { data, error } = await supabaseService
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Automatically create a volunteer application if department_interest is saved
    if (updateData.department_interest) {
      try {
        const { data: dept } = await supabaseService
          .from('church_departments')
          .select('id')
          .ilike('name', updateData.department_interest)
          .single();

        if (dept) {
          // Fetch profile details for required fields
          const { data: profile } = await supabaseService
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', userId)
            .single();

          // Fetch a default position (Volunteer) for the department
          const { data: pos } = await supabaseService
            .from('church_positions')
            .select('id')
            .eq('department_id', dept.id)
            .ilike('title', '%Volunteer%')
            .maybeSingle();

          // If no 'Volunteer' position, take the first one
          let positionId = pos?.id;
          if (!positionId) {
            const { data: firstPos } = await supabaseService
              .from('church_positions')
              .select('id')
              .eq('department_id', dept.id)
              .limit(1)
              .maybeSingle();
            positionId = firstPos?.id;
          }

          if (positionId) {
            await supabaseService
              .from('volunteer_applications')
              .upsert({
                user_id: userId,
                department_id: dept.id,
                position_id: positionId,
                applicant_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Anonymous Member',
                applicant_email: profile?.email || 'no-email@ambassadors.org',
                status: 'pending',
                motivation: 'Expressed interest via Dashboard'
              }, { onConflict: 'user_id,department_id' });
          }
        }
      } catch (err) {
        console.error('Failed to auto-create volunteer application:', err);
      }
    }

    return data;
  },

  /**
   * Fetch all events a user has registered for
   */
  getUserEvents: async (userId) => {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        events(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all prayer requests submitted by a user
   */
  getUserPrayers: async (userId) => {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};