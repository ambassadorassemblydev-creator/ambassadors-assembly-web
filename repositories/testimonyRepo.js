import { supabase } from '../config/supabase.js';

/**
 * Testimony Repository
 * Premium data access for the Testimonies Masonry Grid
 */
export const testimonyRepo = {
  // Fetch all approved and published testimonies
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

  // Fetch featured testimonies for homepage or landing
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

  // Submit a new testimony
  createTestimony: async (testimonyData) => {
    const { data, error } = await supabase
      .from('testimonies')
      .insert([testimonyData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
