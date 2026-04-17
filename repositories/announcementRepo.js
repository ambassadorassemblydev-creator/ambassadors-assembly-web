import { supabase } from '../config/supabase.js';

export const announcementRepo = {
    // Get the active announcement bar configuration
    async getActiveBar() {
        const { data, error } = await supabase
            .from('announcement_bar')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[AnnouncementRepo] Error fetching bar:', error.message);
            return null;
        }

        return data;
    }
};
