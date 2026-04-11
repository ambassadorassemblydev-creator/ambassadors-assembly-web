import { supabase } from '../config/supabase.js';

export const eventRepo = {
    // Fetch upcoming events for the homepage
    getUpcomingEvents: async (limit = 7) => {
        const { data, error } = await supabase
            .from('events')
            .select('title, slug, cover_image_url, event_type, start_date')
            .eq('status', 'upcoming')
            .order('start_date', { ascending: true }) // Soonest events first
            .limit(limit);
        
        if (error) {
            console.error('[EventRepo] Error fetching upcoming events:', error.message);
            return []; // Fail gracefully so the homepage doesn't crash
        }
        return data;
    }
};