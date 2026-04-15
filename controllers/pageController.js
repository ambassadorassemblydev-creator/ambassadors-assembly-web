import { cache } from '../config/redis.js';
import { sermonRepo } from '../repositories/sermonRepo.js';
import { eventRepo } from '../repositories/eventRepo.js';
import { ministryRepo } from '../repositories/ministryRepo.js';
import { donationRepo } from '../repositories/donationRepo.js';
import { memberRepo } from '../repositories/memberRepo.js';

export const pageController = {
    
    // Render the Home Page
    renderHome: async (req, res) => {
        try {
            const cachedData = await cache.get('home_page_data');
            let sermons, events, ministries;
            
            if (cachedData) {
                ({ sermons, events, ministries } = cachedData);
            } else {
                [sermons, events, ministries] = await Promise.all([
                    sermonRepo.getRecentSermons(6),
                    eventRepo.getUpcomingEvents(7),
                    ministryRepo.getFeaturedMinistries(6)
                ]);
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

    // Render the Sermons Archive Page
    renderSermons: async (req, res) => {
        try {
            const cacheKey = 'sermons_archive_top_20';
            let sermons = await cache.get(cacheKey);

            if (!sermons) {
                sermons = await sermonRepo.getRecentSermons(20);
                await cache.set(cacheKey, sermons, 600);
            }
            
            res.render('pages/sermons', {
                pageTitle: 'Sermons | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'MESSAGE LIBRARY',
                sermons: sermons || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering sermons:', error.message);
            res.status(500).send('Error loading sermons');
        }
    },

    // Render a specific Sermon Detail Page
    renderSermonDetail: async (req, res) => {
        try {
            const { slug } = req.params;
            const cacheKey = `sermon_detail_${slug}`;
            let data = await cache.get(cacheKey);
            
            if (!data) {
                const sermon = await sermonRepo.getSermonBySlug(slug);
                if (!sermon) {
                    return res.status(404).render('pages/error', { message: 'Sermon not found', error: { status: 404 } });
                }
                const [relatedSermons, latestSermons] = await Promise.all([
                    sermonRepo.getRelatedSermons(sermon.id, sermon.series_id),
                    sermonRepo.getRecentSermons(3)
                ]);
                data = { sermon, relatedSermons, latestSermons };
                await cache.set(cacheKey, data, 1800);
            }

            res.render('pages/sermon-detail', {
                pageTitle: `${data.sermon.title} | Ambassadors Assembly`,
                currentPath: req.path,
                sermon: data.sermon,
                relatedSermons: data.relatedSermons || [],
                latestSermons: data.latestSermons || [],
                isLiveNow: false
            });
        } catch (error) {
            console.error('[PageController] Error rendering sermon detail:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading sermon details' });
        }
    },

    // Render the Events Archive Grid
    renderEventsArchive: async (req, res) => {
        try {
            const cacheKey = 'events_archive';
            let events = await cache.get(cacheKey);

            if (!events) {
                events = await eventRepo.getUpcomingEvents(20);
                await cache.set(cacheKey, events, 600);
            }

            res.render('pages/events', {
                pageTitle: 'Events | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'GATHERINGS',
                events: events || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering events:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading events' });
        }
    },

    // Render Event Detail Page
    renderEventDetail: async (req, res) => {
        try {
            const { slug } = req.params;
            const cacheKey = `event_detail_${slug}`;
            let event = await cache.get(cacheKey);
            
            if (!event) {
                event = await eventRepo.getEventBySlug(slug);
                if (!event) return res.status(404).render('pages/error', { message: 'Event not found' });
                await cache.set(cacheKey, event, 1800);
            }

            res.render('pages/event-detail', {
                pageTitle: `${event.title} | Ambassadors Assembly`,
                currentPath: req.path,
                event
            });
        } catch (error) {
            console.error('[PageController] Error rendering event detail:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading event details' });
        }
    },

    // Render the premium Giving Page
    renderGive: async (req, res) => {
        try {
            res.render('pages/give', {
                pageTitle: 'Give | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'GENEROSITY',
                donationGoal: null
            });
        } catch (error) {
            console.error('[PageController] Error rendering give page:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading the giving page' });
        }
    },

    // Render a specific Ministry Detail Page
    renderMinistryDetail: async (req, res) => {
        try {
            const { slug } = req.params;
            const ministry = await ministryRepo.getMinistryBySlug(slug);
            
            if (!ministry) return res.status(404).render('pages/error', { message: 'Ministry not found' });

            res.render('pages/ministry-detail', {
                pageTitle: `${ministry.name} | Ambassadors Assembly`,
                currentPath: req.path,
                ministry
            });
        } catch (error) {
            console.error('[PageController] Error rendering ministry detail:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading ministry details' });
        }
    },

    // Handle Join Ministry Request
    handleJoinMinistry: async (req, res) => {
        try {
            const { slug } = req.params;
            const { notes } = req.body;
            const userId = req.user.id;

            const ministry = await ministryRepo.getMinistryBySlug(slug);
            if (!ministry) return res.status(404).json({ error: 'Ministry not found' });

            await ministryRepo.joinMinistry(ministry.id, userId, notes);
            res.redirect(`/ministries/${slug}?success=Your interest has been logged.`);
        } catch (error) {
            console.error('[PageController] Error joining ministry:', error.message);
            res.redirect(`${req.header('Referer') || '/ministries'}?error=Something went wrong.`);
        }
    },

    // Render the Ministries Grid
    renderMinistries: async (req, res) => {
        try {
            const ministries = await ministryRepo.getFeaturedMinistries(20);
            res.render('pages/ministries', {
                pageTitle: 'Ministries | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'COMMUNITY',
                ministries
            });
        } catch (error) {
            console.error('[PageController] Error rendering ministries:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading ministries' });
        }
    },

    // Render About Us Page
    renderAbout: async (req, res) => {
        try {
            const staff = await memberRepo.getStaff();
            res.render('pages/about', {
                pageTitle: 'About Us | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'OUR STORY',
                staff: staff || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering about:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading page' });
        }
    },

    // Render Connect Page
    renderConnect: async (req, res) => {
        try {
            res.render('pages/connect', {
                pageTitle: 'Connect | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'JOIN US'
            });
        } catch (error) {
            res.status(500).render('pages/error', { message: 'Error loading page' });
        }
    },

    // Render Plan Your Visit Page
    renderPlanVisit: async (req, res) => {
        try {
            res.render('pages/plan-a-visit', {
                pageTitle: 'Plan Your Visit | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'VISIT US'
            });
        } catch (error) {
            res.status(500).render('pages/error', { message: 'Error loading page' });
        }
    },

    // Render Member Directory (Protected)
    renderDirectory: async (req, res) => {
        try {
            const query = req.query.q || '';
            const members = await memberRepo.searchMembers(query);

            res.render('pages/directory', {
                pageTitle: 'Member Directory | Ambassadors Assembly',
                currentPath: req.path,
                searchQuery: query,
                members: members || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering directory:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading directory' });
        }
    },

    // Render the Staff Page (Dynamically filtered)
    renderStaff: async (req, res) => {
        try {
            const [staff, departments] = await Promise.all([
                memberRepo.getStaff(),
                memberRepo.getDepartments()
            ]);
            
            res.render('pages/staff', {
                pageTitle: 'Our Staff | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'OUR TEAM',
                staff: staff || [],
                departments: departments || [],
                defaultFilter: 'Pastoral' // High IQ: Defaulting to Pastoral as requested
            });
        } catch (error) {
            console.error('[PageController] Error rendering staff:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading staff' });
        }
    },

    // Render the Fund The Buildings Page (Template for dynamic projects)
    renderFundTheBuildings: async (req, res) => {
        try {
            const projects = await donationRepo.getBuildingProjects();
            res.render('pages/fund-the-buildings', {
                pageTitle: 'Fund The Buildings | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'THE VISION',
                projects: projects || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering buildings page:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading page' });
        }
    },

    // Render Building Project Detail
    renderBuildingDetail: async (req, res) => {
        try {
            const { slug } = req.params;
            const projects = await donationRepo.getBuildingProjects();
            const project = projects.find(p => p.slug === slug);
            
            if (!project) return res.status(404).render('pages/error', { message: 'Project not found' });

            res.render('pages/building-detail', {
                pageTitle: `${project.name} | Ambassadors Assembly`,
                currentPath: req.path,
                preloaderText: 'VISION DETAIL',
                project
            });
        } catch (error) {
            console.error('[PageController] Error rendering building detail:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading project details' });
        }
    }
};