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
    }
};