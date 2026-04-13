import { supabase } from '../config/supabase.js';

/**
 * Account Repository
 * Top 1% Pattern: Centralized data access for the User Dashboard
 */
export const accountRepo = {
  // Fetch everything a user needs for their dashboard in one complex query
  getUserDashboardData: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        ministry_members(
          role, 
          ministries(name, slug, cover_image_url)
        )
      `)
      .eq('id', userId)
      .single();

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
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data;
  },
    updateProfile: async (userId, updateData) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        phone: updateData.phone,
        address_line_1: updateData.addressLine1,
        city: updateData.city,
        bio: updateData.bio,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};