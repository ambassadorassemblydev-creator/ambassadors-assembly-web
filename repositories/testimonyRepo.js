import { supabase, supabaseService } from '../config/supabase.js';

/**
 * Testimony Repository
 * Premium data access for the Testimonies Masonry Grid
 */
export const testimonyRepo = {
  // ... (previous methods)
  getApprovedTestimonies: async () => {
    const { data, error } = await supabase
      .from('testimonies')
      .select('*')
      .eq('is_approved', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  getFeaturedTestimonies: async (limit = 3) => {
    const { data, error } = await supabase
      .from('testimonies')
      .select('*')
      .eq('is_approved', true)
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Submit a new testimony (High IQ: Use Service Role to bypass RLS for guest submissions)
  createTestimony: async (testimonyData) => {
    const { data, error } = await supabaseService
      .from('testimonies')
      .insert([testimonyData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
