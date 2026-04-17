import { supabase } from '../config/supabase.js';

/**
 * Prayer Repository
 * Interactive "Light of Hope" system data access
 */
export const prayerRepo = {
  // Fetch approved public prayer requests
  getPublicPrayers: async () => {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select(`
        *,
        profiles (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Submit a new prayer request
  submitPrayer: async (prayerData) => {
    const { data, error } = await supabase
      .from('prayer_requests')
      .insert([prayerData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Record an intercession ("I prayed for this")
  intercede: async (requestId, userId) => {
    // 1. Check if already interceded
    const { data: existing } = await supabase
      .from('prayer_intercessors')
      .select('id')
      .eq('prayer_request_id', requestId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) throw new Error('You have already interceded for this request.');

    // 2. Insert intercession
    const { error } = await supabase
      .from('prayer_intercessors')
      .insert([{
        prayer_request_id: requestId,
        user_id: userId
      }]);

    if (error) throw error;

    // Trigger update for prayer count (happening via SQL trigger in Supabase)
    return true;
  }
};
