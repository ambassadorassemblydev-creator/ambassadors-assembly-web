import { supabase } from '../config/supabase.js';

export const ministryRepo = {
    // Fetch top ministries for the homepage slider
    getFeaturedMinistries: async (limit = 6) => {
        const { data, error } = await supabase
            .from('ministries')
            .select('name, slug, description, cover_image_url')
            .eq('is_active', true)
            // .eq('is_featured', true) // You can uncomment this later if you only want specific ones shown
            .order('sort_order', { ascending: true })
            .limit(limit);
        
        if (error) {
            console.error('[MinistryRepo] Error fetching featured ministries:', error.message);
            return [];
        }
        return data;
    },

    // Fetch a single ministry by slug
    getMinistryBySlug: async (slug) => {
        const { data, error } = await supabase
            .from('ministries')
            .select(`
                *,
                ministry_leads (
                    profiles (
                        first_name,
                        last_name,
                        avatar_url
                    )
                )
            `)
            .eq('slug', slug)
            .single();

        if (error) {
            console.error('[MinistryRepo] Error fetching ministry by slug:', error.message);
            return null;
        }
        return data;
    },

    // Join a ministry
    joinMinistry: async (ministryId, userId, notes) => {
        const { data, error } = await supabase
            .from('ministry_members')
            .upsert({
                ministry_id: ministryId,
                user_id: userId,
                notes: notes,
                status: 'pending'
            }, { onConflict: 'ministry_id,user_id' });

        if (error) {
            console.error('[MinistryRepo] Error joining ministry:', error.message);
            throw error;
        }
        return data;
    }
};