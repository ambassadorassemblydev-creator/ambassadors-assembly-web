import { supabase } from '../config/supabase.js';

export const eventRepo = {
    // Fetch upcoming events with full metadata
    getUpcomingEvents: async (limit = 10) => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('status', 'upcoming')
            .order('start_date', { ascending: true })
            .limit(limit);
        
        if (error) {
            console.error('[EventRepo] Error fetching upcoming events:', error.message);
            return [];
        }
        return data;
    },

    // High IQ: Fetch a specific event by its slug including registration details
    getEventBySlug: async (slug) => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;
        return data;
    }
};