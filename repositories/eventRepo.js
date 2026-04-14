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
    },

    /**
     * Check if a user is already registered for an event
     */
    checkRegistration: async (eventId, userId) => {
        const { data, error } = await supabase
            .from('event_registrations')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();
        
        if (error) throw error;
        return !!data;
    },

    /**
     * Register a user for an event
     */
    registerUser: async (eventId, userId) => {
        // 1. Create registration
        const { data, error } = await supabase
            .from('event_registrations')
            .insert([{
                event_id: eventId,
                user_id: userId,
                is_confirmed: true
            }])
            .select()
            .single();

        if (error) throw error;

        // 2. Increment attendee count
        await supabase.rpc('increment_event_attendees', { event_id_param: eventId });

        return data;
    }
};