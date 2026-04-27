import { cache, redis } from '../config/redis.js';
import { supabase } from '../config/supabase.js';
import { sermonRepo } from '../repositories/sermonRepo.js';
import { eventRepo } from '../repositories/eventRepo.js';
import { ministryRepo } from '../repositories/ministryRepo.js';
import { donationRepo } from '../repositories/donationRepo.js';
import { memberRepo } from '../repositories/memberRepo.js';
import { testimonyRepo } from '../repositories/testimonyRepo.js';
import { prayerRepo } from '../repositories/prayerRepo.js';
import { auditLogger } from '../utils/auditLogger.js';

export const pageController = {

    // Health Check Endpoint (For Uptime Monitoring)
    handleHealthCheck: async (req, res) => {
        const stats = {
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production'
        };

        try {
            // 1. Check Supabase (DB)
            const { error: dbError } = await supabase.from('church_settings').select('key').limit(1);
            if (dbError) throw new Error(`DB Connection Failed: ${dbError.message}`);

            // 2. Check Redis (Cache)
            if (redis) {
                const redisStatus = await redis.ping();
                if (redisStatus !== 'PONG') throw new Error('Redis Connection Failed');
            }

            return res.status(200).json({ status: 'healthy', ...stats });
        } catch (error) {
            console.error('[HealthCheck] Error:', error.message);
            return res.status(503).json({ status: 'unhealthy', error: error.message, ...stats });
        }
    },
    // Render FAQ Page
    renderFaq: async (req, res) => {
        try {
            res.render('pages/faq', {
                pageTitle: 'FAQ | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'QUESTIONS'
            });
        } catch (error) {
            console.error('[PageController] Error rendering FAQ:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading FAQ page' });
        }
    },

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
            // Fetch all active categories (Tithe, Offering, building fund, etc.)
            const categories = await donationRepo.getBuildingProjects(); // This fetches building-fund-%
            
            // Actually, we want ALL active categories for the general giving page
            const { data: allCategories } = await supabase
                .from('donation_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            res.render('pages/give', {
                pageTitle: 'Give | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'GENEROSITY',
                categories: allCategories || []
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
            
            // Log for AI / Audit
            await auditLogger.log(userId, 'join_ministry', `Joined ${ministry.name} Ministry`, { ministry_slug: slug, notes });

            res.redirect(`/ministries/${slug}?success=Your interest has been logged.`);
        } catch (error) {
            console.error('[PageController] Error joining ministry:', error.message);
            res.redirect(`${req.header('Referer') || '/ministries'}?error=Something went wrong.`);
        }
    },

    // Render the Ministries Grid
    renderMinistries: async (req, res) => {
        try {
            const ministries = await ministryRepo.getFeaturedMinistries(30);
            
            // High IQ: Fetch outreach events for Community Impact
            const { data: outreachEvents } = await supabase
                .from('events')
                .select('*')
                .eq('event_type', 'outreach')
                .eq('status', 'published')
                .gte('start_date', new Date().toISOString())
                .order('start_date', { ascending: true })
                .limit(4);

            res.render('pages/ministries', {
                pageTitle: 'Ministries | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'COMMUNITY',
                ministries,
                outreachEvents: outreachEvents || []
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

    // Render Meet Our Pastor Page
    renderMeetThePastor: async (req, res) => {
        try {
            res.render('pages/pastor', {
                pageTitle: 'Meet Our Pastor | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'LEADERSHIP'
            });
        } catch (error) {
            console.error('[PageController] Error rendering pastor page:', error.message);
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
            const [staff, departments, ministries, projects] = await Promise.all([
                memberRepo.getStaff(),
                memberRepo.getDepartments(),
                ministryRepo.getFeaturedMinistries(20),
                donationRepo.getBuildingProjects()
            ]);
            
            res.render('pages/staff', {
                pageTitle: 'Our Team | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'OUR TEAM',
                staff: staff || [],
                departments: departments || [],
                ministries: ministries || [],
                projects: projects || [],
                defaultFilter: 'all'
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
    },

    // Render cinematic Testimonies Page
    renderTestimonies: async (req, res) => {
        try {
            const testimonies = await testimonyRepo.getApprovedTestimonies();
            res.render('pages/testimonies', {
                pageTitle: 'Testimonies | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'GLORY TO GOD',
                testimonies: testimonies || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering testimonies:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading testimonies' });
        }
    },
    
    // Handle Testimony Submission
    handleTestimonySubmit: async (req, res) => {
        try {
            const { title, content, is_anonymous, full_name_hp } = req.body;
            const userId = req.user?.id;

            // Honeypot Spam Protection
            if (full_name_hp) {
                console.warn('[Security] Honeypot triggered for testimony submit.');
                return res.redirect(`${req.header('Referer') || '/testimonies'}?success=Thank you for sharing your story! It has been submitted for review.`);
            }

            const isAnonymous = is_anonymous === 'true' || is_anonymous === 'on';
            let authorName = 'Anonymous Member';

            if (!isAnonymous && userId) {
                // Fetch the real name from the profiles table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', userId)
                    .single();
                
                if (profile && profile.first_name) {
                    authorName = `${profile.first_name} ${profile.last_name || ''}`.trim();
                } else if (req.user?.user_metadata?.first_name) {
                    authorName = `${req.user.user_metadata.first_name} ${req.user.user_metadata.last_name || ''}`.trim();
                }
            }

            const testimonyData = {
                user_id: userId || null,
                author_name: authorName,
                title,
                content,
                is_anonymous: isAnonymous,
                status: 'pending',
                is_approved: false
            };

            await testimonyRepo.createTestimony(testimonyData);
            
            if (userId) {
                await auditLogger.log(userId, 'submit_testimony', `Shared a new testimony: "${title}"`, { title });
            }

            const redirectUrl = req.header('Referer') || '/testimonies';
            res.redirect(`${redirectUrl}?success=Thank you for sharing your story! It has been submitted for review.`);
        } catch (error) {
            console.error('[PageController] Error submitting testimony:', error.message);
            res.redirect(`${req.header('Referer') || '/testimonies'}?error=Something went wrong.`);
        }
    },

    // Render interactive Prayer Wall Page
    renderPrayerWall: async (req, res) => {
        try {
            const prayers = await prayerRepo.getPublicPrayers();
            res.render('pages/prayer-wall', {
                pageTitle: 'Prayer Wall | Ambassadors Assembly',
                currentPath: req.path,
                preloaderText: 'INTERCESSION',
                prayers: prayers || []
            });
        } catch (error) {
            console.error('[PageController] Error rendering prayer wall:', error.message);
            res.status(500).render('pages/error', { message: 'Error loading prayer wall' });
        }
    },

    // Handle Prayer Intercession ("I prayed for this")
    handleIntercede: async (req, res) => {
        try {
            const { requestId } = req.body;
            const userId = req.user?.id;

            if (!userId) return res.status(401).json({ error: 'Please sign in to intercede.' });
            
            await prayerRepo.intercede(requestId, userId);
            
            // Log for AI
            await auditLogger.log(userId, 'prayer_intercede', `Interceded for a prayer on the wall`, { requestId });

            return res.json({ success: true, message: 'Your prayer has been recorded. The wall glows brighter!' });
        } catch (error) {
            console.error('[PageController] Error interceding:', error.message);
            return res.status(400).json({ error: error.message });
        }
    },

    // Handle Prayer Submission
    handlePrayerSubmit: async (req, res) => {
        try {
            const { title, description, category, is_anonymous, is_public, full_name_hp } = req.body;
            const userId = req.user?.id;

            // Honeypot Spam Protection
            if (full_name_hp) {
                console.warn('[Security] Honeypot triggered for prayer submit.');
                return res.redirect(`${req.header('Referer') || '/connect'}?success=Your prayer request has been submitted for review.`);
            }

            const isAnonymous = is_anonymous === 'true' || is_anonymous === 'on';
            const prayerData = {
                user_id: userId || null,
                requester_name: isAnonymous ? 'Anonymous' : (req.user ? `${req.user.user_metadata?.first_name} ${req.user.user_metadata?.last_name}` : 'Visitor'),
                title,
                description,
                category: category || 'other',
                is_anonymous: isAnonymous,
                is_public: is_public === 'true' || is_public === 'on',
                status: 'pending',
                is_approved: false // Requires admin approval
            };

            await prayerRepo.submitPrayer(prayerData);
            
            if (userId) {
                await auditLogger.log(userId, 'prayer_submit', `Submitted a new prayer request: "${title}"`, { title, category });
            }

            const redirectUrl = req.header('Referer') || '/connect';
            res.redirect(`${redirectUrl}?success=Your prayer request has been submitted for review.`);
        } catch (error) {
            console.error('[PageController] Error submitting prayer:', error.message);
            res.redirect(`${req.header('Referer') || '/connect'}?error=Something went wrong.`);
        }
    },

    // Render Terms of Service
    renderTerms: (req, res) => {
        res.render('pages/legal/terms', {
            pageTitle: 'Terms of Service | Ambassadors Assembly',
            currentPath: req.path
        });
    },

    // Render Privacy Policy
    renderPrivacy: (req, res) => {
        res.render('pages/legal/privacy', {
            pageTitle: 'Privacy Policy | Ambassadors Assembly',
            currentPath: req.path
        });
    }
};