import express from 'express';
import { pageController } from '../controllers/pageController.js';

const router = express.Router();

// ==========================================
// PUBLIC VIEWS
// ==========================================
router.get('/', pageController.renderHome);
router.get('/sermons', pageController.renderSermons);
// router.get('/events', pageController.renderEvents);
// router.get('/about', pageController.renderAbout);

// ==========================================
// FUTURE ROUTES (Placeholders)
// ==========================================
// router.use('/auth', authRoutes);
// router.use('/admin', adminRoutes);
// router.use('/api', apiRoutes);

export default router;