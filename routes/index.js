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
router.get('/sermons/:slug', pageController.renderSermonDetail);
router.get('/events', pageController.renderEventsArchive);
router.get('/events/:slug', pageController.renderEventDetail);
router.get('/give', pageController.renderGive);
router.get('/ministries', pageController.renderMinistries);
router.get('/about', pageController.renderAbout);
router.get('/connect', pageController.renderConnect);
router.get('/plan-a-visit', pageController.renderPlanVisit);
router.get('/my-account', authMiddleware.protect, authMiddleware.requireProfileCompletion, accountController.renderDashboard);
router.get('/directory', authMiddleware.protect, authMiddleware.requireProfileCompletion, pageController.renderDirectory);
router.get('/onboarding', authMiddleware.protect, accountController.renderOnboarding);
router.post('/onboarding', authMiddleware.protect, accountController.submitOnboarding);
router.get('/watch', watchController.renderWatch);
// ==========================================
// AUTH VIEWS & API
// ==========================================
router.use('/', authRoutes); // <-- ADD THIS
router.use('/api', apiRoutes); 

export default router;