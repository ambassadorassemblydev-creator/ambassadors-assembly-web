import { supabase, supabaseService } from '../config/supabase.js';

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
        profiles!user_id (
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
    console.log(`[PrayerRepo] Intercede attempt for request ${requestId} by user ${userId}`);
    
    // 1. Check if already interceded (Use Service role to ensure we see all rows)
    const { data: existing, error: checkError } = await supabaseService
      .from('prayer_intercessors')
      .select('id')
      .eq('prayer_request_id', requestId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
        console.error(`[PrayerRepo] Error checking intercession:`, checkError);
        throw checkError;
    }

    if (existing) {
        console.warn(`[PrayerRepo] User ${userId} already interceded for request ${requestId}`);
        throw new Error('You have already interceded for this request.');
    }

    // 2. Insert intercession (Use Service role to bypass RLS since we've already validated the user in the controller)
    const { error: insertError } = await supabaseService
      .from('prayer_intercessors')
      .insert([{
        prayer_request_id: requestId,
        user_id: userId
      }]);

    if (insertError) {
        console.error(`[PrayerRepo] Insert Error:`, insertError);
        throw insertError;
    }

    console.log(`[PrayerRepo] Successfully recorded intercession for ${requestId}`);
    // Trigger update for prayer count (happening via SQL trigger in Supabase)
    return true;
  }
};
