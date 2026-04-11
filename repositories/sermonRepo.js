import { supabase } from '../config/supabase.js';

export const sermonRepo = {
    // Fetch the latest sermons for the homepage
    getRecentSermons: async (limit = 6) => {
        const { data, error } = await supabase
            .from('sermons')
            .select('title, slug, thumbnail_url, sermon_date, speaker_id')
            .eq('status', 'published')
            .order('sermon_date', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    },

    // Fetch a single sermon by its URL slug
    getSermonBySlug: async (slug) => {
        const { data, error } = await supabase
            .from('sermons')
            .select('*, sermon_speakers(name), sermon_series(title)')
            .eq('slug', slug)
            .eq('status', 'published')
            .single(); // Returns one object instead of an array
            
        if (error) throw error;
        return data;
    }
};