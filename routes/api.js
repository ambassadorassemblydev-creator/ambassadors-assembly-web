import express from 'express';
import { accountController } from '../controllers/accountController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

import { paymentController } from '../controllers/paymentController.js';

const router = express.Router();

/**
 * All routes in this file are prefixed with /api
 */

// Public API Endpoints
router.post('/payments/verify', paymentController.verifyPayment);
router.post('/payments/webhook', paymentController.handleWebhook);


import { adminController } from '../controllers/adminController.js';

// Restricted API Endpoints (Require Auth)
router.use(authMiddleware.protect); 

// Profile Endpoints
router.post('/update-profile', accountController.handleUpdateProfile);

// Admin Endpoints
router.post('/admin/attendance/notify', authMiddleware.restrictTo('admin', 'super_admin', 'pastor'), adminController.notifyAbsentees);

// Future API endpoints (Live chat, Event registration, etc.)
// router.post('/events/register', eventController.register);

export default router;