import { supabase, supabaseService } from '../config/supabase.js';

export const eventRepo = {
    // Fetch upcoming events with full metadata
    getUpcomingEvents: async (limit = 10) => {
        const { data, error } = await supabaseService
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
        const { data, error } = await supabaseService
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
        const { data, error } = await supabaseService
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
        // High IQ: Check if this is an outreach event
        const { data: eventData } = await supabaseService
            .from('events')
            .select('event_type')
            .eq('id', eventId)
            .single();

        // Enforce single outreach rule if applicable
        if (eventData?.event_type === 'outreach') {
            await eventRepo.enforceSingleOutreach(userId, eventId);
        }

        // 1. Create registration
        const { data, error } = await supabaseService
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
        await supabaseService.rpc('increment_event_attendees', { event_id_param: eventId });

        return data;
    },

    /**
     * Enforce single outreach rule: User can only be registered for ONE active outreach at a time.
     */
    enforceSingleOutreach: async (userId, currentEventId) => {
        // 1. Get all current outreach registrations for this user
        const { data: existingRegs, error: fetchError } = await supabaseService
            .from('event_registrations')
            .select('id, event_id, events!inner(event_type)')
            .eq('user_id', userId)
            .eq('events.event_type', 'outreach');

        if (fetchError) {
            console.error('[EventRepo] Error checking existing outreaches:', fetchError.message);
            return;
        }

        if (existingRegs && existingRegs.length > 0) {
            for (const reg of existingRegs) {
                if (reg.event_id !== currentEventId) {
                    // Delete the old registration
                    await supabaseService.from('event_registrations').delete().eq('id', reg.id);
                    // Decrement the old event's attendee count
                    await supabaseService.rpc('decrement_event_attendees', { event_id_param: reg.event_id });
                }
            }
        }
    }
};