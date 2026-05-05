import { supabase, supabaseService } from '../config/supabase.js';

export const ministryRepo = {
    // Fetch top ministries for the homepage slider
    getFeaturedMinistries: async (limit = 6) => {
        const { data, error } = await supabase
            .from('ministries')
            .select('name, slug, description, cover_image_url, category')
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
                leader:leader_id (
                    first_name,
                    last_name,
                    avatar_url
                ),
                co_leader:co_leader_id (
                    first_name,
                    last_name,
                    avatar_url
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
        // Enforce Single Ministry Rule: Check if user already in a ministry
        const { data: existing } = await supabaseService
            .from('ministry_members')
            .select('ministry_id')
            .eq('user_id', userId)  
            .limit(1);

        if (existing && existing.length > 0 && existing[0].ministry_id !== ministryId) {
            throw new Error('You are already a member of a ministry. Please leave your current ministry before joining a new one.');
        }

        const { data, error } = await supabaseService
            .from('ministry_members')
            .upsert({
                ministry_id: ministryId,                
                user_id: userId,
                role: 'pending',
                joined_at: new Date()
            }, { onConflict: 'ministry_id,user_id' });

        if (error) {
            console.error('[MinistryRepo] Error joining ministry:', error.message);
            throw error;
        }
        return data;
    }
};