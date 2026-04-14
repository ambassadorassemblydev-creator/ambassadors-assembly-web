import express from 'express';
import { accountController } from '../controllers/accountController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * All routes in this file are prefixed with /api
 * They all require authentication via cookies
 */
router.use(authMiddleware.protect); 

// Profile Endpoints
router.post('/update-profile', accountController.handleUpdateProfile);

// Future API endpoints (Live chat, Event registration, etc.)
// router.post('/events/register', eventController.register);

export default router;