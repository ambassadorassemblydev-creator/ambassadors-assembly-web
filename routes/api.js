import express from 'express';
import { accountController } from '../controllers/accountController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

import { paymentController } from '../controllers/paymentController.js';

const router = express.Router();

import { newsletterController, adminEmailController } from '../controllers/newsletterController.js';

/**
 * All routes in this file are prefixed with /api
 */

// Public API Endpoints
router.post('/payments/verify', paymentController.verifyPayment);
router.post('/payments/webhook', paymentController.handleWebhook);
router.post('/newsletter/subscribe', newsletterController.handleSubscribe);


import { adminController } from '../controllers/adminController.js';

// Restricted API Endpoints (Require Auth)
router.use(authMiddleware.protect);  

// Profile Endpoints
router.get('/profile/me', (req, res) => accountController.getMe(req, res));
router.post('/update-profile', accountController.handleUpdateProfile);
router.post('/profile/mark-share-shown', accountController.markSocialShareShown);

// Admin Endpoints
router.post('/admin/attendance/notify', authMiddleware.restrictTo('admin', 'super_admin', 'pastor'), adminController.notifyAbsentees);
router.get('/admin/attendance/sync', authMiddleware.restrictTo('admin', 'super_admin', 'pastor'), adminController.manualSyncMissedAttendance);
router.post('/admin/send-email', authMiddleware.restrictTo('admin', 'super_admin'), adminEmailController.sendCustomEmail);

// Future API endpoints (Live chat, Event registration, etc.)
// router.post('/events/register', eventController.register);

export default router;