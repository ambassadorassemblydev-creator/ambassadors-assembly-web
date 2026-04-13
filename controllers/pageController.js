import { cache } from '../config/redis.js';
import { sermonRepo } from '../repositories/sermonRepo.js';
import { eventRepo } from '../repositories/eventRepo.js';
import { ministryRepo } from '../repositories/ministryRepo.js';

export const pageController = {
    
    // Render the Home Page
    renderHome: async (req, res) => {
        try {
            // High IQ: Check cache first to avoid DB round-trips
            const cachedData = await cache.get('home_page_data');
            
            let sermons, events, ministries;
            if (cachedData) {
                ({ sermons, events, ministries } = cachedData);
            } else {
                // Fetch everything concurrently for maximum speed
                [sermons, events, ministries] = await Promise.all([
                    sermonRepo.getRecentSermons(6),
                    eventRepo.getUpcomingEvents(7),
                    ministryRepo.getFeaturedMinistries(6)
                ]);
                
                // Store in cache for 5 minutes
                await cache.set('home_page_data', { sermons, events, ministries }, 300);
            }

            res.render('pages/index', {
                pageTitle: 'Welcome | Ambassadors Assembly',
                currentPath: req.path,
                sermons: sermons || [],
                events: events || [],
                ministries: ministries || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering home:', error.message);
            res.render('pages/index', {
                pageTitle: 'Welcome | Ambassadors Assembly',
                currentPath: req.path,
                sermons: [], events: [], ministries: []
            });
        }
    },

    // Render the Sermons Archive Page (Unchanged)
    renderSermons: async (req, res) => {
        try {
            const cacheKey = 'sermons_archive_top_20';
            let sermons = await cache.get(cacheKey);

            if (!sermons) {
                sermons = await sermonRepo.getRecentSermons(20);
                await cache.set(cacheKey, sermons, 600); // 10 minute cache
            }
            
            res.render('pages/sermons', {
                pageTitle: 'Sermons | Ambassadors Assembly',
                currentPath: req.path,
                sermons: sermons || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering sermons:', error.message);
            res.status(500).send('Error loading sermons');
        }
    }
};