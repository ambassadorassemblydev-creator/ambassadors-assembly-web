import express from 'express';
import { pageController } from '../controllers/pageController.js';
import authRoutes from './auth.js'; // <-- ADD THIS
import { accountController } from '../controllers/accountController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import apiRoutes from './api.js'; // <-- ADD THIS
import { watchController } from '../controllers/watchController.js';

const router = express.Router();

// ==========================================
// PUBLIC VIEWS
// ==========================================
router.get('/', pageController.renderHome);
router.get('/sermons', pageController.renderSermons);
router.get('/account/login', (req, res) => res.render('pages/sign-in', { pageTitle: 'Login | Ambassadors Assembly', currentPath: req.path }));
router.get('/account/register', (req, res) => res.render('pages/sign-up', { pageTitle: 'Register | Ambassadors Assembly', currentPath: req.path }));

// Ministry Routes
router.get('/ministries', pageController.renderMinistries);
router.get('/ministries/:slug', pageController.renderMinistryDetail);
router.post('/ministries/:slug/join', authMiddleware.protect, pageController.handleJoinMinistry);
router.get('/sermons/:slug', pageController.renderSermonDetail);
router.get('/events', pageController.renderEventsArchive);
router.get('/events/:slug', pageController.renderEventDetail);
router.get('/give', pageController.renderGive);
router.get('/about', pageController.renderAbout);
router.get('/meet-the-pastor', pageController.renderMeetThePastor);
router.get('/connect', pageController.renderConnect);
router.get('/plan-a-visit', pageController.renderPlanVisit);
router.get('/faq', pageController.renderFaq);
router.get('/fund-the-buildings', pageController.renderFundTheBuildings);
router.get('/fund-the-buildings/:slug', pageController.renderBuildingDetail);
router.get('/staff', pageController.renderStaff);
router.get('/my-account', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.renderDashboard);
router.get('/my-account/profile', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.renderEditProfile);
router.post('/my-account/profile', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.handleUpdateProfile);
router.get('/departments', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.renderDepartments);
router.get('/directory', authMiddleware.protect, authMiddleware.requireProfileCompletion, pageController.renderDirectory);
router.get('/onboarding', authMiddleware.protect, accountController.renderOnboarding);
router.post('/onboarding', authMiddleware.protect, accountController.submitOnboarding);
router.get('/my-account/attendance/mark', authMiddleware.protect, accountController.handleMarkAttendance);
router.get('/watch', watchController.renderWatch);
router.post('/watch/comment', authMiddleware.protect, watchController.handlePostComment);

// Testimonies & Prayer Wall
router.get('/testimonies', pageController.renderTestimonies);
router.post('/testimonies/submit', pageController.handleTestimonySubmit);
router.get('/prayer-wall', pageController.renderPrayerWall);
router.post('/prayer-wall/intercede', authMiddleware.protect, pageController.handleIntercede);
router.post('/prayer-wall/submit', pageController.handlePrayerSubmit);

// Maintenance Mode (Easily activated via settings)
router.get('/maintenance', (req, res) => res.render('pages/maintenance'));

// AI Assistant
import { aiController } from '../controllers/aiController.js';
router.post('/api/ai/chat', aiController.handleChat);

// Legal Pages
router.get('/terms-of-service', pageController.renderTerms);
router.get('/privacy-policy', pageController.renderPrivacy);

// ==========================================
// MONITORING & HEALTH (For Uptime Bots)
// ==========================================
router.get('/api/health', pageController.handleHealthCheck);
router.get('/system-status', (req, res) => res.render('pages/system-status', { pageTitle: 'System Status | Ambassadors Assembly', currentPath: '/system-status' }));

// ==========================================
// AUTH VIEWS & API
// ==========================================
router.use('/', authRoutes); // <-- ADD THIS
router.post('/api/events/register', authMiddleware.protect, accountController.handleEventRegistration);
router.use('/api', apiRoutes); 

router.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("Sentry Debug Error: Ambassadors Assembly Monitoring Test");
});

export default router;