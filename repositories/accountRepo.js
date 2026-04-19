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
          ministries(name, slug, cover_image_url)
        )
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    // Fetch church workers separately to prevent PostgREST JSON coercion limitations on ambiguous FKs
    if (data) {
      const { data: workers, error: workersErr } = await supabase
        .from('church_workers')
        .select(`
          status, 
          church_positions(title), 
          church_departments(name)
        `)
        .eq('user_id', userId);
        
      if (!workersErr) {
        data.church_workers = workers || [];
      } else {
        data.church_workers = [];
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
      .select('id, name, description, slug')
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
    if (updateData.firstName !== undefined) payload.first_name = updateData.firstName;
    if (updateData.lastName !== undefined) payload.last_name = updateData.lastName;
    if (updateData.phone !== undefined) payload.phone = updateData.phone;
    if (updateData.addressLine1 !== undefined) payload.address_line_1 = updateData.addressLine1;
    if (updateData.city !== undefined) payload.city = updateData.city;
    if (updateData.bio !== undefined) payload.bio = updateData.bio;
    
    // Onboarding fields
    if (updateData.gender !== undefined) payload.gender = updateData.gender;
    if (updateData.date_of_birth !== undefined) payload.date_of_birth = updateData.date_of_birth;
    if (updateData.marital_status !== undefined) payload.marital_status = updateData.marital_status;
    if (updateData.wedding_anniversary !== undefined) payload.wedding_anniversary = updateData.wedding_anniversary;
    if (updateData.address !== undefined) payload.address_line_1 = updateData.address;
    if (updateData.is_baptized !== undefined) payload.is_baptized = updateData.is_baptized;
    if (updateData.baptism_date !== undefined) payload.baptism_date = updateData.baptism_date;
    if (updateData.is_onboarded !== undefined) payload.is_onboarded = updateData.is_onboarded;
    if (updateData.department_interest !== undefined) payload.department_interest = updateData.department_interest;
    if (updateData.position_interest !== undefined) payload.position_interest = updateData.position_interest;
    if (updateData.salvation_date !== undefined) payload.salvation_date = updateData.salvation_date;
    if (updateData.previous_church !== undefined) payload.previous_church = updateData.previous_church;
    if (updateData.occupation !== undefined) payload.occupation = updateData.occupation;
    
    // New Journey & Identity Fields
    if (updateData.how_did_you_hear !== undefined) payload.how_did_you_hear = updateData.how_did_you_hear;
    if (updateData.spiritual_gifts !== undefined) payload.spiritual_gifts = updateData.spiritual_gifts;
    if (updateData.emergency_contact_name !== undefined) payload.emergency_contact_name = updateData.emergency_contact_name;
    if (updateData.emergency_contact_phone !== undefined) payload.emergency_contact_phone = updateData.emergency_contact_phone;
    if (updateData.avatar_url !== undefined) payload.avatar_url = updateData.avatar_url;

    const { data, error } = await supabaseService
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
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