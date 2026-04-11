import { sermonRepo } from '../repositories/sermonRepo.js';
import { eventRepo } from '../repositories/eventRepo.js'; // Added!
import { ministryRepo } from '../repositories/ministryRepo.js'; // Added!

export const pageController = {
    
    // Render the Home Page
    renderHome: async (req, res) => {
        try {
            // Fetch everything concurrently for maximum speed
            const [sermons, events, ministries] = await Promise.all([
                sermonRepo.getRecentSermons(6),
                eventRepo.getUpcomingEvents(7),
                ministryRepo.getFeaturedMinistries(6)
            ]);

            res.render('pages/index', {
                pageTitle: 'Welcome | Ambassadors Assembly',
                currentPath: req.path,
                sermons: sermons || [],
                events: events || [],
                ministries: ministries || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering home:', error.message);
            // Fallback gracefully if database fails
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
            const sermons = await sermonRepo.getRecentSermons(20);
            
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