import { supabase } from '../config/supabase.js';
import { cache } from '../config/redis.js';

/**
 * Site Config Middleware
 * Fetches global settings (Sticky Bar, Church Settings) and injects into res.locals
 */
export const siteConfigMiddleware = async (req, res, next) => {
    try {
        // High IQ: Try to get from cache first to avoid DB hits on every page load
        const cacheKey = 'global_site_config';
        let config = await cache.get(cacheKey);

        if (!config) {
            // Fetch everything in parallel
            const [settingsRes, stickyRes, sermonsRes] = await Promise.all([
                supabase.from('church_settings').select('key, value').eq('is_public', true),
                supabase.from('announcement_bar').select('*').eq('is_active', true).maybeSingle(),
                supabase.from('sermons').select('*').eq('status', 'published').order('date', { ascending: false }).limit(3)
            ]);

            // Convert settings array to key-value object
            const settingsObj = {};
            if (settingsRes.data) {
                settingsRes.data.forEach(s => settingsObj[s.key] = s.value);
            }

            config = {
                settings: settingsObj,
                stickyConfig: stickyRes.data || null,
                latestSermons: sermonsRes.data || []
            };

            // Cache for 10 minutes (600s)
            await cache.set(cacheKey, config, 600);
        }

        // Attach to res.locals for EJS templates
        res.locals.churchSettings = config.settings;
        res.locals.stickyConfig = config.stickyConfig;
        res.locals.latestSermons = config.latestSermons;

        next();
    } catch (error) {
        console.error('[SiteConfigMiddleware] Error fetching site config:', error.message);
        // Fallbacks to prevent view crashes
        res.locals.churchSettings = {};
        res.locals.stickyConfig = null;
        next();
    }
};
