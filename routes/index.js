import express from 'express';
import { pageController } from '../controllers/pageController.js';
import authRoutes from './auth.js'; // <-- ADD THIS
import { accountController } from '../controllers/accountController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import apiRoutes from './api.js'; // <-- ADD THIS

const router = express.Router();

// ==========================================
// PUBLIC VIEWS
// ==========================================
router.get('/', pageController.renderHome);
router.get('/sermons', pageController.renderSermons);
router.get('/my-account', authMiddleware.protect, accountController.renderDashboard);
// ==========================================
// AUTH VIEWS & API
// ==========================================
router.use('/', authRoutes); // <-- ADD THIS
router.use('/api', apiRoutes); 

export default router;