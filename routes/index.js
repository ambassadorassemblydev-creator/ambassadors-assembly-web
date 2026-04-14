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
router.get('/account/login', (req, res) => res.render('pages/auth/login', { pageTitle: 'Login | Ambassadors Assembly', currentPath: req.path }));
router.get('/account/register', (req, res) => res.render('pages/auth/register', { pageTitle: 'Register | Ambassadors Assembly', currentPath: req.path }));

// Ministry Routes
router.get('/ministries', pageController.renderMinistries);
router.get('/ministries/:slug', pageController.renderMinistryDetail);
router.post('/ministries/:slug/join', authMiddleware.protect, pageController.handleJoinMinistry);
router.get('/sermons/:slug', pageController.renderSermonDetail);
router.get('/events', pageController.renderEventsArchive);
router.get('/events/:slug', pageController.renderEventDetail);
router.get('/give', pageController.renderGive);
router.get('/about', pageController.renderAbout);
router.get('/connect', pageController.renderConnect);
router.get('/plan-a-visit', pageController.renderPlanVisit);
router.get('/my-account', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.renderDashboard);
router.get('/my-account/profile', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.renderEditProfile);
router.post('/my-account/profile', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.handleUpdateProfile);
router.get('/departments', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.renderDepartments);
router.get('/directory', authMiddleware.protect, authMiddleware.requireProfileCompletion, pageController.renderDirectory);
router.get('/onboarding', authMiddleware.protect, accountController.renderOnboarding);
router.post('/onboarding', authMiddleware.protect, accountController.submitOnboarding);
router.get('/watch', watchController.renderWatch);
// ==========================================
// AUTH VIEWS & API
// ==========================================
router.use('/', authRoutes); // <-- ADD THIS
router.post('/api/events/register', authMiddleware.protect, accountController.handleEventRegistration);
router.use('/api', apiRoutes); 

export default router;