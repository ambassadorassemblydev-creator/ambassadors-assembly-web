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
    // Includes detailed speaker and series relationships for High IQ discovery
    getSermonBySlug: async (slug) => {
        const { data, error } = await supabase
            .from('sermons')
            .select(`
                *,
                speaker:sermon_speakers(*),
                series:sermon_series(*)
            `)
            .eq('slug', slug)
            .eq('status', 'published')
            .maybeSingle();
            
        if (error) throw error;
        return data;
    },

    // High IQ: Discover related content based on tags or series
    getRelatedSermons: async (currentSermonId, seriesId, limit = 4) => {
        const { data, error } = await supabase
            .from('sermons')
            .select('title, slug, thumbnail_url, sermon_date')
            .eq('status', 'published')
            .eq('series_id', seriesId)
            .neq('id', currentSermonId) // Don't show the current sermon
            .order('sermon_date', { ascending: false })
            .limit(limit);

        if (error) return [];
        return data;
    },

    // Fetch all sermons in a specific series
    getSermonsBySeries: async (seriesSlug) => {
        const { data, error } = await supabase
            .from('sermon_series')
            .select(`
                *,
                sermons(*)
            `)
            .eq('slug', seriesSlug)
            .maybeSingle();

        if (error) throw error;
        return data;
    }
};